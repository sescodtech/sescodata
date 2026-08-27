/**
 * Two account tiers:
 *  - Basic: default for every new user, no KYC required, capped per-transaction amount.
 *  - Verified: requires an admin-approved KYC submission (BVN + NIN), higher limit.
 *
 * Tier is derived directly from `kycStatus` — there's no separate tier field,
 * so there's exactly one source of truth and no way for the two to drift out
 * of sync.
 */
export type AccountTier = 'basic' | 'verified';

export const BASIC_TRANSACTION_LIMIT = 50_000; // NGN, per purchase
export const VERIFIED_TRANSACTION_LIMIT = 500_000; // NGN, per purchase

export function getAccountTier(kycStatus?: string): AccountTier {
  return kycStatus === 'verified' ? 'verified' : 'basic';
}

export function getTransactionLimit(kycStatus?: string): number {
  return getAccountTier(kycStatus) === 'verified' ? VERIFIED_TRANSACTION_LIMIT : BASIC_TRANSACTION_LIMIT;
}
