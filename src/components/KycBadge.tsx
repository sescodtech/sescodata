import { ShieldCheck, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Account tier badge. Tier is derived from kycStatus, not a separate field —
 * 'verified' KYC = Verified tier, anything else = Basic. Matches the backend
 * logic in server/src/config/accountTiers.ts.
 */
export default function KycBadge({ kycStatus, className }: { kycStatus?: string; className?: string }) {
  const isVerified = kycStatus === 'verified';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0',
        isVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200',
        className,
      )}
    >
      {isVerified ? <ShieldCheck size={11} /> : <Shield size={11} />}
      {isVerified ? 'Verified' : 'Basic'}
    </span>
  );
}
