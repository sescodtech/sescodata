import { useState, useEffect, useCallback } from 'react';
import { Search, Download, AlertCircle, ScrollText, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, formatDate, type AuditLogEntry } from '../../lib/api';
import { SkeletonList } from '../Skeleton';
import EmptyState from '../EmptyState';
import Drawer from '../Drawer';
import { exportToCsv } from '../../lib/adminCsvExport';
import AdminPagination from './AdminPagination';

const ACTION_LABELS: Record<string, string> = {
  'user.suspend': 'User Suspended', 'user.activate': 'User Activated', 'user.role_update': 'Role Changed',
  'user.password_reset': 'Password Reset Sent', 'user.lock': 'Account Locked', 'user.unlock': 'Account Unlocked',
  'wallet.credit': 'Wallet Credited', 'wallet.debit': 'Wallet Debited',
  'settings.branding': 'Branding Updated', 'provider.settings_update': 'Provider Settings Updated', 'provider.test_connection': 'Provider Connection Tested',
};
const actionLabel = (a: string) => ACTION_LABELS[a] || a.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [distinctActions, setDistinctActions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const pageSize = 25;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await admin.auditLogs({
        page, pageSize, search: search || undefined, action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setDistinctActions(res.distinctActions);
    } catch (e: any) {
      setError(e.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, actionFilter, targetTypeFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, actionFilter, targetTypeFilter, dateFrom, dateTo]);

  const handleExport = () => {
    exportToCsv(
      `sescohub-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Admin', 'Action', 'Target', 'Reason', 'IP', 'Date'],
      logs.map((l) => [l.adminName, actionLabel(l.action), l.targetLabel || '', l.reason || '', l.ip || '', formatDate(l.createdAt)]),
    );
  };

  return (
    <div className="space-y-4">
      <div className="admin-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by admin, target, or reason..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm transition-all"
            />
          </div>
          <button onClick={handleExport} disabled={logs.length === 0} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0">
            <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue max-w-[180px]">
              <option value="">All actions</option>
              {distinctActions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target type</label>
            <select value={targetTypeFilter} onChange={(e) => setTargetTypeFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue">
              <option value="">All</option>
              <option value="user">User</option>
              <option value="transaction">Transaction</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue" />
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <SkeletonList rows={8} />
        ) : error ? (
          <EmptyState tone="admin" icon={AlertCircle} title={error} action={<button onClick={load} className="admin-btn-primary text-sm px-4 py-2 mt-2">Retry</button>} />
        ) : logs.length === 0 ? (
          <EmptyState tone="admin" icon={ScrollText} title="No admin actions match your filters" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {logs.map((l) => (
                    <tr key={l._id} onClick={() => setSelected(l)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-admin-blue-soft text-admin-blue flex items-center justify-center shrink-0"><UserIcon size={12} /></div>
                          <span className="font-bold text-gray-900 text-xs">{l.adminName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-admin-blue-soft text-admin-blue">{actionLabel(l.action)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[160px]">{l.targetLabel || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[220px]">{l.reason || '—'}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-50">
              {logs.map((l) => (
                <button key={l._id} onClick={() => setSelected(l)} className="w-full flex items-start gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-admin-blue-soft text-admin-blue flex items-center justify-center shrink-0"><UserIcon size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-[13px]">{l.adminName}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-admin-blue-soft text-admin-blue">{actionLabel(l.action)}</span>
                    {l.targetLabel && <p className="text-[11px] text-gray-500 mt-1 truncate">{l.targetLabel}</p>}
                  </div>
                  <p className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{formatDate(l.createdAt)}</p>
                </button>
              ))}
            </div>
            <AdminPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Audit Log Entry">
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Action</p>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-admin-blue-soft text-admin-blue">{actionLabel(selected.action)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Admin</p>
                <p className="font-bold text-gray-900">{selected.adminName}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                <p className="font-bold text-gray-900">{formatDate(selected.createdAt)}</p>
              </div>
              {selected.targetLabel && (
                <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target</p>
                  <p className="font-bold text-gray-900">{selected.targetLabel}</p>
                </div>
              )}
              {selected.ip && (
                <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">IP Address</p>
                  <p className="font-mono text-gray-700 text-xs">{selected.ip}</p>
                </div>
              )}
            </div>
            {selected.reason && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason</p>
                <p className="text-sm text-gray-700">{selected.reason}</p>
              </div>
            )}
            {(selected.before || selected.after) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected.before && (
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Before</p>
                    <pre className="text-[10px] text-gray-700 whitespace-pre-wrap break-words font-mono">{JSON.stringify(selected.before, null, 2)}</pre>
                  </div>
                )}
                {selected.after && (
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">After</p>
                    <pre className="text-[10px] text-gray-700 whitespace-pre-wrap break-words font-mono">{JSON.stringify(selected.after, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
