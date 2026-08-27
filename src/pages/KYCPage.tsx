import { useState } from 'react';
import { ShieldCheck, CreditCard, CheckCircle2, Clock3, XCircle, FileText, Info, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { kyc } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Input from '../components/ui/Input';
import { cn } from '../lib/utils';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2; description: string }> = {
  not_started: { label: 'Basic (Not Verified)', icon: FileText, className: 'bg-gray-100 text-gray-600 border-gray-200', description: 'Submit your BVN and NIN to upgrade to a Verified account with higher transaction limits.' },
  pending:     { label: 'Pending Review', icon: Clock3, className: 'bg-amber-50 text-amber-700 border-amber-200', description: 'Your BVN and NIN are submitted and awaiting admin review.' },
  verified:    { label: 'Verified', icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200', description: 'Your identity has been verified. You have higher transaction limits.' },
  rejected:    { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200', description: 'Your last submission was rejected. Review the reason below and resubmit.' },
};

/** Simple KYC: BVN + NIN only. No document/photo uploads, no third-party storage. */
export default function KYCPage() {
  useDocumentTitle('Identity Verification');
  const { user, refreshUser } = useAuth();

  const status = user?.kycStatus || 'not_started';
  const meta = STATUS_META[status] ?? STATUS_META.not_started;
  const StatusIcon = meta.icon;
  const rejectionReason = user?.kycRejectionReason;

  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = status === 'not_started' || status === 'rejected';
  const isValid = bvn.length === 11 && nin.length === 11;

  const handleSubmit = async () => {
    if (!isValid) { setError('BVN and NIN must both be exactly 11 digits.'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      await kyc.submit(bvn, nin);
      await refreshUser();
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3 content-reveal pb-8 px-3.5 sm:px-0">
      <PageHeader title="Verification" description="Unlock higher transaction limits." icon={ShieldCheck} backTo="/app" />

      {/* Status card */}
      <div className="shb-card p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', meta.className)}>
            <StatusIcon size={12} /> {meta.label}
          </span>
        </div>
        <p className="text-[12px] text-gray-500 leading-relaxed">{meta.description}</p>
        {status === 'rejected' && rejectionReason && (
          <p className="text-[12px] text-red-600 mt-2 italic">"{rejectionReason}"</p>
        )}
        <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-start gap-2 text-[11px] text-gray-400">
          <Info size={12} className="shrink-0 mt-0.5" />
          Basic accounts have a lower per-transaction limit. Verified accounts (BVN + NIN reviewed by our team) get a higher limit.
        </div>
      </div>

      {canSubmit && !submitted && (
        <div className="shb-card p-3.5">
          <h3 className="shb-section-title flex items-center gap-1.5 mb-3">
            <CreditCard size={14} className="text-shb-gold-dark" /> Identification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              label="BVN"
              icon={<CreditCard size={14} />}
              value={bvn}
              onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="11-digit BVN"
              maxLength={11}
            />
            <Input
              label="NIN"
              icon={<CreditCard size={14} />}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="11-digit NIN"
              maxLength={11}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-2.5 flex items-start gap-1.5">
            <Lock size={12} className="shrink-0 mt-0.5" />
            Reviewed manually by our team. We only store your BVN and NIN — no documents or photos are collected.
          </p>
          {error && <p className="text-[12px] text-red-600 font-semibold mt-2.5">{error}</p>}

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="shb-btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting…' : 'Submit for Verification'}
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="shb-card p-3.5 text-center">
          <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
          <p className="text-[13px] font-bold text-gray-900">Submitted for review</p>
          <p className="text-[12px] text-gray-500 mt-1">We'll email you once your verification has been reviewed.</p>
        </div>
      )}
    </div>
  );
}
