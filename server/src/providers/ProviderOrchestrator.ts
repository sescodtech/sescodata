import { IProvider, ProviderResponse } from './IProvider';
import { GladTidingsProvider } from './GladTidingsProvider';
import { ProviderCallLog } from '../models/ProviderCallLog';
import { ProviderSettings } from '../models/ProviderSettings';

// GladTidings-only launch: this is the only provider. No failover loop —
// purchases call GladTidingsProvider directly (see executePurchase below).
function logProviderCall(entry: { provider: string; method: string; success: boolean; durationMs: number; error?: string }) {
  ProviderCallLog.create(entry).catch(() => {});
}

export class ProviderOrchestrator {
  private gladtidings = new GladTidingsProvider();
  private settingsCache: { data: any; expiresAt: number } | null = null;

  async getSettings() {
    if (this.settingsCache && this.settingsCache.expiresAt > Date.now()) {
      return this.settingsCache.data;
    }
    let doc = await ProviderSettings.findOne({ singleton: 'default' });
    if (!doc) {
      doc = await ProviderSettings.create({ singleton: 'default', priorityOrder: ['gladtidings'] });
    }
    const data = {
      priorityOrder: doc.priorityOrder?.length ? doc.priorityOrder : ['gladtidings'],
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

  private isEnabled(settings: any): boolean {
    if (settings.manualOverrideProvider) return settings.manualOverrideProvider === 'gladtidings';
    return !settings.disabledProviders.includes('gladtidings');
  }

  /** Admin dashboard health check — live getBalance() call, same one used before every purchase. */
  async getProviderHealth() {
    const settings = await this.getSettings();
    const disabled = !this.isEnabled(settings);
    try {
      const balanceCheck = await this.gladtidings.getBalance();
      const healthy = balanceCheck.success && balanceCheck.balance >= settings.minBalanceThreshold;
      return [{
        name: 'gladtidings',
        status: !balanceCheck.success ? 'offline' as const : healthy ? 'healthy' as const : 'low_balance' as const,
        balance: balanceCheck.success ? balanceCheck.balance : 0,
        healthy,
        disabled,
        minBalance: settings.minBalanceThreshold,
        error: balanceCheck.error,
      }];
    } catch (e: any) {
      return [{ name: 'gladtidings', status: 'offline' as const, balance: 0, healthy: false, disabled, minBalance: settings.minBalanceThreshold, error: e.message }];
    }
  }

  /** Admin "Test Connection" button — live call, not cached. */
  async testProviderConnection(providerName: string) {
    if (providerName !== 'gladtidings') return { success: false, error: `Unknown provider: ${providerName}` };
    const startedAt = Date.now();
    try {
      const result = await this.gladtidings.getBalance();
      const durationMs = Date.now() - startedAt;
      logProviderCall({ provider: 'gladtidings', method: 'testConnection', success: result.success, durationMs, error: result.success ? undefined : result.error });
      return { success: result.success, balance: result.balance, error: result.error, durationMs };
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;
      logProviderCall({ provider: 'gladtidings', method: 'testConnection', success: false, durationMs, error: e.message });
      return { success: false, error: e.message, durationMs };
    }
  }

  /** Direct GladTidings call for a purchase — no failover, no loop. */
  async executePurchase(serviceType: keyof IProvider, params: any): Promise<ProviderResponse> {
    const settings = await this.getSettings();
    const genericError = 'Transaction could not be completed at the moment. Please try again shortly.';

    if (!this.isEnabled(settings)) {
      return { success: false, error: genericError, failReason: 'config_error', data: {} };
    }

    const balanceCheck = await this.gladtidings.getBalance();
    if (!balanceCheck.success || balanceCheck.balance < settings.minBalanceThreshold) {
      console.log(`[purchase] balance check failed: success=${balanceCheck.success} balance=${balanceCheck.balance} error=${balanceCheck.error || 'none'} minRequired=${settings.minBalanceThreshold}`);
      return { success: false, error: genericError, failReason: 'config_error', data: { error: balanceCheck.error } };
    }

    const startedAt = Date.now();
    try {
      const result = await (this.gladtidings as any)[serviceType](params);
      const durationMs = Date.now() - startedAt;
      console.log(`[purchase] method=${String(serviceType)} durationMs=${durationMs} success=${!!result.success} reference=${result.reference || 'none'}`);
      logProviderCall({ provider: 'gladtidings', method: serviceType, success: !!result.success, durationMs, error: result.success ? undefined : result.error });
      if (result.success) return { ...result, usedProvider: 'gladtidings' };
      return { success: false, error: genericError, failReason: result.failReason, data: { rawError: result.error } };
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;
      console.log(`[purchase] method=${String(serviceType)} durationMs=${durationMs} EXCEPTION status=${e.response?.status || 'n/a'} message=${e.message}`);
      logProviderCall({ provider: 'gladtidings', method: serviceType, success: false, durationMs, error: e.message });
      return { success: false, error: genericError, failReason: 'network_error', data: { rawError: e.message } };
    }
  }
}

export const providerOrchestrator = new ProviderOrchestrator();
