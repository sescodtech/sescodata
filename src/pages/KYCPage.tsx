import { useMemo, useState } from 'react';
import {
  ShieldCheck, User as UserIcon, Camera, Calendar, Phone, Mail, MapPin,
  Briefcase, Users, CreditCard, Lock, CheckCircle2, Clock3, XCircle, FileText, Info, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Input from '../components/ui/Input';
import { cn } from '../lib/utils';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2; description: string }> = {
  not_started: { label: 'Not Started', icon: FileText, className: 'bg-gray-100 text-gray-600 border-gray-200', description: "You haven't started identity verification yet." },
  pending:     { label: 'Pending Review', icon: Clock3, className: 'bg-amber-50 text-amber-700 border-amber-200', description: 'Your details are submitted and awaiting review.' },
  verified:    { label: 'Verified', icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200', description: 'Your identity has been verified.' },
  rejected:    { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200', description: 'Your last submission was rejected. You can resubmit once verification is available.' },
};

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

function Section({ icon: Icon, title, step, total, done, children }: { icon: typeof CheckCircle2; title: string; step?: number; total?: number; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="shb-card p-3.5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="shb-section-title flex items-center gap-1.5">
          {step != null && (
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                done ? 'bg-green-500 text-white' : 'bg-shb-gold-soft text-shb-gold-dark',
              )}
            >
              {done ? <Check size={11} /> : step}
            </span>
          )}
          <Icon size={14} className="text-shb-gold-dark" /> {title}
        </h3>
        {step != null && total != null && <span className="text-[10.5px] font-bold text-gray-400 shrink-0">Step {step} of {total}</span>}
      </div>
      {children}
    </div>
  );
}

