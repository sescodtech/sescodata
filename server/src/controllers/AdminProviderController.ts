import { Response } from 'express';
import { providerOrchestrator } from '../providers/ProviderOrchestrator';
import { ProviderCallLog } from '../models/ProviderCallLog';
import { ProviderSettings } from '../models/ProviderSettings';
import { AuditLogService } from '../services/AuditLogService';
import { User } from '../models/User';

const KNOWN_PROVIDERS = ['gladtidings', 'cheapdatahub', 'jarapoint'];

async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name email');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

function dayStart(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export class AdminProviderController {
  /**
   * GET /api/admin/providers — the full Provider Control Center dashboard:
   * live health (real getBalance() calls), current settings (priority,
   * disabled, manual override), and real usage/success-rate stats computed
   * from ProviderCallLog — the same log every live purchase already writes
   * to via ProviderOrchestrator.executeWithFailover. Nothing here is
   * hardcoded or simulated.
   */
  static async getDashboard(_req: any, res: Response) {
    try {
      const [health, settings, statsAgg, lastActivityAgg, dailySeriesAgg] = await Promise.all([
        providerOrchestrator.getProviderHealth(),
        providerOrchestrator.getSettings(),
        ProviderCallLog.aggregate([
          { $match: { createdAt: { $gte: dayStart(30) } } },
          {
            $group: {
              _id: '$provider',
              totalCalls: { $sum: 1 },
              successCalls: { $sum: { $cond: ['$success', 1, 0] } },
              avgDurationMs: { $avg: '$durationMs' },
              dailyCalls: { $sum: { $cond: [{ $gte: ['$createdAt', dayStart(0)] }, 1, 0] } },
              monthlyCalls: { $sum: 1 }, // window is already 30 days
            },
          },
        ]),
        ProviderCallLog.aggregate([
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$provider', lastCallAt: { $first: '$createdAt' }, lastError: { $first: { $cond: ['$success', null, '$error'] } }, lastSuccess: { $first: '$success' } } },
        ]),
        ProviderCallLog.aggregate([
          { $match: { createdAt: { $gte: dayStart(13) } } },
          {
            $group: {
              _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, provider: '$provider' },
              total: { $sum: 1 },
              success: { $sum: { $cond: ['$success', 1, 0] } },
              avgDurationMs: { $avg: '$durationMs' },
            },
          },
          { $sort: { '_id.day': 1 } },
        ]),
      ]);

      const dailySeries = dailySeriesAgg.map((row) => ({
        date: row._id.day,
        provider: row._id.provider,
        total: row.total,
        success: row.success,
        failed: row.total - row.success,
        successRate: Math.round((row.success / row.total) * 1000) / 10,
        avgResponseMs: Math.round(row.avgDurationMs),
      }));

      const lastActivityByProvider: Record<string, any> = {};
      for (const row of lastActivityAgg) {
        lastActivityByProvider[row._id] = { lastCallAt: row.lastCallAt, lastError: row.lastSuccess ? null : row.lastError };
      }

      const statsByProvider: Record<string, any> = {};
      for (const row of statsAgg) {
        statsByProvider[row._id] = {
          totalCalls30d: row.totalCalls,
          successRate: row.totalCalls > 0 ? Math.round((row.successCalls / row.totalCalls) * 1000) / 10 : null,
          failureRate: row.totalCalls > 0 ? Math.round(((row.totalCalls - row.successCalls) / row.totalCalls) * 1000) / 10 : null,
          avgResponseMs: row.avgDurationMs ? Math.round(row.avgDurationMs) : null,
          dailyCalls: row.dailyCalls,
          monthlyCalls: row.monthlyCalls,
        };
      }

      const providers = health.map((h) => ({
        ...h,
        priorityPosition: settings.priorityOrder.indexOf(h.name),
        isManualOverride: settings.manualOverrideProvider === h.name,
        stats: {
          ...(statsByProvider[h.name] || { totalCalls30d: 0, successRate: null, failureRate: null, avgResponseMs: null, dailyCalls: 0, monthlyCalls: 0 }),
          lastSyncAt: lastActivityByProvider[h.name]?.lastCallAt || null,
          lastError: lastActivityByProvider[h.name]?.lastError || null,
        },
      }));

      const alerts: { severity: 'critical' | 'warning' | 'info'; message: string; provider: string }[] = [];
      for (const p of providers) {
        if (p.disabled) continue; // don't alert on providers the admin deliberately disabled
        if (p.status === 'offline') alerts.push({ severity: 'critical', message: `${p.name} is unreachable`, provider: p.name });
        else if (p.status === 'low_balance') alerts.push({ severity: 'warning', message: `${p.name} balance is low (₦${p.balance.toLocaleString()})`, provider: p.name });
        if (p.stats.failureRate !== null && p.stats.failureRate >= 20 && p.stats.totalCalls30d >= 5) {
          alerts.push({ severity: p.stats.failureRate >= 50 ? 'critical' : 'warning', message: `${p.name} failure rate is ${p.stats.failureRate}% over the last 30 days`, provider: p.name });
        }
        if (p.stats.avgResponseMs !== null && p.stats.avgResponseMs >= 5000) {
          alerts.push({ severity: 'warning', message: `${p.name} average response time is ${(p.stats.avgResponseMs / 1000).toFixed(1)}s`, provider: p.name });
        }
      }

      res.json({
        success: true,
        providers,
        alerts,
        dailySeries,
        settings: {
          priorityOrder: settings.priorityOrder,
          manualOverrideProvider: settings.manualOverrideProvider,
          disabledProviders: settings.disabledProviders,
          minBalanceThreshold: settings.minBalanceThreshold,
        },
        // "Future multi-provider ready" — surfaces any provider class that
        // exists in code but isn't part of the active rotation yet.
        availableProviderTypes: KNOWN_PROVIDERS,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** PUT /api/admin/providers/settings — update priority order, disabled list, manual override, or min balance. */
  static async updateSettings(req: any, res: Response) {
    try {
      const { priorityOrder, disabledProviders, manualOverrideProvider, minBalanceThreshold, reason } = req.body;

      if (priorityOrder && (!Array.isArray(priorityOrder) || priorityOrder.some((p: string) => !KNOWN_PROVIDERS.includes(p)))) {
        return res.status(400).json({ success: false, error: 'priorityOrder must only contain known provider ids' });
      }
      if (disabledProviders && (!Array.isArray(disabledProviders) || disabledProviders.some((p: string) => !KNOWN_PROVIDERS.includes(p)))) {
        return res.status(400).json({ success: false, error: 'disabledProviders must only contain known provider ids' });
      }
      if (manualOverrideProvider !== undefined && manualOverrideProvider !== null && !KNOWN_PROVIDERS.includes(manualOverrideProvider)) {
        return res.status(400).json({ success: false, error: 'manualOverrideProvider must be a known provider id or null' });
      }
      if (minBalanceThreshold !== undefined && (typeof minBalanceThreshold !== 'number' || minBalanceThreshold < 0)) {
        return res.status(400).json({ success: false, error: 'minBalanceThreshold must be a non-negative number' });
      }

      const before = await ProviderSettings.findOne({ singleton: 'default' });
      const update: any = {};
      if (priorityOrder) update.priorityOrder = priorityOrder;
      if (disabledProviders) update.disabledProviders = disabledProviders;
      if (manualOverrideProvider !== undefined) update.manualOverrideProvider = manualOverrideProvider;
      if (minBalanceThreshold !== undefined) update.minBalanceThreshold = minBalanceThreshold;

      const actor = await getActor(req);
      update.updatedBy = actor.id;
      update.updatedByName = actor.name;

      const after = await ProviderSettings.findOneAndUpdate({ singleton: 'default' }, update, { upsert: true, new: true });
      providerOrchestrator.invalidateSettingsCache();

      AuditLogService.log({
        admin: actor,
        action: 'provider.settings_update',
        targetType: 'system',
        before: before ? { priorityOrder: before.priorityOrder, disabledProviders: before.disabledProviders, manualOverrideProvider: before.manualOverrideProvider, minBalanceThreshold: before.minBalanceThreshold } : null,
        after: { priorityOrder: after.priorityOrder, disabledProviders: after.disabledProviders, manualOverrideProvider: after.manualOverrideProvider, minBalanceThreshold: after.minBalanceThreshold },
        reason: reason || undefined,
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, settings: after });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** POST /api/admin/providers/:name/test — live connection test, actually calls the provider right now. */
  static async testConnection(req: any, res: Response) {
    try {
      const { name } = req.params;
      if (!KNOWN_PROVIDERS.includes(name)) {
        return res.status(400).json({ success: false, error: `Unknown provider: ${name}` });
      }
      const result = await providerOrchestrator.testProviderConnection(name);

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor,
        action: 'provider.test_connection',
        targetType: 'system',
        targetLabel: name,
        after: result,
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, provider: name, result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** GET /api/admin/providers/logs — paginated, filterable API call log. */
  static async getLogs(req: any, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 25));
      const filter: any = {};
      if (req.query.provider) filter.provider = req.query.provider;
      if (req.query.success === 'true') filter.success = true;
      if (req.query.success === 'false') filter.success = false;
      if (req.query.method) filter.method = req.query.method;
      if (req.query.dateFrom || req.query.dateTo) {
        filter.createdAt = {};
        if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
      }

      const [logs, total] = await Promise.all([
        ProviderCallLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
        ProviderCallLog.countDocuments(filter),
      ]);

      res.json({ success: true, logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
