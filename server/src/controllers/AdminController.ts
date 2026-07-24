import { Request, Response } from 'express';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { SupportTicket } from '../models/SupportTicket';
import { AuditLog } from '../models/AuditLog';
import { AdminNote } from '../models/AdminNote';
import { LoginEvent } from '../models/LoginEvent';
import { ProductService } from '../services/ProductService';
import { providerOrchestrator } from '../providers/ProviderOrchestrator';
import { WalletService } from '../services/WalletService';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';
import { AuditLogService } from '../services/AuditLogService';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sum |amount| for delivered purchases in a date range (purchase amounts are stored negative). */
async function revenueSince(date: Date | null) {
  const match: any = { type: 'purchase', status: 'success', deliveryStatus: 'delivered' };
  if (date) match.createdAt = { $gte: date };
  const agg = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
  ]);
  return agg[0]?.total || 0;
}

/**
 * Builds the same "who is this customer" snapshot used on the User Detail
 * drawer (wallet, transaction counts, login history, notes, recent orders)
 * so Module 8's ticket detail view can show identical Customer History
 * without re-deriving it — single source of truth for "know the customer
 * before you reply".
 */
export async function buildCustomerSnapshot(userId: any) {
  const user = await User.findById(userId).select('-password');
  if (!user) return null;

  const [txnStats, recentTxns, loginHistory, notes, recentAudit, deliveredCount, failedCount, pendingCount] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: user._id, type: 'purchase', status: 'success', deliveryStatus: 'delivered' } },
      { $group: { _id: null, totalSpent: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
    ]),
    Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
    LoginEvent.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
    AdminNote.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20),
    AuditLog.find({ targetId: user._id }).sort({ createdAt: -1 }).limit(20),
    Transaction.countDocuments({ userId: user._id, deliveryStatus: 'delivered' }),
    Transaction.countDocuments({ userId: user._id, deliveryStatus: 'failed' }),
    Transaction.countDocuments({ userId: user._id, deliveryStatus: 'pending' }),
  ]);

  return {
    user,
    transactionSummary: {
      totalSpent: txnStats[0]?.totalSpent || 0,
      totalOrders: txnStats[0]?.count || 0,
      delivered: deliveredCount,
      failed: failedCount,
      pending: pendingCount,
    },
    recentTransactions: recentTxns,
    loginHistory,
    adminNotes: notes,
    recentActivity: recentAudit,
  };
}

/** Every admin mutation needs the acting admin's name for the audit log — one lookup helper instead of repeating it. */
async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

/**
 * Shared transaction filter builder — the single source of truth for how
 * admin transaction queries (status/category/date/user/search) are shaped.
 * Extracted so Module 7's Reports & Analytics drill-down and CSV export can
 * reuse the exact same filtering rules as listTransactions below, instead of
 * re-implementing them. Adds `provider` (upstream API provider — the same
 * value ProviderCallLog and Transaction.provider.name use) and `productId`
 * (exact product SKU) on top of the original fields, additive only — every
 * existing caller with none of the new params behaves exactly as before.
 */
export function buildTransactionFilter(query: Record<string, any>): any {
  const { status, category, userId, search, dateFrom, dateTo, provider, productId } = query;

  const filter: any = {};
  if (status) filter.deliveryStatus = status;
  if (category) filter['product.category'] = category;
  if (userId) filter.userId = userId;
  if (provider) filter['provider.name'] = provider;
  if (productId) filter['product.productId'] = productId;
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
    ];
  }
  return filter;
}

export class AdminController {
  // ============================================================
  // MODULE 1 — DASHBOARD (unchanged, preserved as-is)
  // ============================================================

