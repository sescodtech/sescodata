import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { ProviderCallLog } from '../models/ProviderCallLog';
import { AuditLogService } from '../services/AuditLogService';
import { buildTransactionFilter } from './AdminController';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every admin mutation needs the acting admin's name for the audit log — same pattern used across every other admin controller. */
async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

// ============================================================
// Date range resolution
// ============================================================

type Period = 'today' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'all';

/**
 * Resolves a `period` (+ optional dateFrom/dateTo for 'custom') into a
 * concrete { from, to } range. Every report/chart/dashboard endpoint below
 * shares this so "Daily" always means the same thing everywhere in Module 7.
 */
function resolveRange(query: Record<string, any>): { from: Date | null; to: Date; period: Period } {
  const period = (query.period as Period) || 'monthly';
  const now = new Date();
  const to = query.dateTo ? new Date(query.dateTo) : now;

  if (period === 'custom') {
    const from = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getTime() - 30 * DAY_MS);
    return { from, to, period };
  }
  if (period === 'all') return { from: null, to, period };

  const start = new Date(to);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      return { from: start, to, period };
    case 'daily':
      // "Daily" report = last 24 hours, matching the other periods' "trailing window" convention.
      return { from: new Date(to.getTime() - DAY_MS), to, period };
    case 'weekly':
      return { from: new Date(to.getTime() - 7 * DAY_MS), to, period };
    case 'quarterly':
      return { from: new Date(to.getTime() - 91 * DAY_MS), to, period };
    case 'yearly':
      return { from: new Date(to.getTime() - 365 * DAY_MS), to, period };
    case 'monthly':
    default:
      return { from: new Date(to.getTime() - 30 * DAY_MS), to, period };
  }
}

/** Picks a sensible grouping bucket for a time series based on how wide the range is. */
function granularityFor(from: Date | null, to: Date): { unit: 'hour' | 'day' | 'week' | 'month'; format: string } {
  const spanDays = from ? (to.getTime() - from.getTime()) / DAY_MS : 366;
  if (spanDays <= 2) return { unit: 'hour', format: '%Y-%m-%d %H:00' };
  if (spanDays <= 92) return { unit: 'day', format: '%Y-%m-%d' };
  if (spanDays <= 731) return { unit: 'week', format: '%G-W%V' };
  return { unit: 'month', format: '%Y-%m' };
}

/** Applies the shared filter builder plus a resolved date range, for endpoints that accept both period and drill-down filters. */
function buildFilter(query: Record<string, any>, from: Date | null, to: Date): any {
  const filter = buildTransactionFilter({ ...query, dateFrom: undefined, dateTo: undefined });
  filter.createdAt = filter.createdAt || {};
  if (from) filter.createdAt.$gte = from;
  filter.createdAt.$lte = to;
  if (!from) delete filter.createdAt.$gte;
  return filter;
}

/** Extracts a human brand/network/biller label from a product name — "MTN 1GB" -> "MTN", "DSTV Compact" -> "DSTV". No taxonomy invented; this reads real product names already in the data. */
const brandSplitExpr = { $arrayElemAt: [{ $split: ['$product.name', ' '] }, 0] };

// ============================================================
// Core KPI aggregation — shared by dashboard + reports/summary
// ============================================================

