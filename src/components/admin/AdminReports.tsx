import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, ShoppingCart, Wallet, Receipt, CheckCircle2, Clock, XCircle,
  Percent, UserPlus, Users, Repeat, Calculator, Radio, Download, Printer, FileSpreadsheet,
  Filter, ChevronDown, X, LayoutGrid, CalendarRange, BarChart3, Package, Smartphone, Tv,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { cn } from '../../lib/utils';
import {
  admin, reports, formatNaira, formatDate,
  type ReportFilters, type ReportPeriod, type DashboardResponse, type ReportSummaryResponse,
  type ChartMetric, type ChartResponse, type TopListEntry, type AdminTransaction,
} from '../../lib/api';
import { Skeleton } from '../Skeleton';
import EmptyState from '../EmptyState';
import Drawer from '../Drawer';
import StatusBadge from '../StatusBadge';

// ============================================================
// Constants
// ============================================================

const VIEWS = [
  { id: 'DASHBOARD', label: 'Executive Dashboard', icon: LayoutGrid },
  { id: 'REPORTS', label: 'Reports', icon: CalendarRange },
  { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
] as const;
type View = (typeof VIEWS)[number]['id'];

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
];

const SERVICE_OPTIONS = ['', 'data', 'airtime', 'cable', 'electricity', 'education', 'recharge'];
// The three real upstream API providers integrated by ProviderOrchestrator — same list AdminProviderController serves.
const PROVIDER_OPTIONS = ['', 'gladtidings', 'cheapdatahub', 'jarapoint'];
const STATUS_OPTIONS = ['', 'delivered', 'pending', 'failed'];

const CHART_DEFS: { metric: ChartMetric; title: string; kind: 'area' | 'line' | 'bar' | 'pie' | 'stackedBar' }[] = [
  { metric: 'revenueTrend', title: 'Revenue Trend', kind: 'area' },
  { metric: 'profitTrend', title: 'Profit Trend', kind: 'area' },
  { metric: 'transactionTrend', title: 'Transaction Trend', kind: 'line' },
  { metric: 'userGrowth', title: 'User Growth', kind: 'bar' },
  { metric: 'providerPerformance', title: 'Provider Performance', kind: 'line' },
  { metric: 'walletFlow', title: 'Wallet Flow', kind: 'stackedBar' },
  { metric: 'productPerformance', title: 'Product Performance', kind: 'bar' },
  { metric: 'serviceDistribution', title: 'Service Distribution', kind: 'pie' },
  { metric: 'failureTrend', title: 'Failure Trend', kind: 'area' },
  { metric: 'successTrend', title: 'Success Trend', kind: 'area' },
];

const PIE_COLORS = ['#2563EB', '#D4A73B', '#16A34A', '#DC2626', '#7C3AED', '#0EA5E9'];

// ============================================================
// Small building blocks
// ============================================================

