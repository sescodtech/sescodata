import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  User as UserIcon, Wallet, ShieldCheck, Lock, Unlock,
  KeyRound, Bell, StickyNote, Clock, Send, Loader2, ArrowDownLeft,
  ArrowUpRight, CheckCircle2, XCircle, MapPin,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, formatNaira, formatDate, type UserDetailResponse } from '../../lib/api';
import Drawer from '../Drawer';
import StatusBadge from '../StatusBadge';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';

const KYC_META: Record<string, { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  verified: { label: 'Verified', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
};

type Tab = 'overview' | 'wallet' | 'activity' | 'notes';

export default function AdminUserDetailDrawer({
  userId, open, onClose, onUpdated,
}: {
  userId: string | null; open: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState<string | null>(null);

  // Wallet adjustment form
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Note form
  const [noteText, setNoteText] = useState('');

  // Notify form
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await admin.userDetail(userId);
      setData(res);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      setTab('overview');
      load();
    }
  }, [open, userId, load]);

  const refresh = async () => { await load(); onUpdated(); };

  const handleStatusToggle = async () => {
    if (!data) return;
    const next = data.user.status === 'active' ? 'suspended' : 'active';
    const reason = window.prompt(`Reason for ${next === 'suspended' ? 'suspending' : 'activating'} this account:`);
    if (reason === null) return;
    setBusy('status');
    try {
      await admin.updateUserStatus(data.user._id, next, reason || undefined);
      toast.success(`Account ${next === 'suspended' ? 'suspended' : 'activated'}`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    } finally {
      setBusy(null);
    }
  };

  const handleLockToggle = async () => {
    if (!data) return;
    const next = !data.user.isLocked;
    const reason = window.prompt(`Reason for ${next ? 'locking' : 'unlocking'} this account:`);
    if (reason === null) return;
    setBusy('lock');
    try {
      await admin.setUserLock(data.user._id, next, reason || undefined);
      toast.success(`Account ${next ? 'locked' : 'unlocked'}`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update lock state');
    } finally {
      setBusy(null);
    }
  };

  const handleRoleChange = async (role: string) => {
    if (!data) return;
    if (!window.confirm(`Change ${data.user.email}'s role to ${role}?`)) return;
    setBusy('role');
    try {
      await admin.updateUserRole(data.user._id, role);
      toast.success('Role updated');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update role');
    } finally {
      setBusy(null);
    }
  };

  const handleResetPassword = async () => {
    if (!data) return;
    if (!window.confirm(`Send a password reset email to ${data.user.email}?`)) return;
    setBusy('reset');
    try {
      const res = await admin.resetUserPassword(data.user._id);
      toast.success(res.message);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reset email');
    } finally {
      setBusy(null);
    }
  };

  const handleAdjustWallet = async (direction: 'credit' | 'debit') => {
    if (!data) return;
    const amt = Number(adjustAmount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (!adjustReason.trim()) return toast.error('A reason is required');
    if (!window.confirm(`${direction === 'credit' ? 'Credit' : 'Debit'} ${data.user.name}'s wallet by ${formatNaira(amt)}?\n\nReason: ${adjustReason.trim()}`)) return;
    setBusy('adjust');
    try {
      const fn = direction === 'credit' ? admin.creditWallet : admin.debitWallet;
      const res = await fn(data.user._id, amt, adjustReason.trim());
      toast.success(res.message);
      setAdjustAmount(''); setAdjustReason('');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${direction} wallet`);
    } finally {
      setBusy(null);
    }
  };

  const handleAddNote = async () => {
    if (!data || !noteText.trim()) return;
    setBusy('note');
    try {
      await admin.addUserNote(data.user._id, noteText.trim());
      setNoteText('');
      toast.success('Note added');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add note');
    } finally {
      setBusy(null);
    }
  };

  const handleNotify = async () => {
    if (!data || !notifyTitle.trim() || !notifyMessage.trim()) return toast.error('Title and message are required');
    setBusy('notify');
    try {
      const res = await admin.notifyUser(data.user._id, notifyTitle.trim(), notifyMessage.trim());
      toast.success(res.message);
      setNotifyTitle(''); setNotifyMessage('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send notification');
    } finally {
      setBusy(null);
    }
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: UserIcon },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'activity', label: 'Activity', icon: Clock },
    { id: 'notes', label: 'Notes', icon: StickyNote },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Customer Profile">
      {isLoading ? (
        <SkeletonList rows={6} />
      ) : !data ? (
        <EmptyState tone="admin" icon={UserIcon} title="Couldn't load this user" />
      ) : (
        <div className="space-y-5">
          {/* Identity header */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg bg-gradient-to-br from-admin-blue to-admin-blue-dark shrink-0">
              {data.user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-gray-900 truncate">{data.user.name}</p>
              <p className="text-xs text-gray-400 truncate">{data.user.email}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={data.user.status === 'active' ? 'delivered' : 'failed'} />
              {data.user.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                  <Lock size={9} /> Locked
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="Customer profile sections" className="flex gap-1 p-1 bg-gray-50 rounded-xl overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide whitespace-nowrap transition-all',
                  tab === t.id ? 'bg-white text-admin-blue shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <section>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Information</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="font-bold text-gray-900">{data.user.phone || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-bold text-gray-900 capitalize">{data.user.role}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Joined</dt><dd className="font-bold text-gray-900">{formatDate(data.user.createdAt)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Last Login</dt><dd className="font-bold text-gray-900">{data.user.lastLogin ? formatDate(data.user.lastLogin) : 'Never'}</dd></div>
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">KYC Status</dt>
                    <dd>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', KYC_META[data.user.kycStatus]?.className)}>
                        {KYC_META[data.user.kycStatus]?.label}
                      </span>
                    </dd>
                  </div>
                </dl>
                <p className="text-[11px] text-gray-400 mt-2">No identity verification flow is built yet — every account starts at "Not Started."</p>
              </section>

              <section className="pt-4 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction Summary</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Total Spent</p>
                    <p className="font-extrabold text-gray-900">{formatNaira(data.transactionSummary.totalSpent)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Total Orders</p>
                    <p className="font-extrabold text-gray-900">{data.transactionSummary.totalOrders}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-[10px] text-green-600 font-bold uppercase">Delivered</p>
                    <p className="font-extrabold text-green-700">{data.transactionSummary.delivered}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-[10px] text-red-500 font-bold uppercase">Failed</p>
                    <p className="font-extrabold text-red-600">{data.transactionSummary.failed}</p>
                  </div>
                </div>
              </section>

              <section className="pt-4 border-t border-gray-50 space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Actions</p>
                <button onClick={handleStatusToggle} disabled={!!busy} className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50',
                  data.user.status === 'active' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                  {data.user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                  {busy === 'status' ? <Loader2 size={15} className="animate-spin" /> : data.user.status === 'active' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                </button>
                <button onClick={handleLockToggle} disabled={!!busy} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {data.user.isLocked ? 'Unlock Account' : 'Lock Account (Security)'}
                  {busy === 'lock' ? <Loader2 size={15} className="animate-spin" /> : data.user.isLocked ? <Unlock size={15} /> : <Lock size={15} />}
                </button>
                <button onClick={handleResetPassword} disabled={!!busy} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold bg-admin-blue-soft text-admin-blue hover:brightness-95 transition-all disabled:opacity-50">
                  Send Password Reset Email
                  {busy === 'reset' ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                </button>
                {data.user.role !== 'admin' ? (
                  <button onClick={() => handleRoleChange('admin')} disabled={!!busy} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold bg-admin-navy/5 text-admin-navy hover:bg-admin-navy/10 transition-colors disabled:opacity-50">
                    Promote to Admin <ShieldCheck size={15} />
                  </button>
                ) : (
                  <button onClick={() => handleRoleChange('customer')} disabled={!!busy} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
                    Demote to Customer <UserIcon size={15} />
                  </button>
                )}
              </section>

              <section className="pt-4 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Bell size={11} /> Send Notification</p>
                <input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} placeholder="Notification title"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue mb-2" />
                <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} placeholder="Message" rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue resize-none mb-2" />
                <button onClick={handleNotify} disabled={busy === 'notify'} className="admin-btn-primary w-full py-2 text-sm flex items-center justify-center gap-2">
                  {busy === 'notify' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Email Notification
                </button>
              </section>
            </div>
          )}

          {/* WALLET TAB */}
          {tab === 'wallet' && (
            <div className="space-y-5">
              <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-admin-navy to-admin-navy-2">
                <p className="text-admin-gold text-xs font-bold uppercase tracking-widest mb-1">Wallet Balance</p>
                <p className="text-2xl font-extrabold font-display">{formatNaira(data.user.walletBalance)}</p>
              </div>

              <section>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Manual Adjustment</p>
                <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Amount (₦)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue mb-2" />
                <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason (required, logged to audit trail)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleAdjustWallet('credit')} disabled={busy === 'adjust'} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
                    {busy === 'adjust' ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownLeft size={14} />} Credit
                  </button>
                  <button onClick={() => handleAdjustWallet('debit')} disabled={busy === 'adjust'} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                    {busy === 'adjust' ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />} Debit
                  </button>
                </div>
              </section>

              <section className="pt-4 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recent Transactions</p>
                {data.recentTransactions.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No transactions yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.recentTransactions.map((tx) => (
                      <div key={tx._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{tx.product?.name || tx.type}</p>
                          <p className="text-[10px] text-gray-400">{formatDate(tx.createdAt)}</p>
                        </div>
                        <p className={cn('text-xs font-bold shrink-0 ml-2', tx.amount > 0 ? 'text-green-600' : 'text-gray-900')}>
                          {tx.amount > 0 ? '+' : ''}{formatNaira(Math.abs(tx.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ACTIVITY TAB — login history + admin action timeline */}
          {tab === 'activity' && (
            <div className="space-y-5">
              <section>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MapPin size={11} /> Login History</p>
                {data.loginHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No recorded logins yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.loginHistory.map((l) => (
                      <div key={l._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-xs">
                        <span className="text-gray-600 font-mono">{l.ip || 'Unknown IP'}</span>
                        <span className="text-gray-400">{formatDate(l.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="pt-4 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Admin Activity Timeline</p>
                {data.recentActivity.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No admin actions on this account yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentActivity.map((a) => (
                      <div key={a._id} className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-admin-blue mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">{a.action.replace(/[._]/g, ' ')}</p>
                          {a.reason && <p className="text-[11px] text-gray-500">{a.reason}</p>}
                          <p className="text-[10px] text-gray-400">{a.adminName} · {formatDate(a.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* NOTES TAB */}
          {tab === 'notes' && (
            <div className="space-y-4">
              <div>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add an internal note (never visible to the customer)..." rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-blue resize-none mb-2" />
                <button onClick={handleAddNote} disabled={busy === 'note' || !noteText.trim()} className="admin-btn-primary w-full py-2 text-sm flex items-center justify-center gap-2">
                  {busy === 'note' ? <Loader2 size={14} className="animate-spin" /> : <StickyNote size={14} />} Add Note
                </button>
              </div>
              {data.adminNotes.length === 0 ? (
                <EmptyState tone="admin" icon={StickyNote} title="No internal notes yet" />
              ) : (
                <div className="space-y-2">
                  {data.adminNotes.map((n) => (
                    <div key={n._id} className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-800">{n.note}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">{n.adminName} · {formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