async function computeKpis(filter: any, from: Date | null, to: Date) {
  const purchaseFilter = { ...filter, type: 'purchase' };
  const deliveredFilter = { ...purchaseFilter, status: 'success', deliveryStatus: 'delivered' };
  const successFilter = { ...purchaseFilter, status: 'success' };

  const [
    revenueAgg, grossSalesAgg,
    totalTransactions, successfulTransactions, pendingTransactions, failedTransactions,
    newUsers, activeUsers, walletFloatAgg, returningAgg,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: deliveredFilter },
      { $group: { _id: null, revenue: { $sum: { $abs: '$amount' } }, cost: { $sum: '$cost' } } },
    ]),
    // Gross Sales = every successful purchase attempt (regardless of final delivery
    // outcome) — the raw sales volume processed, before delivery-failure refunds.
    Transaction.aggregate([
      { $match: successFilter },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
    ]),
    Transaction.countDocuments(purchaseFilter),
    Transaction.countDocuments({ ...purchaseFilter, deliveryStatus: 'delivered' }),
    Transaction.countDocuments({ ...purchaseFilter, deliveryStatus: 'pending' }),
    Transaction.countDocuments({ ...purchaseFilter, deliveryStatus: 'failed' }),
    User.countDocuments({ role: 'customer', createdAt: filter.createdAt ? filter.createdAt : { $exists: true } }),
    User.countDocuments({ role: 'customer', lastLogin: filter.createdAt ? filter.createdAt : { $gte: new Date(Date.now() - 30 * DAY_MS) } }),
    User.aggregate([{ $match: { role: 'customer' } }, { $group: { _id: null, total: { $sum: '$walletBalance' } } }]),
    Transaction.aggregate([
      { $match: deliveredFilter },
      { $group: { _id: '$userId', purchases: { $sum: 1 } } },
      { $match: { purchases: { $gt: 1 } } },
      { $count: 'count' },
    ]),
  ]);

  const revenue = revenueAgg[0]?.revenue || 0;
  const cost = revenueAgg[0]?.cost || 0;
  const grossSales = grossSalesAgg[0]?.total || 0;
  const successRate = totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 1000) / 10 : 0;
  const failureRate = totalTransactions > 0 ? Math.round((failedTransactions / totalTransactions) * 1000) / 10 : 0;

  return {
    totalRevenue: revenue,
    netProfit: revenue - cost,
    grossSales,
    walletFloat: walletFloatAgg[0]?.total || 0,
    totalTransactions,
    successfulTransactions,
    pendingTransactions,
    failedTransactions,
    successRate,
    failureRate,
    newUsers,
    activeUsers,
    returningCustomers: returningAgg[0]?.count || 0,
    avgTransactionValue: successfulTransactions > 0 ? Math.round((revenue / successfulTransactions) * 100) / 100 : 0,
  };
}

