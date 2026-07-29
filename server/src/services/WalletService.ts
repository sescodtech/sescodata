import { User } from '../models/User';

/**
 * All balance mutations use atomic MongoDB $inc, guarded in the same query
 * where relevant (debit requires walletBalance >= amount in the filter).
 * This removes the read-check-write race that previously let two concurrent
 * requests both read the same starting balance before either had committed.
 * Ledger entries (Transaction rows) are created by the caller with full
 * purchase context — this class only ever mutates the balance itself.
 */
export class WalletService {
  /**
   * Atomically acquires a short-lived per-user lock so a second concurrent
   * purchase request (duplicate tap, browser retry, network retry, or a
   * direct duplicate API call) is rejected outright instead of being
   * processed twice. Acquisition and the expiry check happen in one
   * findOneAndUpdate, so it's race-free even under real concurrency.
   */
  static async acquirePurchaseLock(userId: string, ttlMs: number = 20_000): Promise<boolean> {
    const now = new Date();
    const updated = await User.findOneAndUpdate(
      { _id: userId, $or: [{ purchaseLockUntil: null }, { purchaseLockUntil: { $lt: now } }] },
      { $set: { purchaseLockUntil: new Date(now.getTime() + ttlMs) } },
      { new: true }
    );
    return !!updated;
  }

  static async releasePurchaseLock(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { purchaseLockUntil: null } });
  }

  static async credit(userId: string, amount: number): Promise<number> {
    const updated = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { walletBalance: amount } },
      { new: true }
    );
    if (!updated) throw new Error('User not found');
    return updated.walletBalance;
  }

  /** Atomically debits only if the balance can cover it — insufficient-balance and the deduction are checked in a single database operation, not two separate steps. */
  static async debit(userId: string, amount: number): Promise<number> {
    const updated = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true }
    );
    if (!updated) {
      const exists = await User.exists({ _id: userId });
      throw new Error(exists ? 'Insufficient wallet balance' : 'User not found');
    }
    return updated.walletBalance;
  }
}
