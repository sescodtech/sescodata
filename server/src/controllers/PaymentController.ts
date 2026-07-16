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
async function creditIfPending(reference: string) {
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
    await txn.save();
    return { credited: false, reason: 'verification_failed' };
  }

  const user = await User.findById(txn.userId);
  if (!user) return { credited: false, reason: 'user_not_found' };

  user.walletBalance += txn.amount;
  await user.save();

  txn.status = 'success';
  txn.deliveryStatus = 'delivered';
  await txn.save();

  EmailService.sendWalletFunded(user, txn.amount, user.walletBalance, reference).catch(() => {});

  return { credited: true, reference };
}

export class PaymentController {
  static async callback(req: Request, res: Response) {
    try {
      const reference = (req.query.reference as string) || (req.query.trxref as string);
      const frontendUrl = process.env.FRONTEND_URL || '/';
      if (!reference) return res.redirect(`${frontendUrl}?payment=error`);

      const result = await creditIfPending(reference);
      if (result.credited) return res.redirect(`${frontendUrl}?payment=success&trxref=${reference}`);
      if (result.reason === 'still_pending') return res.redirect(`${frontendUrl}?payment=pending&trxref=${reference}`);
      return res.redirect(`${frontendUrl}?payment=failed&trxref=${reference}`);
    } catch (e: any) {
      console.error('Payment callback error:', e);
      res.redirect(`${process.env.FRONTEND_URL || '/'}?payment=error`);
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
      if (event.event === 'charge.success') {
        await creditIfPending(event.data.reference);
      }

      res.sendStatus(200);
    } catch (e: any) {
      console.error('Webhook error:', e);
      res.status(500).send('Internal Server Error');
    }
  }
}