async function computeTopLists(filter: any) {
  const deliveredFilter = { ...filter, type: 'purchase', status: 'success', deliveryStatus: 'delivered' };

  const [topProducts, topNetworks, topBillers, providerPerformance] = await Promise.all([
    Transaction.aggregate([
      { $match: deliveredFilter },
      { $group: { _id: '$product.name', revenue: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', revenue: 1, count: 1 } },
    ]),
    Transaction.aggregate([
      { $match: { ...deliveredFilter, 'product.category': { $in: ['data', 'airtime'] } } },
      { $project: { brand: brandSplitExpr, amount: 1 } },
      { $group: { _id: '$brand', revenue: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', revenue: 1, count: 1 } },
    ]),
    Transaction.aggregate([
      { $match: { ...deliveredFilter, 'product.category': { $in: ['cable', 'electricity'] } } },
      { $project: { brand: brandSplitExpr, amount: 1 } },
      { $group: { _id: '$brand', revenue: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', revenue: 1, count: 1 } },
    ]),
    ProviderCallLog.aggregate([
      { $match: filter.createdAt ? { createdAt: filter.createdAt } : {} },
      {
        $group: {
          _id: '$provider',
          totalCalls: { $sum: 1 },
          successCalls: { $sum: { $cond: ['$success', 1, 0] } },
          avgDurationMs: { $avg: '$durationMs' },
        },
      },
      { $sort: { totalCalls: -1 } },
      {
        $project: {
          _id: 0, provider: '$_id', totalCalls: 1,
          successRate: { $cond: [{ $gt: ['$totalCalls', 0] }, { $round: [{ $multiply: [{ $divide: ['$successCalls', '$totalCalls'] }, 100] }, 1] }, 0] },
          avgResponseMs: { $round: ['$avgDurationMs', 0] },
        },
      },
    ]),
  ]);

  return { topProducts, topNetworks, topBillers, providerPerformance };
}

export class AdminReportsController {
  // ============================================================
  // EXECUTIVE DASHBOARD
  // ============================================================
  static async getDashboard(req: Request, res: Response) {
    try {
      const { from, to, period } = resolveRange(req.query as any);
      const filter = buildFilter(req.query as any, from, to);

      const [kpis, lists] = await Promise.all([
        computeKpis(filter, from, to),
        computeTopLists(filter),
      ]);

      res.json({ success: true, period, range: { from, to }, kpis, ...lists });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // REPORTS — Daily / Weekly / Monthly / Quarterly / Yearly / Custom
  // ============================================================
  static async getReport(req: Request, res: Response) {
    try {
      const { from, to, period } = resolveRange(req.query as any);
      const filter = buildFilter(req.query as any, from, to);
      const { unit, format } = granularityFor(from, to);

      const [kpis, lists, breakdownRows] = await Promise.all([
        computeKpis(filter, from, to),
        computeTopLists(filter),
        Transaction.aggregate([
          { $match: { ...filter, type: 'purchase' } },
          {
            $group: {
              _id: { $dateToString: { format, date: '$createdAt' } },
              revenue: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'success'] }, { $eq: ['$deliveryStatus', 'delivered'] }] }, { $abs: '$amount' }, 0] } },
              cost: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'success'] }, { $eq: ['$deliveryStatus', 'delivered'] }] }, '$cost', 0] } },
              total: { $sum: 1 },
              successful: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'pending'] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0, bucket: '$_id', revenue: 1,
              profit: { $subtract: ['$revenue', '$cost'] },
              total: 1, successful: 1, pending: 1, failed: 1,
            },
          },
        ]),
      ]);

      res.json({
        success: true, period, range: { from, to }, granularity: unit,
        kpis, ...lists, breakdown: breakdownRows,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // ANALYTICS — chart time series
  // ============================================================
  static async getChart(req: Request, res: Response) {
    try {
      const metric = String(req.query.metric || 'revenueTrend');
      const { from, to, period } = resolveRange(req.query as any);
      const filter = buildFilter(req.query as any, from, to);
      const { format, unit } = granularityFor(from, to);

      let series: any[] = [];

      switch (metric) {
        case 'revenueTrend':
        case 'profitTrend':
        case 'transactionTrend':
        case 'failureTrend':
        case 'successTrend': {
          const rows = await Transaction.aggregate([
            { $match: { ...filter, type: 'purchase' } },
            {
              $group: {
                _id: { $dateToString: { format, date: '$createdAt' } },
                revenue: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'success'] }, { $eq: ['$deliveryStatus', 'delivered'] }] }, { $abs: '$amount' }, 0] } },
                cost: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'success'] }, { $eq: ['$deliveryStatus', 'delivered'] }] }, '$cost', 0] } },
                total: { $sum: 1 },
                successful: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ]);
          series = rows.map((r) => ({
            date: r._id, revenue: r.revenue, profit: r.revenue - r.cost, total: r.total,
            successful: r.successful, failed: r.failed,
          }));
          break;
        }
        case 'userGrowth': {
          const rows = await User.aggregate([
            { $match: { role: 'customer', ...(filter.createdAt ? { createdAt: filter.createdAt } : {}) } },
            { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]);
          series = rows.map((r) => ({ date: r._id, newUsers: r.count }));
          break;
        }
        case 'providerPerformance': {
          const rows = await ProviderCallLog.aggregate([
            { $match: filter.createdAt ? { createdAt: filter.createdAt } : {} },
            {
              $group: {
                _id: { date: { $dateToString: { format, date: '$createdAt' } }, provider: '$provider' },
                total: { $sum: 1 },
                success: { $sum: { $cond: ['$success', 1, 0] } },
              },
            },
            { $sort: { '_id.date': 1 } },
          ]);
          series = rows.map((r) => ({
            date: r._id.date, provider: r._id.provider, total: r.total, success: r.success,
            successRate: r.total > 0 ? Math.round((r.success / r.total) * 1000) / 10 : 0,
          }));
          break;
        }
        case 'walletFlow': {
          const rows = await Transaction.aggregate([
            { $match: { ...(filter.createdAt ? { createdAt: filter.createdAt } : {}), type: { $in: ['deposit', 'purchase', 'refund'] }, status: 'success' } },
            {
              $group: {
                _id: { date: { $dateToString: { format, date: '$createdAt' } }, type: '$type' },
                total: { $sum: { $abs: '$amount' } },
              },
            },
            { $sort: { '_id.date': 1 } },
          ]);
          const byDate = new Map<string, any>();
          rows.forEach((r) => {
            const d = r._id.date;
            if (!byDate.has(d)) byDate.set(d, { date: d, deposits: 0, purchases: 0, refunds: 0 });
            const entry = byDate.get(d);
            if (r._id.type === 'deposit') entry.deposits = r.total;
            if (r._id.type === 'purchase') entry.purchases = r.total;
            if (r._id.type === 'refund') entry.refunds = r.total;
          });
          series = Array.from(byDate.values());
          break;
        }
        case 'productPerformance': {
          const rows = await Transaction.aggregate([
            { $match: { ...filter, type: 'purchase', status: 'success', deliveryStatus: 'delivered' } },
            { $group: { _id: '$product.name', revenue: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
          ]);
          series = rows.map((r) => ({ product: r._id, revenue: r.revenue, count: r.count }));
          break;
        }
        case 'serviceDistribution': {
          const rows = await Transaction.aggregate([
            { $match: { ...filter, type: 'purchase', status: 'success', deliveryStatus: 'delivered' } },
            { $group: { _id: '$product.category', revenue: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
          ]);
          series = rows.map((r) => ({ category: r._id || 'other', revenue: r.revenue, count: r.count }));
          break;
        }
        default:
          return res.status(400).json({ success: false, error: `Unknown metric: ${metric}` });
      }

      res.json({ success: true, metric, period, range: { from, to }, granularity: unit, series });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // EXPORTS — CSV (audited) — PDF/Print are generated client-side from
  // this same JSON, so exportLog below covers those for the audit trail.
  // ============================================================

  /** CSV export of filtered transactions — same filter rules as the drill-down table (Module 3's listTransactions), so what you see is exactly what you export. */
  static async exportTransactionsCsv(req: any, res: Response) {
    try {
      const { from, to } = resolveRange(req.query as any);
      const filter = buildFilter(req.query as any, from, to);
      const txns = await Transaction.find(filter).sort({ createdAt: -1 }).limit(20000).populate('userId', 'name email').lean();

      const header = 'Date,Reference,User,Email,Product,Category,Amount,Status,DeliveryStatus\n';
      const rows = txns.map((t: any) => [
        new Date(t.createdAt).toISOString(),
        t.paymentReference || '',
        `"${(t.userId?.name || '').replace(/"/g, '""')}"`,
        t.userId?.email || '',
        `"${(t.product?.name || '').replace(/"/g, '""')}"`,
        t.product?.category || '',
        Math.abs(t.amount),
        t.status,
        t.deliveryStatus,
      ].join(',')).join('\n');

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'reports.export_csv', targetType: 'system',
        targetLabel: 'Transactions Export', after: { count: txns.length, filter }, ip: AuditLogService.getClientIp(req),
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sescohub-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(header + rows);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** CSV export of the executive dashboard / summary KPI snapshot. */
  static async exportSummaryCsv(req: any, res: Response) {
    try {
      const { from, to, period } = resolveRange(req.query as any);
      const filter = buildFilter(req.query as any, from, to);
      const kpis = await computeKpis(filter, from, to);

      const header = 'Metric,Value\n';
      const rows = Object.entries(kpis).map(([k, v]) => `${k},${v}`).join('\n');

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor, action: 'reports.export_csv', targetType: 'system',
        targetLabel: `Summary Export (${period})`, after: { period, range: { from, to } }, ip: AuditLogService.getClientIp(req),
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sescohub-report-summary-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(header + rows);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * Called by the frontend right after it generates a client-side PDF or
   * triggers Print, so those sensitive exports land in the same audit
   * trail as the server-generated CSV exports above — nothing generated
   * from this data leaves unaudited.
   */
  static async logExport(req: any, res: Response) {
    try {
      const { type, period } = req.body as { type: 'pdf' | 'print'; period?: string };
      const actor = await getActor(req);
      await AuditLogService.log({
        admin: actor, action: `reports.export_${type === 'pdf' ? 'pdf' : 'print'}`, targetType: 'system',
        targetLabel: `Report Export (${period || 'n/a'})`, ip: AuditLogService.getClientIp(req),
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
