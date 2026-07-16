import { User } from '../models/User';

/**
 * Pure balance mutation only. FIXED: this used to also call Transaction.create()
 * internally, while PurchaseController *also* created its own Transaction record
 * for the same purchase — every purchase was logged twice (one negative "debit"
 * row, one positive "delivery" row), corrupting the Transactions page, wallet
 * ledger, and admin revenue stats. Ledger entries are now created exactly once,
 * by whichever controller has the full context (PurchaseController for
 * purchases, PaymentController for deposits).
 */
export class WalletService {
  static async credit(userId: string, amount: number) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    user.walletBalance += amount;
    await user.save();
    return user.walletBalance;
  }

  static async debit(userId: string, amount: number) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.walletBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    user.walletBalance -= amount;
    await user.save();
    return user.walletBalance;
  }
}