// Compact horizontal progress timeline across the verification stages — gives the
// "status timeline" the redesign asked for without a heavy stepper component.
function VerificationTimeline({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-colors',
                i < activeIndex ? 'bg-green-500 border-green-500 text-white'
                  : i === activeIndex ? 'bg-shb-gold border-shb-gold text-white'
                  : 'bg-white border-gray-200 text-gray-300',
              )}
            >
              {i < activeIndex ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn('text-[9.5px] font-bold text-center leading-tight max-w-[52px]', i <= activeIndex ? 'text-gray-700' : 'text-gray-300')}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('h-0.5 flex-1 mx-1 rounded-full', i < activeIndex ? 'bg-green-500' : 'bg-gray-100')} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function KYCPage() {
  useDocumentTitle('Identity Verification');
  const { user } = useAuth();

  const status = user?.kycStatus || 'not_started';
  const meta = STATUS_META[status] ?? STATUS_META.not_started;
  const StatusIcon = meta.icon;

  // Preview-only form state — nothing here is persisted; see KYC_BACKEND_REQUIREMENTS.md.
  const [fullName] = useState(user?.name || '');
  const [phone] = useState(user?.phone || '');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [lga, setLga] = useState('');
  const [occupation, setOccupation] = useState('');
  const [nokName, setNokName] = useState('');
  const [nokPhone, setNokPhone] = useState('');
  const [nokRelationship, setNokRelationship] = useState('');
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');

  const canSubmit = false; // No backend endpoint exists yet.

  // Real-time completion progress across the four groups — gives the "verification
  // progress" experience even though submission itself isn't wired up yet.
  const groups = useMemo(() => [
    !!dob && !!gender && !!occupation,
    !!address && !!stateVal && !!lga,
    !!nokName && !!nokPhone && !!nokRelationship,
    bvn.length === 11 && nin.length === 11,
  ], [dob, gender, occupation, address, stateVal, lga, nokName, nokPhone, nokRelationship, bvn, nin]);

  const progress = useMemo(() => {
    const done = groups.filter(Boolean).length;
    return { done, total: groups.length, pct: Math.round((done / groups.length) * 100) };
  }, [groups]);

  // Timeline index: Personal Details -> Address -> Next of Kin -> Identification -> Review.
  const timelineSteps = ['Personal', 'Address', 'Next of Kin', 'ID Numbers', 'Review'];
  const activeStepIndex = status === 'verified' ? timelineSteps.length : groups.filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto space-y-3 content-reveal pb-8 px-3.5 sm:px-0">
      <PageHeader title="Verification" description="Unlock higher transaction limits." icon={ShieldCheck} backTo="/app" />

      {/* Status card with progress bar */}
      <div className="shb-card p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', meta.className)}>
            <StatusIcon size={12} /> {meta.label}
          </span>
          <span className="text-[11px] font-bold text-gray-400">{progress.done}/{progress.total} sections</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-3.5">
          <div className="h-full bg-shb-gold rounded-full transition-all" style={{ width: `${progress.pct}%` }} />
        </div>

        <div className="mb-3">
          <VerificationTimeline steps={timelineSteps} activeIndex={activeStepIndex} />
        </div>

        <p className="text-[12px] text-gray-500 leading-relaxed">{meta.description}</p>
        <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-start gap-2 text-[11px] text-gray-400">
          <Info size={12} className="shrink-0 mt-0.5" />
          Identity verification is coming soon. You'll be able to complete and submit this form once it's available.
        </div>
      </div>

      {/* Profile photo */}
      <Section icon={Camera} title="Profile Photo">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[13px] font-black border-2 border-white shrink-0 bg-gradient-to-br from-shb-gold to-shb-gold-dark" style={{ boxShadow: 'var(--shadow-gold)' }}>
            {fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || <UserIcon size={18} />}
          </div>
          <div>
            <button type="button" disabled className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-bold text-gray-400 cursor-not-allowed">
              Upload Photo
            </button>
            <p className="text-[10.5px] text-gray-400 mt-1">Photo upload will be available soon.</p>
          </div>
        </div>
      </Section>

      <Section icon={UserIcon} title="Personal Details" step={1} total={4} done={groups[0]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Input label="Full Name" icon={<UserIcon size={14} />} value={fullName} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" hint="Synced from Settings" />
          <Input label="Email Address" icon={<Mail size={14} />} value={user?.email ?? ''} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
          <Input label="Phone Number" icon={<Phone size={14} />} value={phone} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" hint="Synced from Settings" />
          <Input label="Date of Birth" icon={<Calendar size={14} />} type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={!canSubmit} />
          <div className="space-y-1">
            <label className="text-[12.5px] font-semibold text-gray-600 block">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={!canSubmit} className="shb-input pl-3.5 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <Input label="Occupation" icon={<Briefcase size={14} />} value={occupation} onChange={(e) => setOccupation(e.target.value)} disabled={!canSubmit} placeholder="e.g. Software Developer" />
        </div>
      </Section>

      <Section icon={MapPin} title="Residential Address" step={2} total={4} done={groups[1]}>
        <div className="grid grid-cols-1 gap-2.5">
          <Input label="Street Address" icon={<MapPin size={14} />} value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canSubmit} placeholder="House number, street, area" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-gray-600 block">State</label>
              <select value={stateVal} onChange={(e) => setStateVal(e.target.value)} disabled={!canSubmit} className="shb-input pl-3.5 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="LGA" value={lga} onChange={(e) => setLga(e.target.value)} disabled={!canSubmit} placeholder="Local Government Area" />
          </div>
        </div>
      </Section>

      <Section icon={Users} title="Next of Kin" step={3} total={4} done={groups[2]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Input label="Full Name" value={nokName} onChange={(e) => setNokName(e.target.value)} disabled={!canSubmit} />
          <Input label="Phone Number" icon={<Phone size={14} />} value={nokPhone} onChange={(e) => setNokPhone(e.target.value)} disabled={!canSubmit} placeholder="080 1234 5678" />
          <Input label="Relationship" value={nokRelationship} onChange={(e) => setNokRelationship(e.target.value)} disabled={!canSubmit} placeholder="e.g. Sibling, Parent, Spouse" className="sm:col-span-2" />
        </div>
      </Section>

      <Section icon={CreditCard} title="Government Identification" step={4} total={4} done={groups[3]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Input label="BVN" icon={<CreditCard size={14} />} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))} disabled={!canSubmit} placeholder="11-digit BVN" maxLength={11} />
          <Input label="NIN" icon={<CreditCard size={14} />} value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))} disabled={!canSubmit} placeholder="11-digit NIN" maxLength={11} />
        </div>
        <p className="text-[11px] text-gray-400 mt-2.5 flex items-start gap-1.5">
          <Lock size={12} className="shrink-0 mt-0.5" />
          Verified against NIBSS/NIMC through a licensed provider once integrated — never stored in plain text.
        </p>
      </Section>

      <div className="flex justify-end pt-1">
        <button type="button" disabled className="shb-btn-primary px-6 opacity-50 cursor-not-allowed" title="Verification submissions aren't available yet">
          Submit for Verification
        </button>
      </div>
    </div>
  );
}
