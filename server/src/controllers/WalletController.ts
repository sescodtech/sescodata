import { Response } from 'express';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { paymentService } from '../services/PaymentService';

export class WalletController {
  /** GET /api/my/wallet */
  static async getMyWallet(req: any, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      const ledger = await Transaction.find({ userId: req.user.id, status: 'success' }).sort({ createdAt: -1 }).limit(30);
      res.json({
        success: true,
        balance: user.walletBalance,
        ledger: ledger.map(t => ({
          type: t.amount > 0 ? 'credit' : 'debit',
          amount: Math.abs(t.amount),
          description: t.product?.name || t.type,
          date: t.createdAt
        }))
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** GET /api/my/transactions */
  static async getMyTransactions(req: any, res: Response) {
    try {
      const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
      res.json({ success: true, transactions });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/wallet/deposit/initiate
   * FIXED: this previously returned a hardcoded fake paystack.com URL and never
   * actually created a payment. It now creates a real pending ledger entry and
   * a real Paystack initialization, so /api/payment/callback has something to
   * verify and credit against.
   */
  static async depositInitiate(req: any, res: Response) {
    try {
      const { amount } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (!amount || amount < 100) {
        return res.status(400).json({ success: false, error: 'Minimum deposit amount is ₦100' });
      }

      const reference = `DEP-${Date.now()}-${Math.random().toString(36).toUpperCase().slice(2, 8)}`;

      await Transaction.create({
        userId: user._id,
        amount,
        type: 'deposit',
        status: 'pending',
        paymentReference: reference,
        product: { name: 'Wallet Funding', category: 'deposit' }
      });

      const result = await paymentService.initializePayment('paystack', {
        email: user.email,
        amount,
        reference,
        callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payment/callback`
      });

      res.json({ success: true, paymentUrl: result.url, reference: result.reference });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}
