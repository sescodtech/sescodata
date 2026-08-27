import { useState } from 'react';
import { User as UserIcon, Lock, Bell, Shield, Save, CheckCircle2, AlertCircle, LogOut, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth as authApi } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import KycBadge from '../components/KycBadge';
import { useDocumentTitle } from '../lib/useDocumentTitle';

type Tab = 'profile' | 'security' | 'preferences';

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: UserIcon },
    { id: 'security' as Tab, label: 'Security', icon: Lock },
    { id: 'preferences' as Tab, label: 'Preferences', icon: Bell },
  ];

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await authApi.updateProfile({ name, phone });
      await refreshUser();
      setProfileMsg({ type: 'ok', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'ok', text: 'Password changed successfully.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'err', text: err.message || 'Failed to change password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3 content-reveal pb-8 px-3.5 sm:px-0">
      <PageHeader title="Settings" description="Manage your account and security." />

      {/* Compact identity strip — replaces the oversized centered avatar block */}
      <div className="shb-card p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-black border-2 border-white shrink-0 bg-gradient-to-br from-shb-gold to-shb-gold-dark" style={{ boxShadow: 'var(--shadow-gold)' }}>
          {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 text-[13.5px] truncate">{user?.name}</p>
            <KycBadge kycStatus={user?.kycStatus} />
          </div>
          <p className="text-gray-500 text-[12px] truncate">{user?.email}</p>
        </div>
      </div>

      {/* Horizontal segmented tabs */}
      <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] font-bold transition-all',
              activeTab === tab.id ? 'bg-white text-shb-navy shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <tab.icon size={14} />
            <span className="hidden xs:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="shb-card overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Full Name" icon={<UserIcon size={14} />} type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                <Input label="Email Address" icon={<Mail size={14} />} type="email" value={user?.email ?? ''} disabled className="bg-gray-100 text-gray-400 cursor-not-allowed" hint="Contact support to change" />
                <Input label="Phone Number" icon={<Phone size={14} />} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080 1234 5678" autoComplete="tel" />
              </div>

              <AnimatePresence>
                {profileMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className={cn('mt-3 p-2.5 rounded-lg text-[12.5px] font-medium flex items-center gap-2', profileMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}
                    role={profileMsg.type === 'err' ? 'alert' : 'status'}>
                    {profileMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {profileMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                <Button size="sm" onClick={handleSaveProfile} loading={profileSaving} icon={!profileSaving ? <Save size={14} /> : undefined}>
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-3.5 space-y-4">
              <div>
                <h3 className="shb-section-title mb-2 flex items-center gap-1.5">
                  <Shield size={14} className="text-shb-gold-dark" />
                  Two-Factor Authentication
                </h3>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-gray-800">Coming soon</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Your account is currently secured by password only.</p>
                  </div>
                  <button disabled className="px-3 py-1.5 bg-gray-200 text-gray-400 rounded-md text-[11px] font-bold cursor-not-allowed shrink-0">Enable</button>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="shb-section-title flex items-center gap-1.5">
                  <Lock size={14} className="text-shb-gold-dark" />
                  Change Password
                </h3>
                <div className="space-y-2.5">
                  <PasswordInput label="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                  <PasswordInput label="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" minLength={8} />
                  <PasswordInput
                    label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="new-password" minLength={8}
                    error={confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match' : undefined}
                  />
                </div>
              </div>

              <AnimatePresence>
                {passwordMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className={cn('p-2.5 rounded-lg text-[12.5px] font-medium flex items-center gap-2', passwordMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}
                    role={passwordMsg.type === 'err' ? 'alert' : 'status'}>
                    {passwordMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {passwordMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleChangePassword} loading={passwordSaving} disabled={!currentPassword || !newPassword}>
                  Update Password
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div key="preferences" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-3.5">
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-[12.5px] text-gray-500 leading-relaxed">
                Notification preferences aren't wired to a backend yet. Check{' '}
                <a href="/app/notifications" className="text-shb-gold-dark font-bold hover:underline">Notifications</a> for real activity.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign out */}
      <div className="shb-card-sm flex items-center justify-between gap-3">
        <div>
          <h3 className="text-gray-900 font-bold text-[13px]">Sign out</h3>
          <p className="text-gray-500 text-[11.5px] mt-0.5">End your session on this device.</p>
        </div>
        <button onClick={logout} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-[12.5px] hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  );
}
