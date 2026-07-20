import { useState, useEffect, useCallback } from 'react';
import {
  Users, DollarSign, TrendingUp, Package, Wallet,
  CheckCircle2, Clock, XCircle, Zap, RefreshCw, AlertTriangle,
  AlertCircle, Info, ShoppingCart, ArrowDownLeft, Ticket,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  admin, formatNaira, formatDate,
  type AdminStats, type RevenuePoint, type ProviderHealth, type SystemAlert,
} from '../../lib/api';
import { Skeleton } from '../Skeleton';
import EmptyState from '../EmptyState';

type Period = 7 | 30 | 90;
const PERIOD_LABEL: Record<Period, string> = { 7: 'Weekly', 30: 'Monthly', 90: 'Quarterly' };

function KpiCard({ label, value, sub, icon: Icon, tone = 'blue' }: {
  label: string; value: string; sub?: string; icon: any; tone?: 'blue' | 'gold' | 'green' | 'amber' | 'red' | 'navy';
}) {
  const toneClasses: Record<string, string> = {
    blue: 'bg-admin-blue-soft text-admin-blue',
    gold: 'bg-admin-gold-soft text-admin-gold',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    navy: 'bg-admin-navy/5 text-admin-navy',
  };
  return (
    <div className="admin-card p-5 group hover:-translate-y-0.5 transition-all">
      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform', toneClasses[tone])}>
        <Icon size={20} />
      </div>
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function AlertRow({ alert }: { alert: SystemAlert }) {
  const meta = {
    critical: { icon: AlertCircle, className: 'bg-red-50 text-red-700 border-red-100' },
    warning: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-700 border-amber-100' },
    info: { icon: Info, className: 'bg-blue-50 text-blue-700 border-blue-100' },
  }[alert.severity];
  const Icon = meta.icon;
  return (
    <div className={cn('flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-xs font-semibold', meta.className)}>
      <Icon size={15} className="shrink-0 mt-0.5" />
      {alert.message}
    </div>
  );
}

function ProviderRow({ p }: { p: ProviderHealth }) {
  const meta = {
    healthy: { label: 'Healthy', dot: 'bg-green-500', text: 'text-green-700' },
    low_balance: { label: 'Low Balance', dot: 'bg-amber-500', text: 'text-amber-700' },
    offline: { label: 'Offline', dot: 'bg-red-500', text: 'text-red-700' },
    unconfigured: { label: 'Unconfigured', dot: 'bg-gray-400', text: 'text-gray-500' },
  }[p.status];
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
        <span className="text-sm font-bold text-gray-800 capitalize">{p.name}</span>
      </div>
      <div className="text-right">
        <p className={cn('text-xs font-black uppercase tracking-wide', meta.text)}>{meta.label}</p>
        <p className="text-xs text-gray-400 font-mono">{formatNaira(p.balance)}</p>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (period_: Period, showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    setError('');
    try {
      const [statsRes, chartRes, txnRes] = await Promise.all([
        admin.stats(),
        admin.revenueChart(period_),
        admin.transactions(8) as Promise<{ success: boolean; transactions: any[] }>,
      ]);
      setStats(statsRes.stats);
      setSeries(chartRes.series);
      setRecentTxns(txnRes.transactions || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const handleRefresh = async () => {
    await load(period, true);
    toast.success('Dashboard refreshed');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState tone="admin" icon={AlertCircle} title={error} action={
        <button onClick={() => load(period)} className="admin-btn-primary mt-2 px-5 py-2 text-sm">Try Again</button>
      } />
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Live data — refreshed on load.</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={15} className={cn(isRefreshing && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Alerts */}
      {stats.alerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {stats.alerts.map((a, i) => <AlertRow key={i} alert={a} />)}
        </div>
      )}

      {/* KPI Grid — row 1: business */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={stats.totalUsers.toLocaleString()} sub={`${stats.activeUsers} active (30d)`} icon={Users} tone="navy" />
        <KpiCard label="Platform Wallet Float" value={formatNaira(stats.totalWalletBalance)} sub="Total customer balances" icon={Wallet} tone="blue" />
        <KpiCard label="Today's Revenue" value={formatNaira(stats.todayRevenue)} sub={`${stats.todayTransactions} orders today`} icon={DollarSign} tone="green" />
        <KpiCard label="Net Profit (all-time)" value={formatNaira(stats.profit)} sub={`${formatNaira(stats.revenue)} revenue`} icon={TrendingUp} tone="gold" />
      </div>

      {/* KPI Grid — row 2: transactions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Transactions" value={stats.totalTransactions.toLocaleString()} icon={Package} tone="navy" />
        <KpiCard label="Successful" value={stats.delivered.toLocaleString()} icon={CheckCircle2} tone="green" />
        <KpiCard label="Pending" value={stats.pending.toLocaleString()} icon={Clock} tone="amber" />
        <KpiCard label="Failed" value={stats.failed.toLocaleString()} icon={XCircle} tone="red" />
      </div>

      {/* Chart + Providers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 admin-card p-5 sm:p-7">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-gray-900 font-display">Revenue</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {period === 7 ? formatNaira(stats.weekRevenue) : period === 30 ? formatNaira(stats.monthRevenue) : formatNaira(stats.revenue)} this period
              </p>
            </div>
            <div className="flex gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
              {([7, 30, 90] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                    period === p ? 'bg-white text-admin-navy shadow-sm' : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {series.every((s) => s.revenue === 0) ? (
            <EmptyState tone="admin" icon={TrendingUp} title="No revenue in this period" description="The chart will populate as orders come in." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
                  tick={{ fontSize: 10, fill: '#8B93A7' }}
                  interval={Math.floor(series.length / 6)}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#8B93A7' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  formatter={(v: any) => formatNaira(Number(v) || 0)}
                  labelFormatter={(d) => formatDate(d)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="admin-card p-5 sm:p-7">
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} className="text-admin-blue" />
            <h3 className="font-extrabold text-gray-900 font-display">Provider Health</h3>
          </div>
          {stats.providers.length === 0 ? (
            <p className="text-xs text-gray-400">No providers configured.</p>
          ) : (
            <div>{stats.providers.map((p) => <ProviderRow key={p.name} p={p} />)}</div>
          )}
        </div>
      </div>

      {/* Recent Transactions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 admin-card overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 font-display">Recent Transactions</h3>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last 8</span>
          </div>
          {recentTxns.length === 0 ? (
            <EmptyState tone="admin" icon={ShoppingCart} title="No transactions yet" />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTxns.map((tx) => (
                <div key={tx._id || tx.id} className="flex items-center justify-between px-5 sm:px-6 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-admin-blue-soft text-admin-blue')}>
                      {tx.amount > 0 ? <ArrowDownLeft size={14} /> : <ShoppingCart size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{tx.product?.name || tx.type}</p>
                      <p className="text-[11px] text-gray-400">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-900 shrink-0 ml-3">{formatNaira(Math.abs(tx.amount))}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card p-5 sm:p-7 space-y-3">
          <h3 className="font-extrabold text-gray-900 font-display mb-2">Quick Actions</h3>
          <button onClick={handleRefresh} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-admin-blue-soft hover:brightness-95 transition-all text-sm font-bold text-admin-blue">
            Refresh Dashboard <RefreshCw size={15} />
          </button>
          {stats.openTickets > 0 && (
            <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
              {stats.openTickets} Open Ticket{stats.openTickets !== 1 ? 's' : ''} <Ticket size={15} />
            </div>
          )}
          {/* User/Transaction/Product/Settings management ship as their own modules —
              intentionally not linked here yet rather than pointing at pages that don't exist. */}
          <div className="pt-2 space-y-2">
            {['User Management', 'Transaction Management', 'Product & Pricing', 'Settings'].map((label) => (
              <div key={label} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 text-sm font-semibold text-gray-400">
                {label}
                <span className="text-[9px] font-black uppercase tracking-widest bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Next Module</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
