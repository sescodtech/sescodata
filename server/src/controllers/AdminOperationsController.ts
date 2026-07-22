import { Response } from 'express';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { WalletService } from '../services/WalletService';
import { EmailService } from '../services/EmailService';
import { AuditLogService } from '../services/AuditLogService';
import { RetryService } from '../services/RetryService';

async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

function buildTxnFilter(query: Record<string, string>) {
  const { search, category, provider, userId, dateFrom, dateTo } = query;
  const filter: any = {};
  if (category) filter['product.category'] = category;
  if (userId) filter.userId = userId;
  if (provider) filter['provider.name'] = provider;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  if (search) {
    filter.$or = [
      { paymentReference: { $regex: search, $options: 'i' } },
      { 'product.name': { $regex: search, $options: 'i' } },
      { 'product.recipient': { $regex: search, $options: 'i' } },
      { failReason: { $regex: search, $options: 'i' } },
    ];
  }
  return filter;
}

export class AdminOperationsController {
  // ============================================================
  // QUEUES
  // ============================================================

  static async getFailedQueue(req: any, res: Response) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 25, 100);
      const filter = { ...buildTxnFilter(req.query), deliveryStatus: 'failed' };

      const [txns, total] = await Promise.all([
        Transaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).populate('userId', 'name email'),
        Transaction.countDocuments(filter),
      ]);

      // Eligibility is computed per-row so the UI can show/disable the Retry
      // action without a second round-trip.
      const withEligibility = txns.map((t) => ({ ...t.toObject(), retryEligibility: RetryService.checkEligibility(t) }));

      res.json({ success: true, transactions: withEligibility, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async getPendingQueue(req: any, res: Response) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 25, 100);
      const filter = { ...buildTxnFilter(req.query), deliveryStatus: 'pending' };

      const [txns, total] = await Promise.all([
        Transaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).populate('userId', 'name email'),
        Transaction.countDocuments(filter),
      ]);

      res.json({ success: true, transactions: txns, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async getManualReviewQueue(req: any, res: Response) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 25, 100);
      const { status } = req.query as Record<string, string>;
      const filter: any = { ...buildTxnFilter(req.query) };
      filter['manualReview.status'] = status || { $in: ['pending', 'approved', 'rejected', 'completed'] };

      const [txns, total] = await Promise.all([
        Transaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).populate('userId', 'name email'),
        Transaction.countDocuments(filter),
      ]);

      res.json({ success: true, transactions: txns, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Flags a failed/pending transaction for manual review — the entry point into the Manual Processing queue. */
  static async flagForManualReview(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const txn: any = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      const before = txn.manualReview?.status || 'none';
      txn.manualReview = txn.manualReview || ({} as any);
      txn.manualReview.status = 'pending';
      txn.manualReview.notes = txn.manualReview.notes || [];

      const actor = await getActor(req);
      txn.manualReview.notes.push({ adminName: actor.name, note: reason.trim() });
      await txn.save({ validateModifiedOnly: true });

      AuditLogService.log({
        admin: actor, action: 'transaction.flag_manual_review', targetType: 'transaction', targetId: id,
        targetLabel: txn.paymentReference, before: { manualReviewStatus: before }, after: { manualReviewStatus: 'pending' },
        reason, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // RETRY
  // ============================================================

  static async retryTransaction(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required for retry' });

      const actor = await getActor(req);
      const before = await Transaction.findById(id).select('deliveryStatus paymentReference');
      if (!before) return res.status(404).json({ success: false, error: 'Transaction not found' });

      const result = await RetryService.retryTransaction({ transactionId: id, admin: actor, reason: reason.trim() });

      AuditLogService.log({
        admin: actor, action: 'transaction.retry', targetType: 'transaction', targetId: id, targetLabel: before.paymentReference,
        before: { deliveryStatus: before.deliveryStatus },
        after: { deliveryStatus: result.transaction.deliveryStatus, success: result.success },
        reason: reason.trim(), ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, retrySucceeded: result.success, transaction: result.transaction, error: result.error });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * Bulk retry — sequential, not parallel. Retrying the same customer's
   * wallet concurrently across multiple transactions would be a real race
   * condition (two retries both reading the same starting balance); running
   * them one at a time keeps every individual retry's debit/credit pair
   * atomic-in-effect without needing DB transactions this codebase doesn't
   * otherwise use.
   */
  static async bulkRetry(req: any, res: Response) {
    try {
      const { transactionIds, reason } = req.body as { transactionIds: string[]; reason: string };
      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ success: false, error: 'No transactions selected' });
      }
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });
      if (transactionIds.length > 50) return res.status(400).json({ success: false, error: 'Bulk retry is limited to 50 transactions at a time' });

      const actor = await getActor(req);
      const results: { id: string; success: boolean; error?: string }[] = [];

      for (const id of transactionIds) {
        try {
          const before = await Transaction.findById(id).select('deliveryStatus paymentReference');
          const result = await RetryService.retryTransaction({ transactionId: id, admin: actor, reason: reason.trim() });
          AuditLogService.log({
            admin: actor, action: 'transaction.retry', targetType: 'transaction', targetId: id, targetLabel: before?.paymentReference,
            before: { deliveryStatus: before?.deliveryStatus }, after: { deliveryStatus: result.transaction.deliveryStatus, success: result.success },
            reason: `${reason.trim()} (bulk)`, ip: AuditLogService.getClientIp(req),
          });
          results.push({ id, success: result.success, error: result.error });
        } catch (e: any) {
          results.push({ id, success: false, error: e.message });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      res.json({ success: true, message: `${succeeded} of ${results.length} retried successfully`, results });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // MANUAL PROCESSING ACTIONS
  // ============================================================

  static async approveTransaction(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason, providerReference } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const txn: any = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      const before = txn.manualReview?.status || 'none';
      txn.manualReview = txn.manualReview || ({} as any);
      txn.manualReview.status = 'approved';
      if (providerReference) txn.manualReview.providerReference = providerReference;

      const actor = await getActor(req);
      txn.manualReview.notes = txn.manualReview.notes || [];
      txn.manualReview.notes.push({ adminName: actor.name, note: reason.trim() });
      await txn.save({ validateModifiedOnly: true });

      AuditLogService.log({
        admin: actor, action: 'transaction.manual_approve', targetType: 'transaction', targetId: id, targetLabel: txn.paymentReference,
        before: { manualReviewStatus: before }, after: { manualReviewStatus: 'approved', providerReference }, reason: reason.trim(),
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async rejectTransaction(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const txn: any = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      const before = txn.manualReview?.status || 'none';
      txn.manualReview = txn.manualReview || ({} as any);
      txn.manualReview.status = 'rejected';

      const actor = await getActor(req);
      txn.manualReview.notes = txn.manualReview.notes || [];
      txn.manualReview.notes.push({ adminName: actor.name, note: reason.trim() });
      await txn.save({ validateModifiedOnly: true });

      AuditLogService.log({
        admin: actor, action: 'transaction.manual_reject', targetType: 'transaction', targetId: id, targetLabel: txn.paymentReference,
        before: { manualReviewStatus: before }, after: { manualReviewStatus: 'rejected' }, reason: reason.trim(),
        ip: AuditLogService.getClientIp(req),
      });

      const user = await User.findById(txn.userId);
      if (user) EmailService.sendManualReviewCompleted(user, txn.product?.name || 'your order', 'rejected', reason.trim()).catch(() => {});

      res.json({ success: true, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * Mark as Completed — for cases where the provider fulfilled the order
   * outside our system (confirmed via manualProviderReference) and the
   * transaction just needs to be reconciled as delivered. Does not move
   * money — the customer was already debited when the order was placed.
   */
  static async markCompleted(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason, providerReference } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });
      if (!providerReference || !providerReference.trim()) {
        return res.status(400).json({ success: false, error: 'A manual provider reference is required to mark a transaction as completed' });
      }

      const txn: any = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      const before = { deliveryStatus: txn.deliveryStatus, manualReviewStatus: txn.manualReview?.status || 'none' };
      txn.deliveryStatus = 'delivered';
      txn.status = 'success';
      txn.manualReview = txn.manualReview || ({} as any);
      txn.manualReview.status = 'completed';
      txn.manualReview.providerReference = providerReference.trim();

      const actor = await getActor(req);
      txn.manualReview.notes = txn.manualReview.notes || [];
      txn.manualReview.notes.push({ adminName: actor.name, note: reason.trim() });
      await txn.save({ validateModifiedOnly: true });

      AuditLogService.log({
        admin: actor, action: 'transaction.manual_complete', targetType: 'transaction', targetId: id, targetLabel: txn.paymentReference,
        before, after: { deliveryStatus: 'delivered', manualReviewStatus: 'completed', providerReference: providerReference.trim() },
        reason: reason.trim(), ip: AuditLogService.getClientIp(req),
      });

      const user = await User.findById(txn.userId);
      if (user) EmailService.sendManualReviewCompleted(user, txn.product?.name || 'your order', 'completed', reason.trim()).catch(() => {});

      res.json({ success: true, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * Refund Wallet — for cases where money needs crediting back outside the
   * normal auto-refund-on-failure path (e.g. a deposit that never auto-
   * reconciled). Guarded by `refundedManually` so the same transaction can't
   * be refunded twice by mistake.
   */
  static async refundWallet(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason, amount } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const txn: any = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
      if (txn.refundedManually) return res.status(400).json({ success: false, error: 'This transaction has already been manually refunded' });

      const refundAmount = amount ? Number(amount) : Math.abs(txn.amount);
      if (!refundAmount || refundAmount <= 0) return res.status(400).json({ success: false, error: 'Invalid refund amount' });

      const newBalance = await WalletService.credit(txn.userId.toString(), refundAmount);
      txn.refundedManually = true;

      const actor = await getActor(req);
      txn.manualReview = txn.manualReview || ({} as any);
      txn.manualReview.notes = txn.manualReview.notes || [];
      txn.manualReview.notes.push({ adminName: actor.name, note: `Manual refund of ${refundAmount}: ${reason.trim()}` });
      await txn.save({ validateModifiedOnly: true });

      AuditLogService.log({
        admin: actor, action: 'transaction.manual_refund', targetType: 'transaction', targetId: id, targetLabel: txn.paymentReference,
        before: { refundedManually: false }, after: { refundedManually: true, amount: refundAmount, newBalance }, reason: reason.trim(),
        ip: AuditLogService.getClientIp(req),
      });

      const user = await User.findById(txn.userId);
      if (user) EmailService.sendManualRefund(user, refundAmount, reason.trim()).catch(() => {});

      res.json({ success: true, message: 'Wallet refunded successfully', newBalance, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * Reverse Wallet — the opposite of refund: debits a customer's wallet to
   * undo an erroneous credit. Guarded by `reversedManually` for the same
   * double-fire reason as refund.
   */
  static async reverseWallet(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason, amount } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const txn: any = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
      if (txn.reversedManually) return res.status(400).json({ success: false, error: 'This transaction has already been manually reversed' });

      const reverseAmount = amount ? Number(amount) : Math.abs(txn.amount);
      if (!reverseAmount || reverseAmount <= 0) return res.status(400).json({ success: false, error: 'Invalid reversal amount' });

      const newBalance = await WalletService.debit(txn.userId.toString(), reverseAmount);
      txn.reversedManually = true;

      const actor = await getActor(req);
      txn.manualReview = txn.manualReview || ({} as any);
      txn.manualReview.notes = txn.manualReview.notes || [];
      txn.manualReview.notes.push({ adminName: actor.name, note: `Manual reversal of ${reverseAmount}: ${reason.trim()}` });
      await txn.save({ validateModifiedOnly: true });

      AuditLogService.log({
        admin: actor, action: 'transaction.manual_reverse', targetType: 'transaction', targetId: id, targetLabel: txn.paymentReference,
        before: { reversedManually: false }, after: { reversedManually: true, amount: reverseAmount, newBalance }, reason: reason.trim(),
        ip: AuditLogService.getClientIp(req),
      });

      const user = await User.findById(txn.userId);
      if (user) EmailService.sendWalletDebited(user, reverseAmount, newBalance, reason.trim()).catch((err) => console.error('[reverseWallet] email failed:', err));

      res.json({ success: true, message: 'Wallet reversed successfully', newBalance, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async addProcessingNote(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { note, evidenceUrl } = req.body;
      if (!note || !note.trim()) return res.status(400).json({ success: false, error: 'Note text is required' });

      const txn: any = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      const actor = await getActor(req);
      txn.manualReview = txn.manualReview || ({} as any);
      txn.manualReview.notes = txn.manualReview.notes || [];
      txn.manualReview.notes.push({ adminName: actor.name, note: note.trim() });
      if (evidenceUrl && evidenceUrl.trim()) txn.manualReview.evidenceUrl = evidenceUrl.trim();
      await txn.save({ validateModifiedOnly: true });

      AuditLogService.log({
        admin: actor, action: 'transaction.note_added', targetType: 'transaction', targetId: id, targetLabel: txn.paymentReference,
        after: { note: note.trim(), evidenceUrl }, ip: AuditLogService.getClientIp(req),
      });

      res.status(201).json({ success: true, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /** Full timeline for one transaction: retry history + manual review notes, merged and sorted. */
  static async getTransactionTimeline(req: any, res: Response) {
    try {
      const { id } = req.params;
      const txn = await Transaction.findById(id).populate('userId', 'name email');
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      const events: { type: string; label: string; detail?: string; admin?: string; timestamp: Date }[] = [];

      events.push({ type: 'created', label: 'Transaction created', timestamp: (txn as any).createdAt });

      (txn.retryHistory || []).forEach((r: any) => {
        events.push({
          type: r.newDeliveryStatus === 'delivered' ? 'retry_success' : 'retry_failed',
          label: r.newDeliveryStatus === 'delivered' ? 'Retry succeeded' : 'Retry failed',
          detail: r.error || r.reason, admin: r.adminName, timestamp: r.attemptedAt,
        });
      });

      (txn.manualReview?.notes || []).forEach((n: any) => {
        events.push({ type: 'note', label: 'Processing note', detail: n.note, admin: n.adminName, timestamp: n.createdAt });
      });

      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      res.json({ success: true, transaction: txn, timeline: events });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // DASHBOARD WIDGETS
  // ============================================================

  static async getOperationsStats(_req: any, res: Response) {
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      const [
        failedCount, pendingReviewCount, manualQueueCount,
        totalRetried, successfulRetries, recentManualActions, todayRefunds,
      ] = await Promise.all([
        Transaction.countDocuments({ deliveryStatus: 'failed' }),
        Transaction.countDocuments({ 'manualReview.status': 'pending' }),
        Transaction.countDocuments({ 'manualReview.status': { $in: ['pending', 'approved'] } }),
        Transaction.countDocuments({ retryCount: { $gt: 0 } }),
        Transaction.countDocuments({ retryCount: { $gt: 0 }, deliveryStatus: 'delivered' }),
        AuditLog.find({
          action: { $in: ['transaction.manual_approve', 'transaction.manual_reject', 'transaction.manual_complete', 'transaction.manual_refund', 'transaction.manual_reverse'] },
        }).sort({ createdAt: -1 }).limit(10),
        // Today's refunds: auto-refunds from newly failed purchases (retryCount 0)
        // plus manual refunds recorded via audit log today.
        Transaction.aggregate([
          { $match: { type: 'purchase', deliveryStatus: 'failed', createdAt: { $gte: todayStart }, retryCount: 0 } },
          { $group: { _id: null, total: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
        ]),
      ]);

      const todayManualRefunds = await AuditLog.aggregate([
        { $match: { action: 'transaction.manual_refund', createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$after.amount' }, count: { $sum: 1 } } },
      ]);

      res.json({
        success: true,
        stats: {
          failedTransactions: failedCount,
          pendingReviews: pendingReviewCount,
          manualProcessingQueue: manualQueueCount,
          retrySuccessRate: totalRetried > 0 ? Math.round((successfulRetries / totalRetried) * 100) : null,
          totalRetried,
          successfulRetries,
          todayRefundsAmount: (todayRefunds[0]?.total || 0) + (todayManualRefunds[0]?.total || 0),
          todayRefundsCount: (todayRefunds[0]?.count || 0) + (todayManualRefunds[0]?.count || 0),
          recentManualActions,
        },
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
