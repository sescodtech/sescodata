import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Wallet, Search, ArrowDownLeft, ArrowUpRight, Loader2, History, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, formatNaira, formatDate, type AdminUser, type AdminTransaction, type AuditLogEntry } from '../../lib/api';
import EmptyState from '../EmptyState';
import { SkeletonList, Skeleton } from '../Skeleton';

export default function AdminWallet() {
  const [totalFloat, setTotalFloat] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // User search for quick adjust
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'credit' | 'debit' | null>(null);

  const [adjustments, setAdjustments] = useState<AdminTransaction[]>([]);
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(true);
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await admin.stats();
      setTotalFloat(res.stats.totalWalletBalance);
    } catch {
      // handled by empty state below
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadAdjustments = useCallback(async () => {
    setIsLoadingAdjustments(true);
    try {
      const res = await admin.transactions({ category: 'admin_adjustment', limit: 15 });
      setAdjustments(res.transactions);
    } finally {
      setIsLoadingAdjustments(false);
    }
  }, []);

  const loadAuditTrail = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const res = await admin.auditLogs({ action: 'wallet.credit,wallet.debit', limit: 15 });
      setAuditTrail(res.logs);
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  useEffect(() => { loadOverview(); loadAdjustments(); loadAuditTrail(); }, [loadOverview, loadAdjustments, loadAuditTrail]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await admin.users({ search: query, pageSize: 6 });
        setResults(res.users);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handleAdjust = async (direction: 'credit' | 'debit') => {
    if (!selectedUser) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (!reason.trim()) return toast.error('A reason is required');
    if (!window.confirm(`${direction === 'credit' ? 'Credit' : 'Debit'} ${selectedUser.name}'s wallet by ${formatNaira(amt)}?\n\nReason: ${reason.trim()}`)) return;
    setBusy(direction);
    try {
      const fn = direction === 'credit' ? admin.creditWallet : admin.debitWallet;
      const res = await fn(selectedUser._id, amt, reason.trim());
      toast.success(res.message);
      setAmount(''); setReason(''); setSelectedUser(null); setQuery('');
      loadOverview(); loadAdjustments(); loadAuditTrail();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${direction} wallet`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Wallet Overview */}
      <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden bg-gradient-to-br from-admin-navy to-admin-navy-2">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-admin-blue/15 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-admin-gold" />
            <p className="text-admin-gold text-sm font-semibold">Total Platform Wallet Float</p>
          </div>
          {isLoadingStats ? (
            <Skeleton className="h-10 w-48 bg-white/10" />
          ) : (
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">{formatNaira(totalFloat ?? 0)}</p>
          )}
          <p className="text-gray-300 text-sm mt-2">Sum of every customer's wallet balance — a business liability, not revenue.</p>
        </div>
      </div>

      {/* Quick Credit/Debit */}
      <div className="admin-card p-5 sm:p-7">
        <h3 className="font-extrabold text-gray-900 font-display mb-4">Credit / Debit a Wallet</h3>

        {selectedUser ? (
          <div className="flex items-center justify-between p-3 bg-admin-blue-soft border border-admin-blue/20 rounded-xl mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black bg-gradient-to-br from-admin-blue to-admin-blue-dark">
                {selectedUser.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedUser.name}</p>
                <p className="text-xs text-gray-500">{selectedUser.email} · {formatNaira(selectedUser.walletBalance)}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedUser(null); setQuery(''); }} className="text-xs font-bold text-gray-400 hover:text-gray-600">Change</button>
          </div>
        ) : (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a user by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm"
            />
            {isSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                {results.map((u) => (
                  <button key={u._id} onClick={() => { setSelectedUser(u); setResults([]); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left">
                    <UserIcon size={14} className="text-gray-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₦)"
            className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-admin-blue" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, logged to audit trail)"
            className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-admin-blue" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleAdjust('credit')} disabled={!selectedUser || !!busy} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
            {busy === 'credit' ? <Loader2 size={15} className="animate-spin" /> : <ArrowDownLeft size={15} />} Credit Wallet
          </button>
          <button onClick={() => handleAdjust('debit')} disabled={!selectedUser || !!busy} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
            {busy === 'debit' ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={15} />} Debit Wallet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Adjustment History */}
        <div className="admin-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-50 flex items-center gap-2">
            <History size={16} className="text-admin-blue" />
            <h3 className="font-extrabold text-gray-900 font-display">Adjustment History</h3>
          </div>
          {isLoadingAdjustments ? (
            <SkeletonList rows={4} />
          ) : adjustments.length === 0 ? (
            <EmptyState tone="admin" icon={History} title="No manual adjustments yet" />
          ) : (
            <div className="divide-y divide-gray-50">
              {adjustments.map((a) => {
                const user = typeof a.userId === 'object' ? a.userId : null;
                return (
                  <div key={a._id} className="flex items-center justify-between px-4 sm:px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{user?.name || user?.email || 'Customer'}</p>
                      <p className="text-[11px] text-gray-400">{formatDate(a.createdAt)}</p>
                    </div>
                    <p className={cn('text-xs font-bold shrink-0 ml-2', a.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                      {a.amount > 0 ? '+' : ''}{formatNaira(Math.abs(a.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Wallet Audit Trail */}
        <div className="admin-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-50 flex items-center gap-2">
            <ShieldCheck size={16} className="text-admin-blue" />
            <h3 className="font-extrabold text-gray-900 font-display">Wallet Audit Trail</h3>
          </div>
          {isLoadingAudit ? (
            <SkeletonList rows={4} />
          ) : auditTrail.length === 0 ? (
            <EmptyState tone="admin" icon={ShieldCheck} title="No wallet adjustments logged yet" />
          ) : (
            <div className="divide-y divide-gray-50">
              {auditTrail.map((log) => (
                <div key={log._id} className="px-4 sm:px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-900">{log.action === 'wallet.credit' ? 'Credit' : 'Debit'} · {log.targetLabel}</p>
                    <p className="text-[11px] text-gray-400">{formatDate(log.createdAt)}</p>
                  </div>
                  {log.reason && <p className="text-[11px] text-gray-500 mt-0.5">{log.reason}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">by {log.adminName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
