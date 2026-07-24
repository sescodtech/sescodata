import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid, Ticket, Search, Filter, ChevronDown, X, Send, Lock, Clock3,
  CheckCircle2, XCircle, RotateCcw, UserPlus, Flag, Tag, Trash2, User as UserIcon,
  Wallet, ShoppingCart, History, MessageSquare, StickyNote, AlertTriangle, Mail,
  TrendingUp, CalendarDays, CalendarRange, Timer, ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  adminSupport, formatNaira, formatDate,
  type SupportTicket, type SupportDashboardStats, type SupportTicketListFilters,
  type CustomerSupportContext, type PreviousTicketSummary,
} from '../../lib/api';
import { Skeleton, SkeletonList } from '../Skeleton';
import EmptyState from '../EmptyState';
import Drawer from '../Drawer';
import AdminPagination from './AdminPagination';

// ============================================================
// Constants
// ============================================================

const STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  open: { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  in_progress: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', className: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-500' },
  medium: { label: 'Medium', className: 'bg-blue-50 text-blue-600' },
  high: { label: 'High', className: 'bg-orange-50 text-orange-600' },
  urgent: { label: 'Urgent', className: 'bg-red-50 text-red-600' },
};

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing', technical: 'Technical', account: 'Account', transaction: 'Transaction', general: 'General',
};

const STATUS_OPTIONS = ['', 'open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['', 'low', 'medium', 'high', 'urgent'];
const CATEGORY_OPTIONS = ['', 'billing', 'technical', 'account', 'transaction', 'general'];

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.open;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', m.className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide', m.className)}>{m.label}</span>;
}

// ============================================================
// Dashboard
// ============================================================

function KpiCard({ label, value, icon: Icon, tone = 'blue' }: { label: string; value: string; icon: any; tone?: 'blue' | 'amber' | 'green' | 'red' | 'navy' | 'gold' }) {
  const toneClasses: Record<string, string> = {
    blue: 'bg-admin-blue-soft text-admin-blue',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    navy: 'bg-admin-navy/5 text-admin-navy',
    gold: 'bg-admin-gold-soft text-admin-gold',
  };
  return (
    <div className="admin-card p-4 sm:p-5">
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-3', toneClasses[tone])}>
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-extrabold text-gray-900 tracking-tight font-display">{value}</p>
    </div>
  );
}

function SupportDashboard() {
  const [stats, setStats] = useState<SupportDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminSupport.dashboard()
      .then((res) => setStats(res.stats))
      .catch((e: any) => toast.error(e.message || 'Failed to load support dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiCard label="Total Tickets" value={String(stats.totalTickets)} icon={Ticket} tone="blue" />
      <KpiCard label="Open" value={String(stats.openTickets)} icon={MessageSquare} tone="blue" />
      <KpiCard label="Pending" value={String(stats.pendingTickets)} icon={Clock3} tone="amber" />
      <KpiCard label="Resolved" value={String(stats.resolvedTickets)} icon={CheckCircle2} tone="green" />
      <KpiCard label="Closed" value={String(stats.closedTickets)} icon={XCircle} tone="navy" />
      <KpiCard label="High Priority" value={String(stats.highPriority)} icon={AlertTriangle} tone="red" />
      <KpiCard label="Avg Response Time" value={stats.avgResponseTimeMinutes > 0 ? `${stats.avgResponseTimeMinutes}m` : '—'} icon={Timer} tone="gold" />
      <KpiCard label="Today's Tickets" value={String(stats.todayTickets)} icon={CalendarDays} tone="blue" />
      <KpiCard label="This Week" value={String(stats.weekTickets)} icon={CalendarRange} tone="blue" />
      <KpiCard label="This Month" value={String(stats.monthTickets)} icon={TrendingUp} tone="blue" />
    </div>
  );
}

// ============================================================
// Ticket List
// ============================================================

function TicketFiltersBar({ filters, onChange, admins }: {
  filters: SupportTicketListFilters; onChange: (f: SupportTicketListFilters) => void; admins: { _id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const activeCount = [filters.priority, filters.category, filters.assignedAdminId, filters.dateFrom].filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => { if (searchInput !== filters.search) onChange({ ...filters, search: searchInput || undefined, page: 1 }); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="admin-card p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search subject, customer, message…"
            className="w-full text-xs font-semibold border border-gray-200 rounded-lg pl-8 pr-3 py-2.5 focus:outline-none focus:border-admin-blue"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...filters, status: s || undefined, page: 1 })}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors',
                (filters.status || '') === s ? 'bg-admin-blue text-white shadow-sm' : 'text-gray-500 hover:text-admin-blue')}
            >
              {s ? STATUS_META[s].label : 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-admin-blue border border-gray-200 rounded-lg px-3 py-2 transition-colors"
        >
          <Filter size={13} /> Filters {activeCount > 0 && <span className="bg-admin-blue text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{activeCount}</span>}
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-gray-100">
          <select value={filters.priority || ''} onChange={(e) => onChange({ ...filters, priority: e.target.value || undefined, page: 1 })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue">
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p ? PRIORITY_META[p].label : 'All Priorities'}</option>)}
          </select>
          <select value={filters.category || ''} onChange={(e) => onChange({ ...filters, category: e.target.value || undefined, page: 1 })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue">
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c ? CATEGORY_LABELS[c] : 'All Categories'}</option>)}
          </select>
          <select value={filters.assignedAdminId || ''} onChange={(e) => onChange({ ...filters, assignedAdminId: e.target.value || undefined, page: 1 })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue">
            <option value="">All Admins</option>
            <option value="unassigned">Unassigned</option>
            {admins.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <input type="date" value={filters.dateFrom || ''} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined, page: 1 })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue" />
          <input type="date" value={filters.dateTo || ''} onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined, page: 1 })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue" />
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket, onClick }: { ticket: SupportTicket; onClick: () => void }) {
  const lastMsg = ticket.replies?.[ticket.replies.length - 1];
  return (
    <button onClick={onClick} className="w-full text-left admin-card p-4 hover:-translate-y-0.5 transition-all sm:hidden block">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-black text-gray-900 truncate flex-1">{ticket.subject}</p>
        <StatusPill status={ticket.status} />
      </div>
      <p className="text-[11px] text-gray-500 truncate mb-2">{ticket.name} · {ticket.email}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PriorityPill priority={ticket.priority} />
          <span className="text-[10px] text-gray-400">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
        </div>
        <span className="text-[10px] text-gray-400">{formatDate(ticket.lastReplyAt || ticket.createdAt)}</span>
      </div>
    </button>
  );
}

