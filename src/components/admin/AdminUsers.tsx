import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search, Download, RefreshCw, CheckCircle2, XCircle, Users as UsersIcon,
  ChevronDown, Lock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, formatNaira, formatDate, type AdminUser } from '../../lib/api';
import { exportToCsv } from '../../lib/adminCsvExport';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';
import AdminPagination from './AdminPagination';
import AdminUserDetailDrawer from './AdminUserDetailDrawer';

const STATUS_OPTIONS = ['', 'active', 'suspended'];
const ROLE_OPTIONS = ['', 'customer', 'admin'];
const KYC_OPTIONS = ['', 'not_started', 'pending', 'verified', 'rejected'];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await admin.users({
        page, pageSize, search: search || undefined,
        status: statusFilter || undefined, role: roleFilter || undefined, kycStatus: kycFilter || undefined,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, roleFilter, kycFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter, roleFilter, kycFilter]);

  const toggleSelectAll = () => {
    setSelected(selected.length === users.length ? [] : users.map((u) => u._id));
  };

  const handleBulkStatus = async (status: 'active' | 'suspended') => {
    if (selected.length === 0) return;
    if (!window.confirm(`${status === 'suspended' ? 'Suspend' : 'Activate'} ${selected.length} user(s)?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(selected.map((id) => admin.updateUserStatus(id, status, `Bulk ${status} action`)));
      toast.success(`${selected.length} user(s) updated`);
      setSelected([]);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Bulk update failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExport = () => {
    exportToCsv(
      `sescohub-users-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Locked', 'KYC', 'Wallet Balance', 'Joined'],
      users.map((u) => [u.name, u.email, u.phone || '', u.role, u.status, u.isLocked ? 'Yes' : 'No', u.kycStatus, u.walletBalance, formatDate(u.createdAt)]),
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="admin-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Filters <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button onClick={load} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          </button>
          <button onClick={handleExport} disabled={users.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            {[
              { label: 'Status', value: statusFilter, set: setStatusFilter, options: STATUS_OPTIONS },
              { label: 'Role', value: roleFilter, set: setRoleFilter, options: ROLE_OPTIONS },
              { label: 'KYC', value: kycFilter, set: setKycFilter, options: KYC_OPTIONS },
            ].map((f) => (
              <div key={f.label} className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{f.label}</label>
                <select
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize"
                >
                  {f.options.map((o) => <option key={o} value={o}>{o ? o.replace('_', ' ') : 'All'}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-admin-navy text-white rounded-xl">
          <span className="text-sm font-bold">{selected.length} selected</span>
          <div className="flex gap-2">
            <button onClick={() => handleBulkStatus('active')} disabled={bulkBusy} className="px-3 py-1.5 bg-green-500 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Activate
            </button>
            <button onClick={() => handleBulkStatus('suspended')} disabled={bulkBusy} className="px-3 py-1.5 bg-red-500 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <XCircle size={13} /> Suspend
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <SkeletonList rows={8} />
        ) : users.length === 0 ? (
          <EmptyState tone="admin" icon={UsersIcon} title="No users match your filters" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selected.length === users.length && users.length > 0} onChange={toggleSelectAll} className="rounded" />
                    </th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">KYC</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setDetailUserId(u._id)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.includes(u._id)} onChange={() => setSelected((s) => s.includes(u._id) ? s.filter((id) => id !== u._id) : [...s, u._id])} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black bg-gradient-to-br from-admin-blue to-admin-blue-dark shrink-0">
                            {u.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs truncate flex items-center gap-1.5">
                              {u.name}
                              {u.isLocked && <Lock size={10} className="text-red-500 shrink-0" />}
                              {u.role === 'admin' && <span className="text-[9px] font-black bg-admin-gold text-admin-navy px-1.5 py-0.5 rounded">ADMIN</span>}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 text-xs">{formatNaira(u.walletBalance)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{u.kycStatus.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — real adapted layout, not a shrunken table */}
            <div className="md:hidden divide-y divide-gray-50">
              {users.map((u) => (
                <button key={u._id} onClick={() => setDetailUserId(u._id)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black bg-gradient-to-br from-admin-blue to-admin-blue-dark shrink-0">
                    {u.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-[13px] truncate flex items-center gap-1.5">
                      {u.name}
                      {u.isLocked && <Lock size={10} className="text-red-500 shrink-0" />}
                      {u.role === 'admin' && <span className="text-[9px] font-black bg-admin-gold text-admin-navy px-1.5 py-0.5 rounded shrink-0">ADMIN</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase', u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                        {u.status}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{u.kycStatus.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-xs">{formatNaira(u.walletBalance)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(u.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
            <AdminPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </div>

      <AdminUserDetailDrawer
        userId={detailUserId}
        open={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        onUpdated={load}
      />
    </div>
  );
}
