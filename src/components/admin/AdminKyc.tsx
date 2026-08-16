import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Check, X, Clock3, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, formatDate, type KycSubmission } from '../../lib/api';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600', icon: Clock3 },
  verified: { label: 'Verified', className: 'bg-green-50 text-green-600', icon: CheckCircle2 },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600', icon: XCircle },
};

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
] as const;

export default function AdminKyc() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('pending');
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    setIsLoading(true);
    try {
      const res = await admin.listKyc(status);
      setSubmissions(res.submissions);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load KYC submissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  const handleApprove = async (s: KycSubmission) => {
    if (!window.confirm(`Approve ${s.name}'s verification? Their account will be upgraded to Verified.`)) return;
    setBusyId(s._id);
    try {
      await admin.approveKyc(s._id);
      toast.success(`${s.name} is now Verified`);
      await load(filter);
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (s: KycSubmission) => {
    const reason = window.prompt(`Reason for rejecting ${s.name}'s verification (optional):`) ?? undefined;
    setBusyId(s._id);
    try {
      await admin.rejectKyc(s._id, reason || undefined);
      toast.success(`${s.name}'s verification was rejected`);
      await load(filter);
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="admin-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-0.5 flex-wrap gap-2">
          <h3 className="text-[14px] font-extrabold text-admin-navy flex items-center gap-1.5 font-display">
            <ShieldCheck size={16} className="text-admin-blue" />
            KYC Review
          </h3>
          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100 gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-all',
                  filter === f.id ? 'bg-white text-admin-navy shadow-sm' : 'text-gray-400 hover:text-gray-600',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-gray-500 mb-3.5">
          Simple KYC: BVN + NIN only, no document uploads. Approving upgrades the customer from Basic to Verified with a higher transaction limit.
        </p>

        {isLoading ? (
          <SkeletonList rows={3} />
        ) : submissions.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nothing here" description={`No ${filter === 'all' ? '' : filter} KYC submissions.`} tone="admin" />
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => {
              const meta = STATUS_META[s.kycStatus] || STATUS_META.pending;
              const StatusIcon = meta.icon;
              return (
                <div key={s._id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900 text-[13px] truncate">{s.name}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1', meta.className)}>
                        <StatusIcon size={10} /> {meta.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mb-1.5">{s.email}{s.phone ? ` \u00b7 ${s.phone}` : ''}</p>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 font-mono">
                      <span className="flex items-center gap-1"><CreditCard size={11} /> BVN: {s.bvn || '\u2014'}</span>
                      <span className="flex items-center gap-1"><CreditCard size={11} /> NIN: {s.nin || '\u2014'}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400 mt-1">
                      {s.kycSubmittedAt && <span>Submitted {formatDate(s.kycSubmittedAt)}</span>}
                      {s.kycReviewedAt && <span>Reviewed {formatDate(s.kycReviewedAt)} by {s.kycReviewedBy}</span>}
                    </div>
                    {s.kycStatus === 'rejected' && s.kycRejectionReason && (
                      <p className="text-[11px] text-red-500 italic mt-1">"{s.kycRejectionReason}"</p>
                    )}
                  </div>
                  {s.kycStatus === 'pending' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(s)}
                        disabled={busyId === s._id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-[11.5px] font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(s)}
                        disabled={busyId === s._id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-[11.5px] font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
