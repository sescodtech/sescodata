import { useState } from 'react';
import {
  ShieldCheck, User as UserIcon, Camera, Calendar, Phone, Mail, MapPin,
  Briefcase, Users, CreditCard, FileText, Lock, CheckCircle2, Clock3, XCircle, Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Input from '../components/ui/Input';
import { cn } from '../lib/utils';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2; description: string }> = {
  not_started: {
    label: 'Not Started', icon: FileText,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    description: "You haven't started identity verification yet.",
  },
  pending: {
    label: 'Pending Review', icon: Clock3,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Your details are submitted and awaiting review.',
  },
  verified: {
    label: 'Verified', icon: CheckCircle2,
    className: 'bg-green-50 text-green-700 border-green-200',
    description: 'Your identity has been verified.',
  },
  rejected: {
    label: 'Rejected', icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
    description: 'Your last submission was rejected. You can resubmit once verification is available.',
  },
};

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

export default function KYCPage() {
  useDocumentTitle('Identity Verification');
  const { user } = useAuth();

  const status = user?.kycStatus || 'not_started';
  const meta = STATUS_META[status] ?? STATUS_META.not_started;
  const StatusIcon = meta.icon;

  // Preview-only form state — nothing here is persisted. See the banner
  // below and KYC_BACKEND_REQUIREMENTS.md for why submission is disabled.
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

  const canSubmit = false; // No backend endpoint exists yet — see banner + requirements doc.

  return (
    <div className="max-w-3xl mx-auto space-y-5 content-reveal pb-12">
      <PageHeader
        title="Identity Verification"
        description="Verify your identity to unlock higher transaction limits."
        icon={ShieldCheck}
        backTo="/app"
        actions={
          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border', meta.className)}>
            <StatusIcon size={13} /> {meta.label}
          </span>
        }
      />

      <div className="shb-card p-4 sm:p-5 flex items-start gap-3 bg-shb-gold-soft/10 border-shb-gold-soft/40">
        <Info size={18} className="text-shb-gold-dark shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600">
          <p className="font-bold text-gray-800 mb-1">This page is a preview of the verification flow.</p>
          <p>
            {meta.description} Submitting documents, BVN, or NIN isn't available yet — this
            platform doesn't have a verification backend wired up. The form below shows exactly
            what verification will look like once that's built, so nothing here is saved or sent anywhere.
          </p>
        </div>
      </div>

      {/* Profile photo */}
      <div className="shb-card p-4 sm:p-5">
        <h3 className="shb-section-title mb-4 flex items-center gap-2">
          <Camera size={16} className="text-shb-gold-dark" /> Profile Photo
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black border-4 border-white bg-gradient-to-br from-shb-gold to-shb-gold-dark shrink-0" style={{ boxShadow: 'var(--shadow-gold)' }}>
            {fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || <UserIcon size={28} />}
          </div>
          <div>
            <button type="button" disabled className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-400 cursor-not-allowed">
              Upload Photo
            </button>
            <p className="text-xs text-gray-400 mt-1.5">Photo upload will be enabled once document storage is configured.</p>
          </div>
        </div>
      </div>

      {/* Personal details */}
      <div className="shb-card p-4 sm:p-5">
        <h3 className="shb-section-title mb-4 flex items-center gap-2">
          <UserIcon size={16} className="text-shb-gold-dark" /> Personal Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" icon={<UserIcon size={16} />} value={fullName} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" hint="Synced from your account — update it in Settings" />
          <Input label="Email Address" icon={<Mail size={16} />} value={user?.email ?? ''} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
          <Input label="Phone Number" icon={<Phone size={16} />} value={phone} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" hint="Synced from your account — update it in Settings" />
          <Input label="Date of Birth" icon={<Calendar size={16} />} type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={!canSubmit} />
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-gray-700 block">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={!canSubmit} className="shb-input pl-4 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <Input label="Occupation" icon={<Briefcase size={16} />} value={occupation} onChange={(e) => setOccupation(e.target.value)} disabled={!canSubmit} placeholder="e.g. Software Developer" />
        </div>
      </div>

      {/* Address */}
      <div className="shb-card p-4 sm:p-5">
        <h3 className="shb-section-title mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-shb-gold-dark" /> Residential Address
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <Input label="Street Address" icon={<MapPin size={16} />} value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canSubmit} placeholder="House number, street, area" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 block">State</label>
              <select value={stateVal} onChange={(e) => setStateVal(e.target.value)} disabled={!canSubmit} className="shb-input pl-4 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="LGA" value={lga} onChange={(e) => setLga(e.target.value)} disabled={!canSubmit} placeholder="Local Government Area" />
          </div>
        </div>
      </div>

      {/* Next of kin */}
      <div className="shb-card p-4 sm:p-5">
        <h3 className="shb-section-title mb-4 flex items-center gap-2">
          <Users size={16} className="text-shb-gold-dark" /> Next of Kin
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" value={nokName} onChange={(e) => setNokName(e.target.value)} disabled={!canSubmit} />
          <Input label="Phone Number" icon={<Phone size={16} />} value={nokPhone} onChange={(e) => setNokPhone(e.target.value)} disabled={!canSubmit} placeholder="080 1234 5678" />
          <Input label="Relationship" value={nokRelationship} onChange={(e) => setNokRelationship(e.target.value)} disabled={!canSubmit} placeholder="e.g. Sibling, Parent, Spouse" className="md:col-span-2" />
        </div>
      </div>

      {/* Government ID */}
      <div className="shb-card p-4 sm:p-5">
        <h3 className="shb-section-title mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-shb-gold-dark" /> Government Identification
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="BVN" icon={<CreditCard size={16} />} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))} disabled={!canSubmit} placeholder="11-digit Bank Verification Number" maxLength={11} />
          <Input label="NIN" icon={<CreditCard size={16} />} value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))} disabled={!canSubmit} placeholder="11-digit National Identification Number" maxLength={11} />
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-start gap-1.5">
          <Lock size={13} className="shrink-0 mt-0.5" />
          BVN and NIN will be verified against NIBSS/NIMC through a licensed verification
          provider once that integration exists — never stored in plain text.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled
          className="shb-btn-primary px-8 opacity-50 cursor-not-allowed"
          title="Verification submissions aren't available yet"
        >
          Submit for Verification
        </button>
      </div>
    </div>
  );
}
