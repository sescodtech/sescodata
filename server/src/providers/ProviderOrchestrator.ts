import { IProvider, ProviderResponse } from './IProvider';
import { GladTidingsProvider } from './GladTidingsProvider';
import { ProviderCallLog } from '../models/ProviderCallLog';
import { ProviderSettings } from '../models/ProviderSettings';

// GladTidings-only launch: this is the only provider. No failover loop —
// purchases call GladTidingsProvider directly (see executePurchase below).
function logProviderCall(entry: {
  provider: string;
  method: string;
  success: boolean;
  durationMs: number;
  error?: string;
  failReason?: string;
  reference?: string;
  productId?: string;
  network?: string;
  maskedRecipient?: string;
  providerStatus?: string;
}) {
  ProviderCallLog.create(entry).catch(() => {});
}

/** Masks a phone/recipient value for diagnostics — keeps enough to
 *  recognise the number without exposing it in full. Internal/admin use only. */
function maskRecipient(value?: string): string | undefined {
  if (!value) return undefined;
  const v = String(value);
  if (v.length <= 5) return '*'.repeat(v.length);
  return `${v.slice(0, 3)}${'*'.repeat(Math.max(v.length - 6, 3))}${v.slice(-3)}`;
}

/** Best-effort extraction of a "network" label from whatever params this
 *  particular provider method received (data/airtime use `network`,
 *  electricity uses `disco`, cable uses `provider`) — diagnostics only. */
function extractNetworkLabel(params: any): string | undefined {
  return params?.network || params?.disco || params?.provider || undefined;
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

    // Diagnostic context available regardless of which branch fails below.
    // Never affects wallet/balance/enable logic — read-only for logging.
    const diagContext = {
      reference: params?.ref,
      productId: params?.productId,
      network: extractNetworkLabel(params),
      maskedRecipient: maskRecipient(params?.phone || params?.meter || params?.smartcard),
    };

    if (!this.isEnabled(settings)) {
      logProviderCall({ provider: 'gladtidings', method: serviceType, success: false, durationMs: 0, error: 'Provider disabled by admin settings', failReason: 'config_error', providerStatus: 'not_attempted', ...diagContext });
      return {
        success: false, error: genericError, failReason: 'config_error',
        data: { rawError: 'Provider disabled by admin settings', providerStatus: 'not_attempted', durationMs: 0, ...diagContext },
      };
    }

    const balanceCheck = await this.gladtidings.getBalance();
    if (!balanceCheck.success || balanceCheck.balance < settings.minBalanceThreshold) {
      const reason = balanceCheck.error || `Provider balance ${balanceCheck.balance} below threshold ${settings.minBalanceThreshold}`;
      logProviderCall({ provider: 'gladtidings', method: serviceType, success: false, durationMs: 0, error: reason, failReason: 'config_error', providerStatus: 'not_attempted', ...diagContext });
      return {
        success: false, error: genericError, failReason: 'config_error',
        data: { rawError: reason, providerStatus: 'not_attempted', durationMs: 0, ...diagContext },
      };
    }

    const startedAt = Date.now();
    try {
      const result = await (this.gladtidings as any)[serviceType](params);
      const durationMs = Date.now() - startedAt;
      logProviderCall({
        provider: 'gladtidings', method: serviceType, success: !!result.success, durationMs,
        error: result.success ? undefined : result.error, failReason: result.success ? undefined : result.failReason,
        providerStatus: result.providerStatus, ...diagContext,
      });
      if (result.success) return { ...result, usedProvider: 'gladtidings' };
      return {
        success: false, error: genericError, failReason: result.failReason,
        data: { rawError: result.error, providerStatus: result.providerStatus, durationMs, ...diagContext },
      };
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;
      logProviderCall({ provider: 'gladtidings', method: serviceType, success: false, durationMs, error: e.message, failReason: 'network_error', providerStatus: 'exception', ...diagContext });
      return {
        success: false, error: genericError, failReason: 'network_error',
        data: { rawError: e.message, providerStatus: 'exception', durationMs, ...diagContext },
      };
    }
  }
}

export const providerOrchestrator = new ProviderOrchestrator();
