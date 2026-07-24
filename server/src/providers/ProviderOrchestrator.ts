import { IProvider, ProviderResponse } from './IProvider';
import { JarapointProvider } from './JarapointProvider';
import { CheapDataHubProvider } from './CheapDataHubProvider';
import { GladTidingsProvider } from './GladTidingsProvider';
import { ProviderCallLog } from '../models/ProviderCallLog';
import { ProviderSettings } from '../models/ProviderSettings';

// Single-tenant platform: priority order is a static platform setting.
// Module 6: now DB-backed via ProviderSettings, falling back to this env var
// only if no settings document has ever been saved — so a fresh deploy with
// no admin changes behaves exactly as before.
const ENV_DEFAULT_PRIORITY = (process.env.PROVIDER_PRIORITY || 'gladtidings,cheapdatahub,jarapoint')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

/**
 * Fire-and-forget call logging for future Provider Analytics (Module 6).
 * Never awaited by executeWithFailover's control flow — a logging failure
 * must never affect a real purchase attempt.
 */
function logProviderCall(entry: { provider: string; method: string; success: boolean; durationMs: number; error?: string; failReason?: string }) {
  ProviderCallLog.create(entry).catch(() => {});
}

export class ProviderOrchestrator {
  private providers: Map<string, IProvider> = new Map();
  // Short in-memory cache so every single purchase doesn't hit Mongo just to
  // read settings that change rarely (an admin toggling a provider). 10s is
  // long enough to avoid meaningful load, short enough that a disable/enable
  // takes effect almost immediately.
  private settingsCache: { data: any; expiresAt: number } | null = null;

  constructor() {
    this.providers.set('jarapoint', new JarapointProvider());
    this.providers.set('cheapdatahub', new CheapDataHubProvider());
    this.providers.set('gladtidings', new GladTidingsProvider());
  }

  async getSettings() {
    if (this.settingsCache && this.settingsCache.expiresAt > Date.now()) {
      return this.settingsCache.data;
    }
    let doc = await ProviderSettings.findOne({ singleton: 'default' });
    if (!doc) {
      // First-ever read — seed it from the env var so the DB becomes the
      // source of truth going forward without changing current behavior.
      doc = await ProviderSettings.create({ singleton: 'default', priorityOrder: ENV_DEFAULT_PRIORITY });
    }
    const data = {
      priorityOrder: doc.priorityOrder?.length ? doc.priorityOrder : ENV_DEFAULT_PRIORITY,
      manualOverrideProvider: doc.manualOverrideProvider || null,
      disabledProviders: doc.disabledProviders || [],
      minBalanceThreshold: doc.minBalanceThreshold ?? 500,
    };
    this.settingsCache = { data, expiresAt: Date.now() + 10_000 };
    return data;
  }

  invalidateSettingsCache() {
    this.settingsCache = null;
  }

  /** The actual provider order a live purchase will try right now, honoring manual override + disabled list. */
  private async resolveActiveOrder(): Promise<string[]> {
    const settings = await this.getSettings();
    if (settings.manualOverrideProvider) {
      // Manual override still respects "disabled" — an admin can't force
      // traffic to a provider they've explicitly taken out of rotation.
      return settings.disabledProviders.includes(settings.manualOverrideProvider) ? [] : [settings.manualOverrideProvider];
    }
    return settings.priorityOrder.filter((p: string) => !settings.disabledProviders.includes(p));
  }

  /**
   * Real provider health for the admin dashboard — reuses the exact same
   * provider instances and minBalance threshold that executeWithFailover
   * already checks on every live purchase. Previously the admin endpoint
   * for this returned hardcoded fake data ("Online", "99.9%") regardless
   * of what was actually happening; this calls the real getBalance() on
   * each provider, the same call already made in production on every order.
   * Shows every configured provider (including disabled ones, flagged as
   * such) so the admin sees the full picture, not just the active rotation.
   */
  async getProviderHealth() {
    const settings = await this.getSettings();
    const results = await Promise.all(
      settings.priorityOrder.map(async (name: string) => {
        const provider = this.providers.get(name);
        const disabled = settings.disabledProviders.includes(name);
        if (!provider) return { name, status: 'unconfigured' as const, balance: 0, healthy: false, disabled };
        try {
          const balanceCheck = await provider.getBalance();
          const healthy = balanceCheck.success && balanceCheck.balance >= settings.minBalanceThreshold;
          return {
            name,
            status: !balanceCheck.success ? 'offline' as const : healthy ? 'healthy' as const : 'low_balance' as const,
            balance: balanceCheck.success ? balanceCheck.balance : 0,
            healthy,
            disabled,
            minBalance: settings.minBalanceThreshold,
            error: balanceCheck.error,
          };
        } catch (e: any) {
          return { name, status: 'offline' as const, balance: 0, healthy: false, disabled, minBalance: settings.minBalanceThreshold, error: e.message };
        }
      })
    );
    return results;
  }

  /**
   * Live connection test for a single provider — actually calls its real
   * getBalance() endpoint right now and times it, rather than returning any
   * cached/assumed status. Used by the admin "Test Connection" button.
   */
  async testProviderConnection(providerName: string) {
    const provider = this.providers.get(providerName);
    if (!provider) return { success: false, error: `Unknown provider: ${providerName}` };
    const startedAt = Date.now();
    try {
      const result = await provider.getBalance();
      const durationMs = Date.now() - startedAt;
      logProviderCall({ provider: providerName, method: 'testConnection', success: result.success, durationMs, error: result.success ? undefined : result.error });
      return { success: result.success, balance: result.balance, error: result.error, durationMs };
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;
      logProviderCall({ provider: providerName, method: 'testConnection', success: false, durationMs, error: e.message });
      return { success: false, error: e.message, durationMs };
    }
  }

  async executeWithFailover(
    serviceType: keyof IProvider,
    params: any
  ): Promise<ProviderResponse> {
    const errors: any[] = [];
    const settings = await this.getSettings();
    const activeOrder = await this.resolveActiveOrder();

    if (activeOrder.length === 0) {
      return {
        success: false,
        error: 'No providers are currently enabled',
        failReason: 'config_error',
        data: { errors: [] },
      };
    }

    for (const providerName of activeOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      // 1. Health & balance check
      const balanceCheck = await provider.getBalance();
      if (!balanceCheck.success || balanceCheck.balance < settings.minBalanceThreshold) {
        errors.push({ provider: providerName, error: balanceCheck.error || 'Insufficient balance' });
        continue;
      }

      // 2. Execute operation
      const startedAt = Date.now();
      try {
        const result = await (provider as any)[serviceType](params);
        logProviderCall({ provider: providerName, method: serviceType, success: !!result.success, durationMs: Date.now() - startedAt, error: result.success ? undefined : result.error });
        if (result.success) {
          return { ...result, usedProvider: providerName };
        }
        errors.push({ provider: providerName, error: result.error });
      } catch (e: any) {
        logProviderCall({ provider: providerName, method: serviceType, success: false, durationMs: Date.now() - startedAt, error: e.message });
        errors.push({ provider: providerName, error: e.message });
      }
    }

    return {
      success: false,
      error: 'All available providers failed',
      failReason: 'provider_error',
      data: { errors }
    };
  }
}

export const providerOrchestrator = new ProviderOrchestrator();