  /**
   * Real operations dashboard data. Every number here is a live query —
   * no hardcoded/mocked values. Extends the original getStats (revenue,
   * profit, delivery breakdown) with everything Module 1 needs: active
   * users, platform wallet float, weekly/monthly revenue, transaction
   * status breakdown, provider health, and derived system alerts.
   */
  static async getStats(_req: Request, res: Response) {
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(Date.now() - 7 * DAY_MS);
      const monthStart = new Date(Date.now() - 30 * DAY_MS);
      const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

      const totalCost = await Transaction.aggregate([
        { $match: { type: 'purchase', status: 'success', deliveryStatus: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ]);

      const [
        totalRevenue, todayRevenue, weekRevenue, monthRevenue,
        totalUsers, activeUsers, walletBalanceAgg,
        totalTransactions, deliveredCount, pendingCount, failedTxns,
        openTicketCount, providerHealth,
      ] = await Promise.all([
        revenueSince(null),
        revenueSince(todayStart),
        revenueSince(weekStart),
        revenueSince(monthStart),
        User.countDocuments({ role: 'customer' }),
        // "Active" = logged in within the last 30 days. No separate activity
        // tracking exists — lastLogin is the only real signal available.
        User.countDocuments({ role: 'customer', lastLogin: { $gte: thirtyDaysAgo } }),
        User.aggregate([{ $match: { role: 'customer' } }, { $group: { _id: null, total: { $sum: '$walletBalance' } } }]),
        Transaction.countDocuments({}),
        Transaction.countDocuments({ deliveryStatus: 'delivered' }),
        Transaction.countDocuments({ deliveryStatus: 'pending' }),
        Transaction.find({ deliveryStatus: 'failed' }).sort({ createdAt: -1 }).limit(1000),
        SupportTicket.countDocuments({ status: 'open' }),
        providerOrchestrator.getProviderHealth(),
      ]);

      const failureBreakdown: Record<string, number> = {};
      failedTxns.forEach((t) => {
        const reason = t.failReason || 'Unknown Error';
        failureBreakdown[reason] = (failureBreakdown[reason] || 0) + 1;
      });

      const alerts: { severity: 'critical' | 'warning' | 'info'; message: string }[] = [];
      providerHealth.forEach((p) => {
        if (p.status === 'offline') alerts.push({ severity: 'critical', message: `${p.name} provider is unreachable` });
        else if (p.status === 'low_balance') alerts.push({ severity: 'warning', message: `${p.name} balance is low (₦${p.balance.toLocaleString()})` });
      });
      const failedLast24h = await Transaction.countDocuments({ deliveryStatus: 'failed', createdAt: { $gte: new Date(Date.now() - DAY_MS) } });
      if (failedLast24h >= 5) alerts.push({ severity: 'warning', message: `${failedLast24h} failed transactions in the last 24 hours` });
      if (openTicketCount > 0) alerts.push({ severity: 'info', message: `${openTicketCount} open support ticket${openTicketCount !== 1 ? 's' : ''}` });

      res.json({
        success: true,
        stats: {
          revenue: totalRevenue,
          profit: totalRevenue - (totalCost[0]?.total || 0),
          todayRevenue,
          weekRevenue,
          monthRevenue,
          totalUsers,
          activeUsers,
          totalWalletBalance: walletBalanceAgg[0]?.total || 0,
          totalTransactions,
          delivered: deliveredCount,
          pending: pendingCount,
          failed: failedTxns.length,
          failureBreakdown,
          todayTransactions: await Transaction.countDocuments({ createdAt: { $gte: todayStart } }),
          openTickets: openTicketCount,
          providers: providerHealth,
          alerts,
        },
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async getRevenueChart(req: Request, res: Response) {
    try {
      const days = Math.min(parseInt(req.query.days as string) || 30, 90);
      const since = new Date(Date.now() - (days - 1) * DAY_MS);
      since.setHours(0, 0, 0, 0);

      const rows = await Transaction.aggregate([
        { $match: { type: 'purchase', status: 'success', deliveryStatus: 'delivered', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: { $abs: '$amount' } },
            cost: { $sum: '$cost' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const byDate = new Map(rows.map((r) => [r._id, r]));
      const series: { date: string; revenue: number; profit: number; count: number }[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(since.getTime() + i * DAY_MS);
        const key = d.toISOString().slice(0, 10);
        const row = byDate.get(key);
        series.push({
          date: key,
          revenue: row?.revenue || 0,
          profit: row ? row.revenue - row.cost : 0,
          count: row?.count || 0,
        });
      }

      res.json({ success: true, series });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Global markup config now lives on ProductService, not per-tenant. */
  static async getGlobalMarkup(_req: Request, res: Response) {
    res.json({ success: true, markup: ProductService.markup });
  }

  static async setGlobalMarkup(req: any, res: Response) {
    try {
      const updates = req.body as Record<string, number>;
      const before = { ...ProductService.markup };
      for (const [category, pct] of Object.entries(updates)) {
        if (typeof pct === 'number' && pct >= 0) {
          ProductService.markup[category] = pct;
        }
      }
      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'pricing.markup_update', targetType: 'system', targetLabel: 'Global Markup',
        before, after: { ...ProductService.markup }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, message: 'Markup updated successfully', markup: ProductService.markup });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async getProviderStatus(_req: Request, res: Response) {
    try {
      const providers = await providerOrchestrator.getProviderHealth();
      res.json({ success: true, providers });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // MODULE 2 — USER MANAGEMENT
  // ============================================================

  /**
   * Paginated, filterable, searchable user list. Extended from the original
   * unpaginated top-500 version — backward compatible: with no query params
   * it still returns page 1 of results sorted the same way.
   */
  static async listUsers(req: Request, res: Response) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 25, 1), 100);
      const { status, role, kycStatus, search } = req.query as Record<string, string>;

      const filter: any = {};
      if (status) filter.status = status;
      if (role) filter.role = role;
      if (kycStatus) filter.kycStatus = kycStatus;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      const [users, total] = await Promise.all([
        User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
        User.countDocuments(filter),
      ]);

      res.json({ success: true, users, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * Full user profile bundle for the detail view — account info, wallet
   * info, transaction summary, recent transactions, login history, admin
   * notes, and recent audit log entries. Composed from existing models,
   * no new source of truth invented beyond what Module 2 explicitly needs
   * (admin notes, login history — neither existed before).
   */
  static async getUserDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const snapshot = await buildCustomerSnapshot(id);
      if (!snapshot) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, ...snapshot });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async updateRole(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!['admin', 'customer'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }
      const before = await User.findById(id).select('role name email');
      if (!before) return res.status(404).json({ success: false, error: 'User not found' });

      const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'user.role_change', targetId: id, targetLabel: before.email,
        before: { role: before.role }, after: { role }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, user });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async updateStatus(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      const before = await User.findById(id).select('status name email');
      if (!before) return res.status(404).json({ success: false, error: 'User not found' });

      const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: status === 'suspended' ? 'user.suspend' : 'user.activate',
        targetId: id, targetLabel: before.email,
        before: { status: before.status }, after: { status }, reason, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, user });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * Security lock — distinct from `status` (business suspension). Both are
   * checked at login (AuthService.login) independently.
   */
  static async setLock(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { locked, reason } = req.body;
      const before = await User.findById(id).select('isLocked name email');
      if (!before) return res.status(404).json({ success: false, error: 'User not found' });

      const user = await User.findByIdAndUpdate(id, { isLocked: !!locked }, { new: true }).select('-password');
      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: locked ? 'user.lock' : 'user.unlock', targetId: id, targetLabel: before.email,
        before: { isLocked: before.isLocked }, after: { isLocked: !!locked }, reason, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, user });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * Admin-triggered password reset — reuses the exact same
   * AuthService.generateResetToken + EmailService.sendPasswordReset used by
   * the customer's own "forgot password" flow. No separate reset mechanism.
   */
  static async adminResetPassword(req: any, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const { resetUrl } = await AuthService.generateResetToken(user);
      EmailService.sendPasswordReset(user, resetUrl).catch(() => {});

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'user.password_reset', targetId: id, targetLabel: user.email,
        reason: 'Admin-triggered password reset', ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, message: `Password reset email sent to ${user.email}` });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async addAdminNote(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      if (!note || !note.trim()) return res.status(400).json({ success: false, error: 'Note text is required' });

      const user = await User.findById(id).select('email');
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const actor = await getActor(req);
      const created = await AdminNote.create({ userId: id, adminId: actor.id, adminName: actor.name, note: note.trim() });
      AuditLogService.log({
        admin: actor, action: 'user.note_added', targetId: id, targetLabel: user.email,
        after: { note: note.trim() }, ip: AuditLogService.getClientIp(req),
      });

      res.status(201).json({ success: true, note: created });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * "Send Notification" — reuses EmailService.sendSystemAnnouncement, which
   * was built in V2.1 but had no caller anywhere until now.
   */
  static async sendUserNotification(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { title, message } = req.body;
      if (!title || !message) return res.status(400).json({ success: false, error: 'Title and message are required' });

      const user = await User.findById(id).select('email name');
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      await EmailService.sendSystemAnnouncement(user, title, message);

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'user.notification_sent', targetId: id, targetLabel: user.email,
        after: { title, message }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, message: `Notification sent to ${user.email}` });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/admin/audit-logs — originally a simple targetId/action/limit
   * lookup (used by the user-detail drawer's activity tab and the wallet
   * tab's recent-actions list). Extended here to also support the full
   * admin Audit Log page: pagination, free-text search, target type, and
   * date range — all additive, so existing callers passing just
   * {targetId, action, limit} keep working exactly as before.
   */
  static async listAuditLogs(req: Request, res: Response) {
    try {
      const { targetId, action, targetType } = req.query as Record<string, string>;
      const filter: any = {};
      if (targetId) filter.targetId = targetId;
      if (action) filter.action = action.includes(',') ? { $in: action.split(',') } : action;
      if (targetType) filter.targetType = targetType;
      if (req.query.adminId) filter.adminId = req.query.adminId;
      if (req.query.search) {
        const re = new RegExp(String(req.query.search), 'i');
        filter.$or = [{ adminName: re }, { targetLabel: re }, { action: re }, { reason: re }];
      }
      if (req.query.dateFrom || req.query.dateTo) {
        filter.createdAt = {};
        if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom as string);
        if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo as string);
      }

      // Two modes: legacy `limit`-only callers get a flat capped list (unchanged
      // behavior); anything passing `page` gets full pagination + metadata.
      if (req.query.page) {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));
        const [logs, total, distinctActions] = await Promise.all([
          AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
          AuditLog.countDocuments(filter),
          AuditLog.distinct('action'),
        ]);
        return res.json({ success: true, logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize), distinctActions });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit);
      res.json({ success: true, logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // MODULE 3 — WALLET & TRANSACTION MANAGEMENT
  // ============================================================

  /**
   * Manual wallet credit — reuses WalletService.credit (pure balance
   * mutation, same function every deposit uses) and logs a Transaction with
   * type 'admin_adjustment', an enum value that has existed on the schema
   * since before this session but was never used anywhere until now.
   */
  static async creditWallet(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const amt = Number(amount);
      if (!amt || amt <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required for wallet adjustments' });

      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const before = user.walletBalance;
      const newBalance = await WalletService.credit(id, amt);

      const reference = `ADJ-${Date.now()}`;
      const txn = await Transaction.create({
        userId: id, amount: amt, type: 'admin_adjustment', status: 'success', deliveryStatus: 'delivered',
        product: { name: 'Manual Wallet Credit', category: 'admin_adjustment' },
        paymentReference: reference,
      });

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'wallet.credit', targetId: id, targetLabel: user.email,
        before: { walletBalance: before }, after: { walletBalance: newBalance, amount: amt }, reason, ip: AuditLogService.getClientIp(req),
      });
      EmailService.sendWalletFunded(user, amt, newBalance, reference).catch((err) => console.error('[creditWallet] email failed:', err));

      res.json({ success: true, message: `${user.email} credited successfully`, newBalance, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async debitWallet(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const amt = Number(amount);
      if (!amt || amt <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required for wallet adjustments' });

      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const before = user.walletBalance;
      // WalletService.debit throws if balance is insufficient — same guard
      // every customer purchase relies on, reused rather than reimplemented.
      const newBalance = await WalletService.debit(id, amt);

      const txn = await Transaction.create({
        userId: id, amount: -amt, type: 'admin_adjustment', status: 'success', deliveryStatus: 'delivered',
        product: { name: 'Manual Wallet Debit', category: 'admin_adjustment' },
        paymentReference: `ADJ-${Date.now()}`,
      });

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'wallet.debit', targetId: id, targetLabel: user.email,
        before: { walletBalance: before }, after: { walletBalance: newBalance, amount: amt }, reason, ip: AuditLogService.getClientIp(req),
      });
      EmailService.sendWalletDebited(user, amt, newBalance, reason).catch((err) => console.error('[debitWallet] email failed:', err));

      res.json({ success: true, message: `${user.email} debited successfully`, newBalance, transaction: txn });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * Extended with real pagination, status/category/date/user filters, and
   * search — backward compatible with the Module 1 dashboard's
   * `?limit=8` unfiltered call.
   */
  static async listTransactions(req: Request, res: Response) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const usingPagination = !!req.query.page;
      const limit = Math.min(parseInt(req.query.limit as string) || (usingPagination ? 25 : 500), 500);
      const filter = buildTransactionFilter(req.query as Record<string, string>);

      const query = Transaction.find(filter).sort({ createdAt: -1 });
      if (usingPagination) query.skip((page - 1) * limit);
      const [txns, total] = await Promise.all([
        query.limit(limit).populate('userId', 'name email'),
        Transaction.countDocuments(filter),
      ]);

      res.json({ success: true, transactions: txns, total, page, pageSize: limit, totalPages: Math.max(Math.ceil(total / limit), 1) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
