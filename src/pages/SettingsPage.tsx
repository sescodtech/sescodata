import { useState } from 'react';
import { User as UserIcon, Lock, Bell, Shield, Save, CheckCircle2, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth as authApi } from '../lib/api';
import PageHeader from '../components/PageHeader';
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
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'err', text: 'New password must be at least 6 characters.' });
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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 content-reveal pb-12">
      <PageHeader title="Account Settings" description="Manage your personal information and security settings." />

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Tabs */}
        <aside className="w-full md:w-64 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0',
                activeTab === tab.id ? 'bg-shb-navy text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-gray-900',
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 space-y-6 min-w-0">
          <div className="shb-card overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-8">
                  <div className="flex flex-col items-center md:items-start mb-8">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-shb-navy text-3xl font-black border-4 border-white shadow-lg bg-gradient-to-br from-shb-gold-soft to-shb-gold">
                      {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="mt-4 text-center md:text-left">
                      <h3 className="text-xl font-bold text-gray-900 font-display">{user?.name}</h3>
                      <p className="text-gray-500 text-sm">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold focus:bg-white transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                      <input type="email" value={user?.email ?? ''} disabled
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl outline-none font-bold text-gray-400 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080 1234 5678"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold focus:bg-white transition-all font-bold" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {profileMsg && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className={cn('mt-6 p-3 rounded-xl text-sm font-medium flex items-center gap-2',
                          profileMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                        {profileMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {profileMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end">
                    <button onClick={handleSaveProfile} disabled={profileSaving} className="shb-btn-primary px-8 py-3 flex items-center gap-2">
                      {profileSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-8 space-y-8">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield size={20} className="text-shb-gold-dark" />
                      Two-Factor Authentication
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Coming soon</p>
                        <p className="text-xs text-gray-500">2FA isn't available yet — your account is currently secured by password only.</p>
                      </div>
                      <button disabled className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg text-xs font-bold cursor-not-allowed shrink-0">Enable</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Lock size={20} className="text-shb-gold-dark" />
                      Change Password
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Password</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold focus:bg-white transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">New Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold focus:bg-white transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold focus:bg-white transition-all" />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {passwordMsg && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className={cn('p-3 rounded-xl text-sm font-medium flex items-center gap-2',
                          passwordMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                        {passwordMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {passwordMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-2 flex justify-end">
                    <button onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword} className="shb-btn-primary px-8 py-3 flex items-center gap-2">
                      {passwordSaving && <Loader2 className="animate-spin" size={18} />}
                      Update Password
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'preferences' && (
                <motion.div key="preferences" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-8 space-y-6">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-500">
                    Notification preferences aren't wired to a backend yet — toggles here won't persist. Check the{' '}
                    <a href="/app/notifications" className="text-shb-gold-dark font-bold hover:underline">Notifications</a> tab for real activity from your account.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sign out */}
          <div className="shb-card p-5 sm:p-8 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-gray-900 font-bold">Sign out</h3>
              <p className="text-gray-500 text-sm">End your session on this device.</p>
            </div>
            <button onClick={logout} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center gap-2">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