function KpiCard({ label, value, icon: Icon, tone = 'blue', onClick }: {
  label: string; value: string; icon: any; tone?: 'blue' | 'gold' | 'green' | 'amber' | 'red' | 'navy'; onClick?: () => void;
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
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'admin-card p-4 sm:p-5 text-left group transition-all',
        onClick ? 'hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
      )}
    >
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform', toneClasses[tone])}>
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-extrabold text-gray-900 tracking-tight font-display truncate">{value}</p>
    </button>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="admin-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function TopListCard({ title, icon: Icon, items, onRowClick }: {
  title: string; icon: any; items: TopListEntry[]; onRowClick: (name: string) => void;
}) {
  return (
    <SectionCard title={title} action={<Icon size={16} className="text-admin-blue" />}>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">No data for this period yet.</p>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 8).map((it, i) => (
            <button
              key={it.name + i}
              onClick={() => onRowClick(it.name)}
              className="w-full flex items-center justify-between py-2.5 px-2 -mx-2 rounded-xl hover:bg-admin-blue-soft/40 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-xs font-bold text-gray-700 truncate">{it.name}</span>
              </div>
              <div className="text-right shrink-0 pl-2">
                <p className="text-xs font-black text-gray-900">{formatNaira(it.revenue)}</p>
                <p className="text-[10px] text-gray-400">{it.count} sales</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/** Drill-down drawer — reuses the exact same admin.transactions() endpoint and filters as the Transactions tab, so every KPI/chart/list can open its underlying real records. */
function DrilldownDrawer({ open, onClose, title, filters }: { open: boolean; onClose: () => void; title: string; filters: ReportFilters }) {
  const [txns, setTxns] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    admin.transactions({
      limit: 50,
      status: filters.status || undefined,
      category: filters.category || undefined,
      userId: filters.userId || undefined,
      dateFrom: filters.dateFrom, dateTo: filters.dateTo,
    } as any)
      .then((res) => { setTxns(res.transactions); setTotal(res.total); })
      .catch((e: any) => toast.error(e.message || 'Failed to load records'))
      .finally(() => setLoading(false));
  }, [open, filters]);

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : txns.length === 0 ? (
        <EmptyState icon={Receipt} title="No matching records" tone="admin" />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold mb-2">{total} matching record{total !== 1 ? 's' : ''}</p>
          {txns.map((t) => (
            <div key={t._id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{t.product?.name || t.type}</p>
                <p className="text-[10px] text-gray-400">{formatDate(t.createdAt)}</p>
              </div>
              <div className="text-right shrink-0 pl-2">
                <p className="text-xs font-black text-gray-900">{formatNaira(Math.abs(t.amount))}</p>
                <StatusBadge status={t.deliveryStatus} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

// ============================================================
// Filters bar — shared across all three views
// ============================================================

function FiltersBar({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const [open, setOpen] = useState(false);
  const activeCount = [filters.category, filters.provider, filters.status, filters.userId, filters.productId].filter(Boolean).length;

  return (
    <div className="admin-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => onChange({ ...filters, period: p.id })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors',
                filters.period === p.id ? 'bg-admin-blue text-white shadow-sm' : 'text-gray-500 hover:text-admin-blue'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {filters.period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={filters.dateFrom || ''} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-admin-blue" />
            <span className="text-gray-300 text-xs">to</span>
            <input type="date" value={filters.dateTo || ''} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-admin-blue" />
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-admin-blue border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Filter size={13} /> Filters {activeCount > 0 && <span className="bg-admin-blue text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{activeCount}</span>}
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 pt-3 border-t border-gray-100">
          <select value={filters.category || ''} onChange={(e) => onChange({ ...filters, category: e.target.value || undefined })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue">
            {SERVICE_OPTIONS.map((c) => <option key={c} value={c}>{c ? c[0].toUpperCase() + c.slice(1) : 'All Services'}</option>)}
          </select>
          <select value={filters.provider || ''} onChange={(e) => onChange({ ...filters, provider: e.target.value || undefined })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue">
            {PROVIDER_OPTIONS.map((p) => <option key={p} value={p}>{p ? p[0].toUpperCase() + p.slice(1) : 'All Providers'}</option>)}
          </select>
          <select value={filters.status || ''} onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'All Statuses'}</option>)}
          </select>
          <input placeholder="Product ID" value={filters.productId || ''} onChange={(e) => onChange({ ...filters, productId: e.target.value || undefined })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue" />
          <input placeholder="User ID" value={filters.userId || ''} onChange={(e) => onChange({ ...filters, userId: e.target.value || undefined })}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-admin-blue" />
          {activeCount > 0 && (
            <button
              onClick={() => onChange({ period: filters.period, dateFrom: filters.dateFrom, dateTo: filters.dateTo })}
              className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600 px-2"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ExportBar({ filters, contextLabel }: { filters: ReportFilters; contextLabel: string }) {
  const [busy, setBusy] = useState<'csv' | 'pdf' | 'print' | null>(null);

  const handleCsv = async () => {
    setBusy('csv');
    try {
      await reports.exportTransactionsCsv(filters);
      toast.success('CSV export started');
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally { setBusy(null); }
  };

  const handleSummaryCsv = async () => {
    setBusy('csv');
    try {
      await reports.exportSummaryCsv(filters);
      toast.success('Summary CSV export started');
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally { setBusy(null); }
  };

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      const res = await reports.dashboard(filters);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 48;
      let y = 60;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor('#0F172A');
      doc.text(`SescoHub — ${contextLabel}`, margin, y);
      y += 20;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor('#64748B');
      doc.text(`Generated ${new Date().toLocaleString('en-NG')}`, margin, y);
      y += 30;
      doc.setFontSize(12); doc.setTextColor('#0F172A'); doc.setFont('helvetica', 'bold');
      doc.text('Key Performance Indicators', margin, y);
      y += 18;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      Object.entries(res.kpis).forEach(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
        const value = typeof v === 'number' && /revenue|profit|sales|float|value/i.test(k) ? formatNaira(v) : String(v);
        doc.text(`${label}: ${value}`, margin, y);
        y += 15;
        if (y > 760) { doc.addPage(); y = 60; }
      });
      doc.save(`sescohub-${contextLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
      await reports.logExport('pdf', filters.period);
      toast.success('PDF downloaded');
    } catch (e: any) {
      toast.error(e.message || 'PDF export failed');
    } finally { setBusy(null); }
  };

  const handlePrint = async () => {
    setBusy('print');
    try {
      const res = await reports.dashboard(filters);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <html><head><title>SescoHub — ${contextLabel}</title>
          <style>body{font-family:Arial,sans-serif;padding:32px;color:#0F172A}
          h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}
          td{padding:6px 0;border-bottom:1px solid #eee;font-size:13px}</style></head>
          <body><h1>SescoHub — ${contextLabel}</h1>
          <p style="color:#64748B;font-size:12px">Generated ${new Date().toLocaleString('en-NG')}</p>
          <table>${Object.entries(res.kpis).map(([k, v]) => {
            const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
            const value = typeof v === 'number' && /revenue|profit|sales|float|value/i.test(k) ? formatNaira(v) : String(v);
            return `<tr><td><b>${label}</b></td><td style="text-align:right">${value}</td></tr>`;
          }).join('')}</table></body></html>
        `);
        w.document.close();
        w.focus();
        w.print();
      }
      await reports.logExport('print', filters.period);
    } catch (e: any) {
      toast.error(e.message || 'Print failed');
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={handleCsv} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-admin-blue border border-gray-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
        <Download size={13} /> Export Transactions CSV
      </button>
      <button onClick={handleSummaryCsv} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-admin-blue border border-gray-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
        <FileSpreadsheet size={13} /> Export Summary CSV
      </button>
      <button onClick={handlePdf} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-bold text-white bg-admin-blue hover:bg-admin-blue-dark rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
        <Download size={13} /> {busy === 'pdf' ? 'Generating…' : 'Export PDF'}
      </button>
      <button onClick={handlePrint} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-admin-blue border border-gray-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
        <Printer size={13} /> Print
      </button>
    </div>
  );
}

// ============================================================
// Chart card
// ============================================================

function ChartCard({ metric, title, kind, filters }: { metric: ChartMetric; title: string; kind: string; filters: ReportFilters }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    reports.chart(metric, filters)
      .then((res: ChartResponse) => setData(res.series))
      .catch((e: any) => setError(e.message || 'Failed to load chart'))
      .finally(() => setLoading(false));
  }, [metric, filters]);

  const xKey = data[0]?.date ? 'date' : data[0]?.product ? 'product' : data[0]?.category ? 'category' : 'name';

  return (
    <SectionCard title={title}>
      {loading ? (
        <Skeleton className="h-52 w-full rounded-xl" />
      ) : error ? (
        <EmptyState icon={XCircle} title="Couldn't load this chart" description={error} tone="admin" variant="error" />
      ) : data.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data for this period yet" tone="admin" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {kind === 'area' ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatNaira(Number(v) || 0)} />
              <Area type="monotone" dataKey={metric.includes('profit') ? 'profit' : metric.includes('failure') ? 'failed' : metric.includes('success') ? 'successful' : 'revenue'} stroke="#2563EB" fill={`url(#grad-${metric})`} strokeWidth={2} />
            </AreaChart>
          ) : kind === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey={metric === 'providerPerformance' ? 'successRate' : 'total'} stroke="#2563EB" strokeWidth={2} dot={false} name={metric === 'providerPerformance' ? 'Success Rate %' : 'Transactions'} />
            </LineChart>
          ) : kind === 'stackedBar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatNaira(Number(v) || 0)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="deposits" stackId="a" fill="#16A34A" name="Deposits" />
              <Bar dataKey="purchases" stackId="a" fill="#2563EB" name="Purchases" />
              <Bar dataKey="refunds" stackId="a" fill="#DC2626" name="Refunds" />
            </BarChart>
          ) : kind === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={(d: any) => d.category}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => formatNaira(Number(v) || 0)} />
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => (typeof v === 'number' ? formatNaira(v) : v)} />
              <Bar dataKey={metric === 'userGrowth' ? 'newUsers' : 'revenue'} fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}

// ============================================================
// Main views
// ============================================================

function DashboardView({ filters, onDrilldown }: { filters: ReportFilters; onDrilldown: (label: string, f: Partial<ReportFilters>) => void }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reports.dashboard(filters)
      .then(setData)
      .catch((e: any) => toast.error(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{Array.from({ length: 15 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>;
  }

  const k = data.kpis;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Revenue" value={formatNaira(k.totalRevenue)} icon={DollarSign} tone="blue" onClick={() => onDrilldown('Total Revenue', { status: 'delivered' })} />
        <KpiCard label="Net Profit" value={formatNaira(k.netProfit)} icon={TrendingUp} tone="green" onClick={() => onDrilldown('Net Profit', { status: 'delivered' })} />
        <KpiCard label="Gross Sales" value={formatNaira(k.grossSales)} icon={ShoppingCart} tone="gold" onClick={() => onDrilldown('Gross Sales', {})} />
        <KpiCard label="Wallet Float" value={formatNaira(k.walletFloat)} icon={Wallet} tone="navy" />
        <KpiCard label="Total Transactions" value={String(k.totalTransactions)} icon={Receipt} tone="blue" onClick={() => onDrilldown('Total Transactions', {})} />
        <KpiCard label="Successful" value={String(k.successfulTransactions)} icon={CheckCircle2} tone="green" onClick={() => onDrilldown('Successful Transactions', { status: 'delivered' })} />
        <KpiCard label="Pending" value={String(k.pendingTransactions)} icon={Clock} tone="amber" onClick={() => onDrilldown('Pending Transactions', { status: 'pending' })} />
        <KpiCard label="Failed" value={String(k.failedTransactions)} icon={XCircle} tone="red" onClick={() => onDrilldown('Failed Transactions', { status: 'failed' })} />
        <KpiCard label="Success Rate" value={`${k.successRate}%`} icon={Percent} tone="green" />
        <KpiCard label="Failure Rate" value={`${k.failureRate}%`} icon={Percent} tone="red" />
        <KpiCard label="New Users" value={String(k.newUsers)} icon={UserPlus} tone="blue" />
        <KpiCard label="Active Users" value={String(k.activeUsers)} icon={Users} tone="blue" />
        <KpiCard label="Returning Customers" value={String(k.returningCustomers)} icon={Repeat} tone="gold" />
        <KpiCard label="Avg Transaction Value" value={formatNaira(k.avgTransactionValue)} icon={Calculator} tone="navy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopListCard title="Top Selling Products" icon={Package} items={data.topProducts} onRowClick={(name) => onDrilldown(`Product: ${name}`, { productId: undefined, status: 'delivered' })} />
        <TopListCard title="Top Networks" icon={Smartphone} items={data.topNetworks} onRowClick={(name) => onDrilldown(`Network: ${name}`, { category: 'data', status: 'delivered' })} />
        <TopListCard title="Top Billers" icon={Tv} items={data.topBillers} onRowClick={(name) => onDrilldown(`Biller: ${name}`, { category: 'cable', status: 'delivered' })} />
        <SectionCard title="Provider Performance" action={<Radio size={16} className="text-admin-blue" />}>
          {data.providerPerformance.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No provider calls logged for this period yet.</p>
          ) : (
            <div className="space-y-1">
              {data.providerPerformance.map((p) => (
                <button
                  key={p.provider}
                  onClick={() => onDrilldown(`Provider: ${p.provider}`, { provider: p.provider })}
                  className="w-full flex items-center justify-between py-2.5 px-2 -mx-2 rounded-xl hover:bg-admin-blue-soft/40 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-gray-700 capitalize">{p.provider}</span>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900">{p.successRate}% success</p>
                    <p className="text-[10px] text-gray-400">{p.totalCalls} calls · {p.avgResponseMs ?? '—'}ms avg</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function ReportsView({ filters, onDrilldown }: { filters: ReportFilters; onDrilldown: (label: string, f: Partial<ReportFilters>) => void }) {
  const [data, setData] = useState<ReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reports.summary(filters)
      .then(setData)
      .catch((e: any) => toast.error(e.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [filters]);

  if (loading || !data) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Revenue" value={formatNaira(data.kpis.totalRevenue)} icon={DollarSign} tone="blue" />
        <KpiCard label="Net Profit" value={formatNaira(data.kpis.netProfit)} icon={TrendingUp} tone="green" />
        <KpiCard label="Transactions" value={String(data.kpis.totalTransactions)} icon={Receipt} tone="navy" />
        <KpiCard label="Success Rate" value={`${data.kpis.successRate}%`} icon={Percent} tone="green" />
      </div>

      <SectionCard title={`Breakdown (by ${data.granularity})`}>
        {data.breakdown.length === 0 ? (
          <EmptyState icon={CalendarRange} title="No activity in this range" tone="admin" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 font-black uppercase tracking-wide text-[10px] border-b border-gray-100">
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4 text-right">Revenue</th>
                  <th className="py-2 pr-4 text-right">Profit</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4 text-right">Success</th>
                  <th className="py-2 pr-4 text-right">Pending</th>
                  <th className="py-2 text-right">Failed</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((row) => (
                  <tr
                    key={row.bucket}
                    onClick={() => onDrilldown(`Period: ${row.bucket}`, {})}
                    className="border-b border-gray-50 hover:bg-admin-blue-soft/30 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-bold text-gray-700">{row.bucket}</td>
                    <td className="py-2.5 pr-4 text-right font-bold text-gray-900">{formatNaira(row.revenue)}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-600">{formatNaira(row.profit)}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-600">{row.total}</td>
                    <td className="py-2.5 pr-4 text-right text-green-600 font-semibold">{row.successful}</td>
                    <td className="py-2.5 pr-4 text-right text-amber-600 font-semibold">{row.pending}</td>
                    <td className="py-2.5 text-right text-red-600 font-semibold">{row.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function AnalyticsView({ filters }: { filters: ReportFilters }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {CHART_DEFS.map((c) => (
        <ChartCard key={c.metric} metric={c.metric} title={c.title} kind={c.kind} filters={filters} />
      ))}
    </div>
  );
}

// ============================================================
// Root component
// ============================================================

export default function AdminReports() {
  const [view, setView] = useState<View>('DASHBOARD');
  const [filters, setFilters] = useState<ReportFilters>({ period: 'monthly' });
  const [drilldown, setDrilldown] = useState<{ open: boolean; label: string; filters: ReportFilters }>({ open: false, label: '', filters: {} });

  const handleDrilldown = (label: string, extra: Partial<ReportFilters>) => {
    setDrilldown({ open: true, label, filters: { ...filters, ...extra } });
  };

  const contextLabel = useMemo(() => VIEWS.find((v) => v.id === view)?.label || 'Report', [view]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 w-fit">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors',
                  view === v.id ? 'bg-white shadow-sm text-admin-blue' : 'text-gray-500 hover:text-admin-blue'
                )}
              >
                <Icon size={14} /> {v.label}
              </button>
            );
          })}
        </div>
        <ExportBar filters={filters} contextLabel={contextLabel} />
      </div>

      <FiltersBar filters={filters} onChange={setFilters} />

      {view === 'DASHBOARD' && <DashboardView filters={filters} onDrilldown={handleDrilldown} />}
      {view === 'REPORTS' && <ReportsView filters={filters} onDrilldown={handleDrilldown} />}
      {view === 'ANALYTICS' && <AnalyticsView filters={filters} />}

      <DrilldownDrawer
        open={drilldown.open}
        onClose={() => setDrilldown((d) => ({ ...d, open: false }))}
        title={drilldown.label}
        filters={drilldown.filters}
      />
    </div>
  );
}
