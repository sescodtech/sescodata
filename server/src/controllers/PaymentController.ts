import { Request, Response } from 'express';
import { paymentService } from '../services/PaymentService';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { EmailService } from '../services/EmailService';
import crypto from 'crypto';

/**
 * Handles Paystack verification for wallet deposits only.
 * The old per-item "pay directly for a product" flow (initiate/callback writing
 * ref/productId/productName fields) was dead code that didn't match the real
 * Transaction schema and duplicated the wallet+purchase flow. Removed — all
 * purchases now go through the wallet (see PurchaseController), and this
 * controller's only job is: verify a Paystack deposit, credit the wallet once.
 */
export async function creditIfPending(reference: string) {
  const txn = await Transaction.findOne({ paymentReference: reference, type: 'deposit', status: 'pending' });
  if (!txn) return { credited: false, reason: 'not_found_or_already_processed' };

  const verification = await paymentService.verifyPayment('paystack', reference);

  // FIXED: Paystack can report 'pending' for bank transfer/USSD deposits that
  // haven't cleared yet — the previous version treated any non-'success'
  // result as an immediate failure, which would incorrectly fail (and never
  // retry) a payment that was still legitimately processing.
  if (verification.status === 'pending' || verification.status === 'processing') {
    const user = await User.findById(txn.userId);
    if (user) EmailService.sendPurchasePending(user, { label: 'Wallet funding', amount: txn.amount, ref: reference }).catch(() => {});
    return { credited: false, reason: 'still_pending' };
  }

  if (!verification.success) {
    txn.status = 'failed';
    await txn.save({ validateModifiedOnly: true });
    return { credited: false, reason: 'verification_failed' };
  }

  const user = await User.findById(txn.userId);
  if (!user) return { credited: false, reason: 'user_not_found' };

  // Bank transfer (and USSD) deposits aren't amount-locked the way a card
  // charge is — Paystack hands the customer a one-time account number for
  // the reference, but nothing stops them sending more or less than what
  // was originally requested. verification.amount is what Paystack actually
  // confirms was received, which can differ from txn.amount (what the
  // customer originally requested). We credit what was really paid — the
  // customer expects to see the money they sent, not the amount they typed
  // in first — and flag any mismatch for admin review so overpayments and
  // underpayments are traceable instead of silently absorbed or lost.
  const expectedAmount = txn.amount;
  const receivedAmount = verification.amount;
  const amountMismatch = receivedAmount !== expectedAmount;

  user.walletBalance += receivedAmount;
  await user.save({ validateModifiedOnly: true });

  txn.amount = receivedAmount;
  txn.status = 'success';
  txn.deliveryStatus = 'delivered';

  if (amountMismatch) {
    const review: any = txn.manualReview || {};
    review.status = 'pending';
    review.notes = review.notes || [];
    review.notes.push({
      adminName: 'System',
      note: `Deposit amount mismatch: requested \u20a6${expectedAmount}, Paystack confirmed \u20a6${receivedAmount} received. Wallet credited with the amount actually received.`,
    });
    txn.manualReview = review;
  }

  await txn.save({ validateModifiedOnly: true });

  EmailService.sendWalletFunded(user, receivedAmount, user.walletBalance, reference).catch(() => {});
  if (amountMismatch) {
    EmailService.sendDepositAmountMismatch({
      userName: user.name,
      userEmail: user.email,
      expectedAmount,
      receivedAmount,
      reference,
    }).catch(() => {});
  }

  return { credited: true, reference, amount: receivedAmount, ...(amountMismatch ? { amountMismatch: true, expectedAmount, receivedAmount } : {}) };
}

export class PaymentController {
  static async callback(req: Request, res: Response) {
    try {
      const reference = (req.query.reference as string) || (req.query.trxref as string);
      // Redirect to the dedicated /payment/callback route (which the
      // frontend already has a purpose-built success/failure screen for),
      // not the bare frontend root — landing on the public homepage after
      // a real deposit looked like the user had been logged out, since the
      // public nav always shows "Login" regardless of actual auth state.
      const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
      const callbackPath = `${frontendUrl}/payment/callback`;
      if (!reference) return res.redirect(`${callbackPath}?payment=error`);

      const result = await creditIfPending(reference);
      if (result.credited) {
        // Pass the amount actually credited (not just the reference) so the
        // frontend success screen shows what really landed in the wallet —
        // important for bank-transfer deposits where a customer may have
        // sent more or less than they originally requested.
        return res.redirect(`${callbackPath}?payment=success&trxref=${reference}&amount=${result.amount}`);
      }
      if (result.reason === 'still_pending') return res.redirect(`${callbackPath}?payment=pending&trxref=${reference}`);
      return res.redirect(`${callbackPath}?payment=failed&trxref=${reference}`);
    } catch (e: any) {
      console.error('Payment callback error:', e);
      const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
      res.redirect(`${frontendUrl}/payment/callback?payment=error`);
    }
  }

  static async webhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-paystack-signature'];
      const secret = process.env.PAYSTACK_SECRET_KEY || '';

      const computedSignature = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== computedSignature) {
        return res.status(401).send('Invalid signature');
      }

      const event = req.body;
      // Any event that carries a reference we recognize is worth reconciling —
      // creditIfPending() re-verifies directly with Paystack and is a no-op if
      // the transaction is already resolved or doesn't exist, so calling it for
      // charge.failed (declined card, abandoned checkout, etc.) as well as
      // charge.success is safe and is what actually flips a dead-end deposit to
      // 'failed' instead of leaving it 'pending' forever.
      if (event.data?.reference) {
        await creditIfPending(event.data.reference);
      }

      res.sendStatus(200);
    } catch (e: any) {
      console.error('Webhook error:', e);
      res.status(500).send('Internal Server Error');
    }
  }
}
