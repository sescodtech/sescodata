import { IProvider, ProviderResponse } from './IProvider';
import { JarapointProvider } from './JarapointProvider';
import { CheapDataHubProvider } from './CheapDataHubProvider';
import { GladTidingsProvider } from './GladTidingsProvider';
import { ProviderCallLog } from '../models/ProviderCallLog';

// Single-tenant platform: priority order is a static platform setting (env-overridable),
// not per-tenant config pulled from a Tenant document.
//
// Module 6 note: DB-backed ProviderSettings.priorityOrder exists as a model
// (see models/ProviderSettings.ts) but isn't read here yet — wiring that in,
// plus honoring manualOverrideProvider/disabledProviders, is Module 6's job.
// Today's failover order is unchanged: env var only.
const DEFAULT_PRIORITY = (process.env.PROVIDER_PRIORITY || 'gladtidings,cheapdatahub,jarapoint')
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
  private minBalance = 500;

  constructor() {
    this.providers.set('jarapoint', new JarapointProvider());
    this.providers.set('cheapdatahub', new CheapDataHubProvider());
    this.providers.set('gladtidings', new GladTidingsProvider());
  }

  /**
   * Real provider health for the admin dashboard — reuses the exact same
   * provider instances and minBalance threshold that executeWithFailover
   * already checks on every live purchase. Previously the admin endpoint
   * for this returned hardcoded fake data ("Online", "99.9%") regardless
   * of what was actually happening; this calls the real getBalance() on
   * each provider, the same call already made in production on every order.
   */
  async getProviderHealth() {
    const results = await Promise.all(
      DEFAULT_PRIORITY.map(async (name) => {
        const provider = this.providers.get(name);
        if (!provider) return { name, status: 'unconfigured' as const, balance: 0, healthy: false };
        try {
          const balanceCheck = await provider.getBalance();
          const healthy = balanceCheck.success && balanceCheck.balance >= this.minBalance;
          return {
            name,
            status: !balanceCheck.success ? 'offline' as const : healthy ? 'healthy' as const : 'low_balance' as const,
            balance: balanceCheck.success ? balanceCheck.balance : 0,
            healthy,
            minBalance: this.minBalance,
            error: balanceCheck.error,
          };
        } catch (e: any) {
          return { name, status: 'offline' as const, balance: 0, healthy: false, minBalance: this.minBalance, error: e.message };
        }
      })
    );
    return results;
  }

  async executeWithFailover(
    serviceType: keyof IProvider,
    params: any
  ): Promise<ProviderResponse> {
    const errors: any[] = [];

    for (const providerName of DEFAULT_PRIORITY) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      // 1. Health & balance check
      const balanceCheck = await provider.getBalance();
      if (!balanceCheck.success || balanceCheck.balance < this.minBalance) {
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
