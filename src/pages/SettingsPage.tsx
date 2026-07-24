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
import { useDocumentTitle } from '../lib/useDocumentTitle';

type Tab = 'profile' | 'security' | 'preferences';

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile Info', icon: UserIcon },
    { id: 'security' as Tab, label: 'Security & Password', icon: Lock },
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
    // Matches the backend's 8-character minimum (AuthController.changePassword).
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
    <div className="max-w-4xl mx-auto space-y-5 content-reveal pb-12">
      <PageHeader title="Account Settings" description="Manage your personal information and security settings." />

      <div className="flex flex-col md:flex-row gap-5 md:gap-6">
        {/* Tabs */}
        <aside className="w-full md:w-56 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200',
                activeTab === tab.id ? 'bg-shb-navy text-white' : 'text-gray-500 hover:bg-white hover:text-gray-900',
              )}
              style={activeTab === tab.id ? { boxShadow: 'var(--shadow-pop)' } : undefined}
            >
              <tab.icon size={17} />
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 space-y-4 min-w-0">
          <div className="shb-card overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-4 sm:p-5">
                  <div className="flex flex-col items-center md:items-start mb-5">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black border-4 border-white bg-gradient-to-br from-shb-gold to-shb-gold-dark" style={{ boxShadow: 'var(--shadow-gold)' }}>
                      {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="mt-3.5 text-center md:text-left">
                      <h3 className="shb-section-title text-lg">{user?.name}</h3>
                      <p className="text-gray-500 text-sm">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Full Name" icon={<UserIcon size={16} />} type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                    <Input label="Email Address" icon={<Mail size={16} />} type="email" value={user?.email ?? ''} disabled className="bg-gray-100 text-gray-400 cursor-not-allowed" hint="Contact support to change your email" />
                    <Input label="Phone Number" icon={<Phone size={16} />} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080 1234 5678" autoComplete="tel" />
                  </div>

                  <AnimatePresence>
                    {profileMsg && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className={cn('mt-5 p-3 rounded-xl text-sm font-medium flex items-center gap-2', profileMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}
                        role={profileMsg.type === 'err' ? 'alert' : 'status'}>
                        {profileMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {profileMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-6 pt-5 border-t border-gray-50 flex justify-end">
                    <Button onClick={handleSaveProfile} loading={profileSaving} icon={!profileSaving ? <Save size={17} /> : undefined}>
                      {profileSaving ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-4 sm:p-6 space-y-7">
                  <div>
                    <h3 className="shb-section-title mb-3 flex items-center gap-2">
                      <Shield size={17} className="text-shb-gold-dark" />
                      Two-Factor Authentication
                    </h3>
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Coming soon</p>
                        <p className="text-xs text-gray-500 mt-0.5">2FA isn't available yet — your account is currently secured by password only.</p>
                      </div>
                      <button disabled className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg text-xs font-bold cursor-not-allowed shrink-0">Enable</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="shb-section-title flex items-center gap-2">
                      <Lock size={17} className="text-shb-gold-dark" />
                      Change Password
                    </h3>
                    <div className="space-y-4">
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
                        className={cn('p-3 rounded-xl text-sm font-medium flex items-center gap-2', passwordMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}
                        role={passwordMsg.type === 'err' ? 'alert' : 'status'}>
                        {passwordMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {passwordMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-1 flex justify-end">
                    <Button onClick={handleChangePassword} loading={passwordSaving} disabled={!currentPassword || !newPassword}>
                      Update Password
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'preferences' && (
                <motion.div key="preferences" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-4 sm:p-6 space-y-4">
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-500 leading-relaxed">
                    Notification preferences aren't wired to a backend yet — toggles here won't persist. Check the{' '}
                    <a href="/app/notifications" className="text-shb-gold-dark font-bold hover:underline">Notifications</a> tab for real activity from your account.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sign out */}
          <div className="shb-card-sm !p-4 sm:!p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-gray-900 font-bold text-sm">Sign out</h3>
              <p className="text-gray-500 text-xs mt-0.5">End your session on this device.</p>
            </div>
            <button onClick={logout} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all duration-200 flex items-center gap-2">
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
