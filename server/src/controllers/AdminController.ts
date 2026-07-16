import { Request, Response } from 'express';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { SupportTicket } from '../models/SupportTicket';
import { ProductService } from '../services/ProductService';
import { providerOrchestrator } from '../providers/ProviderOrchestrator';

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

export class AdminController {
  /**
   * Real operations dashboard data. Every number here is a live query —
   * no hardcoded/mocked values. Extends the original getStats (revenue,
   * profit, delivery breakdown) with everything Module 1 needs: active
   * users, platform wallet float, weekly/monthly revenue, transaction
   * status breakdown, provider health, and derived system alerts.
   */
  static async getStats(req: Request, res: Response) {
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

      // Derived system alerts — no separate Notification model exists yet,
      // so these are computed live from real signals rather than stored.
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

  /**
   * Real revenue time series for the dashboard chart — replaces the
   * hardcoded 30-number array that used to render regardless of actual
   * data. Groups delivered purchases by day for the last N days.
   */
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

      // Fill in zero-days so the chart doesn't skip gaps with no sales.
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

  static async listUsers(req: Request, res: Response) {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(500);
      res.json({ success: true, users });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!['admin', 'customer'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }
      const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
      res.json({ success: true, user });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
      res.json({ success: true, user });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async listTransactions(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 500;
      const txns = await Transaction.find().sort({ createdAt: -1 }).limit(limit);
      res.json({ success: true, transactions: txns });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Global markup config now lives on ProductService, not per-tenant. */
  static async getGlobalMarkup(req: Request, res: Response) {
    res.json({ success: true, markup: ProductService.markup });
  }

  static async setGlobalMarkup(req: Request, res: Response) {
    try {
      const updates = req.body as Record<string, number>;
      for (const [category, pct] of Object.entries(updates)) {
        if (typeof pct === 'number' && pct >= 0) {
          ProductService.markup[category] = pct;
        }
      }
      res.json({ success: true, message: 'Markup updated successfully', markup: ProductService.markup });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * FIXED: this returned hardcoded fake data ("Online", "99.9%") regardless
   * of reality. Now calls the same real getBalance() every provider already
   * exposes and that the live purchase flow already depends on.
   */
  static async getProviderStatus(req: Request, res: Response) {
    try {
      const providers = await providerOrchestrator.getProviderHealth();
      res.json({ success: true, providers });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
