import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { WalletService } from './WalletService';
import { EmailService } from './EmailService';
import { attemptProviderDelivery } from '../controllers/PurchaseController';

const MAX_RETRY_ATTEMPTS = 5;

export interface RetryEligibility {
  eligible: boolean;
  reason?: string;
}

export class RetryService {
  /**
   * Determines whether a transaction can safely be retried, without
   * mutating anything. Used both to gate the actual retry action and to
   * let the admin UI show why a given transaction can't be retried.
   */
  static checkEligibility(txn: any): RetryEligibility {
    if (txn.type !== 'purchase') {
      return { eligible: false, reason: 'Only purchase transactions can be retried.' };
    }
    if (txn.deliveryStatus === 'delivered') {
      return { eligible: false, reason: 'This transaction was already delivered — retrying would risk duplicate fulfilment.' };
    }
    if (txn.deliveryStatus === 'pending') {
      return { eligible: false, reason: 'This transaction is still pending with the provider. Wait for it to resolve, or use Manual Processing.' };
    }
    if (!txn.providerMethod || !txn.providerParams) {
      return { eligible: false, reason: 'This transaction predates retry support and has no saved provider request to replay. Use Manual Processing instead.' };
    }
    if (txn.isRetryLocked) {
      return { eligible: false, reason: 'A retry is already in progress for this transaction.' };
    }
    if ((txn.retryCount || 0) >= MAX_RETRY_ATTEMPTS) {
      return { eligible: false, reason: `This transaction has reached the maximum of ${MAX_RETRY_ATTEMPTS} retry attempts. Use Manual Processing instead.` };
    }
    return { eligible: true };
  }

  /**
   * Retries a single failed transaction:
   *   1. Acquire a lock (prevents a second concurrent retry on the same row).
   *   2. Re-debit the wallet for the original amount (the initial failure
   *      already refunded it — this reverses that refund for the new attempt).
   *   3. Replay the exact original provider call via attemptProviderDelivery
   *      (the same function PurchaseController's live purchases use).
   *   4. On success: mark delivered, no new ledger row (updates the same one).
   *   5. On failure: re-credit the wallet (undo the re-debit), record the attempt.
   * Always releases the lock, even on unexpected errors.
   */
  static async retryTransaction(opts: {
    transactionId: string;
    admin: { id: string; name: string };
    reason: string;
  }) {
    const { transactionId, admin, reason } = opts;

    const current = await Transaction.findById(transactionId);
    if (!current) throw new Error('Transaction not found');

    const eligibility = this.checkEligibility(current);
    if (!eligibility.eligible) throw new Error(eligibility.reason);

    // Atomically acquire the lock: only succeeds if the transaction is still
    // failed and not already locked at the moment of the update. This closes
    // the race a plain find-then-save would leave open, where two concurrent
    // retry requests could both pass the eligibility check above before
    // either had a chance to set the lock — the actual mechanism that
    // prevents duplicate fulfilment under concurrent admin actions.
    const txn: any = await Transaction.findOneAndUpdate(
      { _id: transactionId, isRetryLocked: false, deliveryStatus: 'failed' },
      { $set: { isRetryLocked: true } },
      { new: true },
    );
    if (!txn) throw new Error('A retry is already in progress for this transaction.');

    const previousDeliveryStatus = txn.deliveryStatus;
    const userPrice = Math.abs(txn.amount);
    let debited = false;

    try {
      // Re-debit — this is what actually prevents "duplicate fulfilment for
      // free": the customer only gets a second delivery attempt if their
      // wallet can once again cover it. Throws (and is caught below) if the
      // balance is insufficient, leaving everything else untouched.
      await WalletService.debit(txn.userId.toString(), userPrice);
      debited = true;

      const result = await attemptProviderDelivery(txn.providerMethod, txn.providerParams);

      if (result.success) {
        txn.deliveryStatus = 'delivered';
        txn.status = 'success';
        txn.provider = { name: result.usedProvider, reference: result.reference } as any;
        txn.failReason = undefined;
        txn.retryCount = (txn.retryCount || 0) + 1;
        txn.retryHistory.push({
          adminId: admin.id, adminName: admin.name,
          previousDeliveryStatus, newDeliveryStatus: 'delivered',
          providerUsed: result.usedProvider, reason,
        });
        txn.isRetryLocked = false;
        await txn.save();

        User.findById(txn.userId).then((user) => {
          if (user) EmailService.sendRetrySucceeded(user, { product: txn.product?.name || 'your order', amount: userPrice, ref: txn.paymentReference }).catch(() => {});
        }).catch(() => {});

        return { success: true, transaction: txn };
      }

      // Retry attempt failed — undo the re-debit, log the attempt, leave status as failed.
      await WalletService.credit(txn.userId.toString(), userPrice);
      debited = false;
      txn.retryCount = (txn.retryCount || 0) + 1;
      txn.failReason = result.error;
      txn.retryHistory.push({
        adminId: admin.id, adminName: admin.name,
        previousDeliveryStatus, newDeliveryStatus: 'failed',
        reason, error: result.error,
      });
      txn.isRetryLocked = false;
      await txn.save();

      const permanentlyFailed = txn.retryCount >= MAX_RETRY_ATTEMPTS;
      if (permanentlyFailed) {
        User.findById(txn.userId).then((user) => {
          if (user) EmailService.sendRetryFailedPermanently(user, { product: txn.product?.name || 'your order', amount: userPrice, ref: txn.paymentReference }).catch(() => {});
        }).catch(() => {});
      }

      return { success: false, transaction: txn, error: result.error };
    } catch (e: any) {
      // Unexpected error — e.g. insufficient balance on re-debit (nothing to
      // undo), or an unforeseen throw from the delivery attempt itself
      // (wallet was already debited and must be refunded, or the customer
      // is charged for nothing). Always release the lock either way.
      if (debited) {
        await WalletService.credit(txn.userId.toString(), userPrice).catch(() => {
          // If even the safety-net credit fails, leave the transaction
          // locked rather than silently losing track of the money — this
          // surfaces as "stuck" in the queue, which is safer than silently
          // clearing the lock on an unresolved debit.
          throw new Error(`Retry failed and the safety-net refund also failed. Wallet requires manual review. Original error: ${e.message}`);
        });
      }
      txn.isRetryLocked = false;
      await txn.save();
      throw e;
    }
  }

  static async notifyRetryInitiated(txn: any) {
    const user = await User.findById(txn.userId);
    if (user) EmailService.sendRetryInitiated(user, txn.product?.name || 'your order', txn.paymentReference).catch(() => {});
  }
}