function TicketList({ filters, onFiltersChange, admins, onOpen, refreshKey }: {
  filters: SupportTicketListFilters; onFiltersChange: (f: SupportTicketListFilters) => void;
  admins: { _id: string; name: string }[]; onOpen: (id: string) => void; refreshKey: number;
}) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });

  const load = useCallback(() => {
    setLoading(true);
    adminSupport.list(filters)
      .then((res) => { setTickets(res.tickets); setMeta({ total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages }); })
      .catch((e: any) => toast.error(e.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const sortBy = filters.sortBy || 'createdAt';
  const toggleSort = (field: SupportTicketListFilters['sortBy']) => {
    onFiltersChange({ ...filters, sortBy: field, sortDir: sortBy === field && filters.sortDir === 'desc' ? 'asc' : 'desc' });
  };

  return (
    <div className="space-y-4">
      <TicketFiltersBar filters={filters} onChange={onFiltersChange} admins={admins} />

      {loading ? (
        <SkeletonList rows={6} />
      ) : tickets.length === 0 ? (
        <EmptyState icon={Ticket} title="No tickets match these filters" description="Try widening your date range or clearing filters." tone="admin" />
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-3">
            {tickets.map((t) => <TicketRow key={t._id} ticket={t} onClick={() => onOpen(t._id)} />)}
          </div>

          {/* Desktop data table */}
          <div className="hidden sm:block admin-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 font-black uppercase tracking-wide text-[10px] border-b border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-5 cursor-pointer" onClick={() => toggleSort('createdAt')}>Ticket</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('status')}>Status</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('priority')}>Priority</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Assigned</th>
                  <th className="py-3 px-5 text-right cursor-pointer" onClick={() => toggleSort('lastReplyAt')}>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t._id} onClick={() => onOpen(t._id)} className="border-b border-gray-50 hover:bg-admin-blue-soft/30 cursor-pointer transition-colors">
                    <td className="py-3 px-5 font-bold text-gray-800 max-w-[220px] truncate">{t.subject}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[160px] truncate">{t.name}</td>
                    <td className="py-3 px-4"><StatusPill status={t.status} /></td>
                    <td className="py-3 px-4"><PriorityPill priority={t.priority} /></td>
                    <td className="py-3 px-4 text-gray-500">{CATEGORY_LABELS[t.category] || t.category}</td>
                    <td className="py-3 px-4 text-gray-500">{t.assignedAdminName || <span className="text-gray-300">Unassigned</span>}</td>
                    <td className="py-3 px-5 text-right text-gray-400">{formatDate(t.lastReplyAt || t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <AdminPagination page={meta.page} totalPages={meta.totalPages} total={meta.total} pageSize={meta.pageSize} onChange={(p) => onFiltersChange({ ...filters, page: p })} />
          </div>
          <div className="sm:hidden">
            <AdminPagination page={meta.page} totalPages={meta.totalPages} total={meta.total} pageSize={meta.pageSize} onChange={(p) => onFiltersChange({ ...filters, page: p })} />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Ticket Detail Drawer
// ============================================================

type DetailTab = 'conversation' | 'customer' | 'notes' | 'timeline';

function ConversationPane({ ticket, onSend, sending }: { ticket: SupportTicket; onSend: (msg: string) => void; sending: boolean }) {
  const [msg, setMsg] = useState('');
  const messages = useMemo(() => [...(ticket.replies || [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [ticket.replies]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 mb-4 min-h-[200px]">
        {/* Original ticket message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
            <p className="text-xs text-gray-800 whitespace-pre-line">{ticket.message}</p>
            <p className="text-[10px] text-gray-400 mt-1">{ticket.name} · {formatDate(ticket.createdAt)}</p>
          </div>
        </div>
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-300 py-6">No replies yet — be the first to respond.</p>
        ) : messages.map((r, i) => (
          <div key={i} className={cn('flex', r.from === 'admin' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-2.5',
              r.from === 'admin' ? 'bg-admin-blue text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            )}>
              <p className="text-xs whitespace-pre-line">{r.message}</p>
              <p className={cn('text-[10px] mt-1', r.from === 'admin' ? 'text-blue-100' : 'text-gray-400')}>
                {r.from === 'admin' ? (r.adminName || 'Support Team') : ticket.name} · {formatDate(r.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type your reply — an email will be sent automatically…"
          rows={2}
          className="flex-1 text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-admin-blue"
        />
        <button
          onClick={() => { if (msg.trim()) { onSend(msg); setMsg(''); } }}
          disabled={sending || !msg.trim()}
          className="w-10 h-10 rounded-xl bg-admin-blue hover:bg-admin-blue-dark text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

function CustomerPane({ customer, previousTickets, onOpenTicket }: { customer: CustomerSupportContext | null; previousTickets: PreviousTicketSummary[]; onOpenTicket: (id: string) => void }) {
  if (!customer) return <EmptyState icon={UserIcon} title="Customer record not found" tone="admin" />;
  return (
    <div className="space-y-5">
      <div className="admin-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-admin-blue-soft text-admin-blue flex items-center justify-center font-black">{customer.user.name?.[0]?.toUpperCase()}</div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900 truncate">{customer.user.name}</p>
            <p className="text-[11px] text-gray-400 truncate flex items-center gap-1"><Mail size={11} />{customer.user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Account Age</p>
            <p className="text-sm font-black text-gray-900">{customer.accountAgeDays}d</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Last Login</p>
            <p className="text-xs font-black text-gray-900">{customer.lastLogin ? formatDate(customer.lastLogin) : '—'}</p>
          </div>
        </div>
      </div>

      <div className="admin-card p-4">
        <h4 className="text-xs font-extrabold text-gray-900 mb-3 flex items-center gap-1.5"><Wallet size={13} className="text-admin-blue" /> Wallet & Transactions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-admin-blue-soft/40 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Wallet Balance</p>
            <p className="text-sm font-black text-admin-blue">{formatNaira(customer.walletBalance)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Total Txns</p>
            <p className="text-sm font-black text-gray-900">{customer.totalTransactions}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Successful</p>
            <p className="text-sm font-black text-green-600">{customer.successfulTransactions}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Failed</p>
            <p className="text-sm font-black text-red-600">{customer.failedTransactions}</p>
          </div>
        </div>
      </div>

      <div className="admin-card p-4">
        <h4 className="text-xs font-extrabold text-gray-900 mb-3 flex items-center gap-1.5"><ShoppingCart size={13} className="text-admin-blue" /> Recent Purchases</h4>
        {customer.recentPurchases.length === 0 ? (
          <p className="text-[11px] text-gray-400">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {customer.recentPurchases.slice(0, 5).map((tx) => (
              <div key={tx._id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{tx.product?.name || tx.type}</span>
                <span className="font-bold text-gray-900">{formatNaira(Math.abs(tx.amount))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card p-4">
        <h4 className="text-xs font-extrabold text-gray-900 mb-3 flex items-center gap-1.5"><Ticket size={13} className="text-admin-blue" /> Previous Support Requests</h4>
        {previousTickets.length === 0 ? (
          <p className="text-[11px] text-gray-400">No previous tickets.</p>
        ) : (
          <div className="space-y-1">
            {previousTickets.map((p) => (
              <button key={p._id} onClick={() => onOpenTicket(p._id)} className="w-full flex items-center justify-between text-left py-2 px-1 hover:bg-admin-blue-soft/30 rounded-lg transition-colors">
                <span className="text-xs text-gray-700 truncate flex-1">{p.subject}</span>
                <StatusPill status={p.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotesPane({ ticket, onAdd, busy }: { ticket: SupportTicket; onAdd: (note: string) => void; busy: boolean }) {
  const [note, setNote] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Add an internal note — customers never see this…"
          rows={2}
          className="flex-1 text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-admin-blue"
        />
        <button
          onClick={() => { if (note.trim()) { onAdd(note); setNote(''); } }}
          disabled={busy || !note.trim()}
          className="w-10 h-10 rounded-xl bg-admin-gold hover:opacity-90 text-white flex items-center justify-center transition-opacity disabled:opacity-40 shrink-0"
        >
          <StickyNote size={15} />
        </button>
      </div>
      {(!ticket.internalNotes || ticket.internalNotes.length === 0) ? (
        <p className="text-center text-xs text-gray-300 py-6">No internal notes yet.</p>
      ) : (
        <div className="space-y-2">
          {[...ticket.internalNotes].reverse().map((n) => (
            <div key={n._id} className="bg-admin-gold-soft/40 rounded-xl p-3">
              <p className="text-xs text-gray-800 whitespace-pre-line">{n.note}</p>
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Lock size={9} /> {n.adminName} · {formatDate(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelinePane({ ticket }: { ticket: SupportTicket }) {
  const events = ticket.timeline || [];
  if (events.length === 0) return <EmptyState icon={History} title="No timeline events yet" tone="admin" />;
  return (
    <div className="space-y-0">
      {[...events].reverse().map((e, i) => (
        <div key={i} className="flex gap-3 pb-4 relative">
          {i < events.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-px bg-gray-100" />}
          <div className="w-4 h-4 rounded-full bg-admin-blue-soft border-2 border-admin-blue shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-800">{e.label}</p>
            <p className="text-[10px] text-gray-400">{formatDate(e.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TicketDetailDrawer({ ticketId, onClose, admins, isSuperAdmin, onChanged }: {
  ticketId: string | null; onClose: () => void; admins: { _id: string; name: string; email: string }[];
  isSuperAdmin: boolean; onChanged: () => void;
}) {
  const [data, setData] = useState<{ ticket: SupportTicket; customer: CustomerSupportContext | null; previousTickets: PreviousTicketSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>('conversation');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [innerTicketId, setInnerTicketId] = useState<string | null>(null);

  const activeId = innerTicketId || ticketId;

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    adminSupport.detail(activeId)
      .then(setData)
      .catch((e: any) => toast.error(e.message || 'Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => {
    if (ticketId) { setInnerTicketId(null); setTab('conversation'); setConfirmDelete(false); }
  }, [ticketId]);
  useEffect(() => { load(); }, [load]);

  const runAction = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      await fn();
      load();
      onChanged();
      toast.success('Updated');
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  if (!ticketId) return null;
  const ticket = data?.ticket;

  return (
    <Drawer open={!!ticketId} onClose={onClose} title={ticket ? ticket.subject : 'Ticket'} wide>
      {loading || !ticket ? (
        <div className="space-y-3"><Skeleton className="h-24 w-full rounded-2xl" /><SkeletonList rows={4} /></div>
      ) : (
        <div className="space-y-4">
          {/* Header meta + quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={ticket.status} />
            <PriorityPill priority={ticket.priority} />
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{CATEGORY_LABELS[ticket.category]}</span>
            <span className="text-[10px] text-gray-400 ml-auto">Created {formatDate(ticket.createdAt)}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ticket.status !== 'in_progress' && (
              <button disabled={!!busy} onClick={() => runAction('pending', () => adminSupport.changeStatus(ticket._id, 'in_progress'))}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40">
                <Clock3 size={11} /> Mark Pending
              </button>
            )}
            {ticket.status !== 'resolved' && (
              <button disabled={!!busy} onClick={() => runAction('resolved', () => adminSupport.changeStatus(ticket._id, 'resolved'))}
                className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40">
                <CheckCircle2 size={11} /> Mark Resolved
              </button>
            )}
            {ticket.status !== 'closed' ? (
              <button disabled={!!busy} onClick={() => runAction('closed', () => adminSupport.changeStatus(ticket._id, 'closed'))}
                className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40">
                <XCircle size={11} /> Close Ticket
              </button>
            ) : (
              <button disabled={!!busy} onClick={() => runAction('open', () => adminSupport.changeStatus(ticket._id, 'open'))}
                className="flex items-center gap-1 text-[11px] font-bold text-admin-blue bg-admin-blue-soft hover:opacity-80 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40">
                <RotateCcw size={11} /> Reopen
              </button>
            )}

            <select
              value={ticket.priority}
              onChange={(e) => runAction('priority', () => adminSupport.changePriority(ticket._id, e.target.value as any))}
              disabled={!!busy}
              className="text-[11px] font-bold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-admin-blue"
            >
              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{PRIORITY_META[p].label} Priority</option>)}
            </select>

            <select
              value={ticket.assignedAdminId || ''}
              onChange={(e) => runAction('assign', () => adminSupport.assign(ticket._id, e.target.value || null))}
              disabled={!!busy}
              className="text-[11px] font-bold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-admin-blue"
            >
              <option value="">Unassigned</option>
              {admins.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>

            {isSuperAdmin && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={!!busy}
                className="flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg px-2.5 py-1.5 transition-colors ml-auto disabled:opacity-40"
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>

          {confirmDelete && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-red-700">Permanently delete this ticket? This cannot be undone.</p>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => setConfirmDelete(false)} className="text-[11px] font-bold text-gray-500 px-2 py-1">Cancel</button>
                <button
                  onClick={() => runAction('delete', async () => { await adminSupport.deleteTicket(ticket._id); onClose(); })}
                  className="text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 w-fit">
            {([
              { id: 'conversation', label: 'Conversation', icon: MessageSquare },
              { id: 'customer', label: 'Customer', icon: UserIcon },
              { id: 'notes', label: 'Notes', icon: StickyNote },
              { id: 'timeline', label: 'Timeline', icon: History },
            ] as { id: DetailTab; label: string; icon: any }[]).map((t) => (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                  tab === t.id ? 'bg-white shadow-sm text-admin-blue' : 'text-gray-500 hover:text-admin-blue')}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {tab === 'conversation' && (
                <ConversationPane ticket={ticket} sending={busy === 'reply'} onSend={(m) => runAction('reply', () => adminSupport.reply(ticket._id, m))} />
              )}
              {tab === 'customer' && (
                <CustomerPane customer={data!.customer} previousTickets={data!.previousTickets} onOpenTicket={(id) => setInnerTicketId(id)} />
              )}
              {tab === 'notes' && <NotesPane ticket={ticket} busy={busy === 'note'} onAdd={(n) => runAction('note', () => adminSupport.addNote(ticket._id, n))} />}
              {tab === 'timeline' && <TimelinePane ticket={ticket} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </Drawer>
  );
}

// ============================================================
// Root component
// ============================================================

const SUB_VIEWS = [
  { id: 'DASHBOARD', label: 'Overview', icon: LayoutGrid },
  { id: 'TICKETS', label: 'Tickets', icon: Ticket },
] as const;

export default function AdminSupport() {
  const [view, setView] = useState<(typeof SUB_VIEWS)[number]['id']>('DASHBOARD');
  const [filters, setFilters] = useState<SupportTicketListFilters>({ page: 1, pageSize: 20 });
  const [admins, setAdmins] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    adminSupport.listAdmins()
      .then((res) => { setAdmins(res.admins); setIsSuperAdmin(res.isSuperAdmin); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 w-fit">
        {SUB_VIEWS.map((v) => (
          <button
            key={v.id} onClick={() => setView(v.id)}
            className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors',
              view === v.id ? 'bg-white shadow-sm text-admin-blue' : 'text-gray-500 hover:text-admin-blue')}
          >
            <v.icon size={14} /> {v.label}
          </button>
        ))}
      </div>

      {view === 'DASHBOARD' && <SupportDashboard />}
      {view === 'TICKETS' && (
        <TicketList
          filters={filters}
          onFiltersChange={setFilters}
          admins={admins}
          onOpen={setOpenTicketId}
          refreshKey={refreshKey}
        />
      )}

      <TicketDetailDrawer
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
        admins={admins}
        isSuperAdmin={isSuperAdmin}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
