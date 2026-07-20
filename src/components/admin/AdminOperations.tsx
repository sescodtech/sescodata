import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search, RefreshCw, ChevronDown, AlertOctagon, Clock, ShieldCheck,
  ArrowDownLeft, ShoppingCart, TrendingUp, Percent, RotateCcw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { adminOperations, formatNaira, formatDate, type OperationsTransaction, type OperationsStats } from '../../lib/api';
import EmptyState from '../EmptyState';
import { SkeletonList, Skeleton } from '../Skeleton';
import StatusBadge from '../StatusBadge';
import AdminPagination from './AdminPagination';
import AdminOperationsDrawer from './AdminOperationsDrawer';
import ConfirmActionDialog from './ConfirmActionDialog';

type QueueTab = 'FAILED' | 'PENDING' | 'MANUAL_REVIEW';
const CATEGORY_OPTIONS = ['', 'data', 'airtime', 'cable', 'electricity', 'education', 'recharge'];
const PROVIDER_OPTIONS = ['', 'gladtidings', 'cheapdatahub', 'jarapoint'];

function StatCard({ label, value, sub, icon: Icon, tone = 'blue' }: { label: string; value: string; sub?: string; icon: any; tone?: 'blue' | 'red' | 'amber' | 'green' | 'gold' }) {
  const toneClasses: Record<string, string> = {
    blue: 'bg-admin-blue-soft text-admin-blue',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    gold: 'bg-admin-gold-soft text-admin-gold',
  };
  return (
    <div className="admin-card p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', toneClasses[tone])}>
        <Icon size={16} />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-extrabold text-admin-navy font-display">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminOperations() {
  const [tab, setTab] = useState<QueueTab>('FAILED');
  const [txns, setTxns] = useState<OperationsTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await adminOperations.stats();
      setStats(res.stats);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        page, pageSize, search: search || undefined, category: categoryFilter || undefined,
        provider: providerFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
        status: tab === 'MANUAL_REVIEW' ? (reviewStatusFilter || undefined) : undefined,
      };
      const fn = tab === 'FAILED' ? adminOperations.failedQueue : tab === 'PENDING' ? adminOperations.pendingQueue : adminOperations.manualReviewQueue;
      const res = await fn(filters);
      setTxns(res.transactions);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  }, [tab, page, search, categoryFilter, providerFilter, reviewStatusFilter, dateFrom, dateTo]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => { setPage(1); setSelected([]); }, [tab, search, categoryFilter, providerFilter, reviewStatusFilter, dateFrom, dateTo]);

  const handleRefreshAll = () => { loadStats(); loadQueue(); toast.success('Refreshed'); };

  const eligibleSelected = txns.filter((t) => selected.includes(t._id) && (t.retryEligibility?.eligible ?? tab === 'FAILED'));

  return (
    <div className="space-y-6">
      {/* Dashboard widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {isLoadingStats || !stats ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Failed Transactions" value={stats.failedTransactions.toLocaleString()} icon={AlertOctagon} tone="red" />
            <StatCard label="Pending Reviews" value={stats.pendingReviews.toLocaleString()} icon={ShieldCheck} tone="amber" />
            <StatCard label="Manual Queue" value={stats.manualProcessingQueue.toLocaleString()} icon={Clock} tone="blue" />
            <StatCard label="Retry Success Rate" value={stats.retrySuccessRate !== null ? `${stats.retrySuccessRate}%` : '—'} sub={`${stats.successfulRetries}/${stats.totalRetried} retried`} icon={Percent} tone="green" />
            <StatCard label="Today's Refunds" value={formatNaira(stats.todayRefundsAmount)} sub={`${stats.todayRefundsCount} refund${stats.todayRefundsCount !== 1 ? 's' : ''}`} icon={ArrowDownLeft} tone="gold" />
            <StatCard label="Manual Actions" value={stats.recentManualActions.length.toLocaleString()} sub="recent" icon={TrendingUp} tone="blue" />
          </>
        )}
      </div>

      {/* Queue tabs */}
      <div role="tablist" aria-label="Transaction queue" className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit overflow-x-auto">
        {([
          ['FAILED', 'Failed Queue', AlertOctagon],
          ['PENDING', 'Pending Queue', Clock],
          ['MANUAL_REVIEW', 'Manual Review', ShieldCheck],
        ] as [QueueTab, string, any][]).map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
              tab === id ? 'bg-admin-blue text-white shadow-md' : 'text-gray-500 hover:text-admin-navy hover:bg-gray-50')}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="admin-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reference, product, recipient, or fail reason..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm transition-all" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            Filters <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button onClick={handleRefreshAll} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize">
                {CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o || 'All'}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Provider</label>
              <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize">
                {PROVIDER_OPTIONS.map((o) => <option key={o} value={o}>{o || 'All'}</option>)}
              </select>
            </div>
            {tab === 'MANUAL_REVIEW' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Review Status</label>
                <select value={reviewStatusFilter} onChange={(e) => setReviewStatusFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize">
                  {['', 'pending', 'approved', 'rejected', 'completed'].map((o) => <option key={o} value={o}>{o || 'All'}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue" />
            </div>
          </div>
        )}
      </div>

      {/* Bulk retry bar */}
      {tab === 'FAILED' && selected.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-admin-navy text-white rounded-xl">
          <span className="text-sm font-bold">{selected.length} selected {eligibleSelected.length < selected.length && `(${eligibleSelected.length} retryable)`}</span>
          <button onClick={() => setBulkDialogOpen(true)} disabled={eligibleSelected.length === 0} className="px-3 py-1.5 bg-admin-blue rounded-lg text-xs font-bold hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-1.5">
            <RotateCcw size={13} /> Bulk Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <SkeletonList rows={8} />
        ) : txns.length === 0 ? (
          <EmptyState tone="admin" icon={ShoppingCart} title="Nothing in this queue" description="Transactions matching your filters will show up here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    {tab === 'FAILED' && <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selected.length === txns.length && txns.length > 0} onChange={() => setSelected(selected.length === txns.length ? [] : txns.map((t) => t._id))} className="rounded" />
                    </th>}
                    <th className="px-4 py-3">Transaction</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    {tab === 'FAILED' && <th className="px-4 py-3">Retries</th>}
                    {tab === 'MANUAL_REVIEW' && <th className="px-4 py-3">Review</th>}
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {txns.map((tx) => {
                    const user = typeof tx.userId === 'object' ? tx.userId : null;
                    return (
                      <tr key={tx._id} onClick={() => setDetailId(tx._id)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        {tab === 'FAILED' && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selected.includes(tx._id)} onChange={() => setSelected((s) => s.includes(tx._id) ? s.filter((id) => id !== tx._id) : [...s, tx._id])} className="rounded" />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900 text-xs truncate max-w-[180px]">{tx.product?.name || tx.type}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{tx.paymentReference}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{user?.email || '—'}</td>
                        <td className="px-4 py-3 font-bold text-xs text-gray-900">{formatNaira(Math.abs(tx.amount))}</td>
                        <td className="px-4 py-3"><StatusBadge status={tx.deliveryStatus} /></td>
                        {tab === 'FAILED' && <td className="px-4 py-3 text-xs text-gray-500">{tx.retryCount || 0}</td>}
                        {tab === 'MANUAL_REVIEW' && (
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                              tx.manualReview.status === 'approved' || tx.manualReview.status === 'completed' ? 'bg-green-50 text-green-700' :
                              tx.manualReview.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                              {tx.manualReview.status}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </div>

      <AdminOperationsDrawer transactionId={detailId} open={!!detailId} onClose={() => setDetailId(null)} onUpdated={() => { loadQueue(); loadStats(); }} />

      <ConfirmActionDialog
        open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}
        title={`Bulk Retry ${eligibleSelected.length} Transaction${eligibleSelected.length !== 1 ? 's' : ''}`}
        description="Each transaction is retried one at a time to keep wallet operations safe."
        confirmLabel="Retry All"
        onConfirm={async (reason) => {
          const res = await adminOperations.bulkRetry(eligibleSelected.map((t) => t._id), reason);
          toast.success(res.message);
          setSelected([]);
          loadQueue(); loadStats();
        }}
      />
    </div>
  );
}
