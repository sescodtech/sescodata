import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Zap, CheckCircle2, XCircle, AlertTriangle, AlertCircle, Info, RefreshCw,
  TrendingUp, ChevronUp, ChevronDown,
  Power, PowerOff, Search, Download, Loader2, Wifi, WifiOff, Radio, Settings2, ListChecks, Activity,
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  admin, formatNaira, formatDate,
  type ProviderDashboardResponse, type ProviderDashboardItem, type ProviderCallLogEntry,
} from '../../lib/api';
import { Skeleton, SkeletonList } from '../Skeleton';
import EmptyState from '../EmptyState';
import Drawer from '../Drawer';
import { exportToCsv } from '../../lib/adminCsvExport';
import AdminPagination from './AdminPagination';
import ConfirmActionDialog from './ConfirmActionDialog';

type Tab = 'overview' | 'management' | 'logs' | 'analytics';

const PROVIDER_LABELS: Record<string, string> = {
  gladtidings: 'GladTidings',
  cheapdatahub: 'CheapDataHub',
  jarapoint: 'Jarapoint',
};
const label = (id: string) => PROVIDER_LABELS[id] || id;

const STATUS_META: Record<string, { label: string; className: string; icon: any }> = {
  healthy: { label: 'Healthy', className: 'bg-green-50 text-green-700 border-green-100', icon: Wifi },
  low_balance: { label: 'Low Balance', className: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
  offline: { label: 'Offline', className: 'bg-red-50 text-red-700 border-red-100', icon: WifiOff },
  unconfigured: { label: 'Unconfigured', className: 'bg-gray-100 text-gray-500 border-gray-200', icon: AlertCircle },
};

function StatusPill({ status, disabled }: { status: string; disabled?: boolean }) {
  if (disabled) {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-gray-100 text-gray-500 border-gray-200"><PowerOff size={11} /> Disabled</span>;
  }
  const meta = STATUS_META[status] || STATUS_META.unconfigured;
  const Icon = meta.icon;
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border', meta.className)}><Icon size={11} /> {meta.label}</span>;
}

export default function AdminProviders() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<ProviderDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError('');
    try {
      const res = await admin.providersDashboard();
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load provider data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTestConnection = async (name: string) => {
    setTestingProvider(name);
    try {
      const res = await admin.testProviderConnection(name);
      if (res.result.success) {
        toast.success(`${label(name)} connection OK — ${formatNaira(res.result.balance || 0)} balance (${res.result.durationMs}ms)`);
      } else {
        toast.error(`${label(name)} connection failed: ${res.result.error || 'Unknown error'}`);
      }
      load(true);
    } catch (e: any) {
      toast.error(e.message || 'Test failed');
    } finally {
      setTestingProvider(null);
    }
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'management', label: 'Management', icon: Settings2 },
    { id: 'logs', label: 'API Logs', icon: ListChecks },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState tone="admin" icon={AlertCircle} title={error || 'Failed to load provider data'}
        action={<button onClick={() => load()} className="admin-btn-primary text-sm px-4 py-2 mt-2">Retry</button>} />
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div role="tablist" aria-label="Provider Control Center sections" className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0',
              activeTab === tab.id ? 'bg-admin-navy text-white' : 'text-gray-500 hover:bg-gray-50',
            )}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
        <button onClick={() => load(true)} aria-label="Refresh" className="ml-auto p-2.5 text-gray-400 hover:text-admin-blue transition-colors shrink-0">
          <RefreshCw size={15} />
        </button>
      </div>

      {activeTab === 'overview' && <OverviewTab data={data} onTest={handleTestConnection} testingProvider={testingProvider} />}
      {activeTab === 'management' && <ManagementTab data={data} onSaved={() => load(true)} onTest={handleTestConnection} testingProvider={testingProvider} />}
      {activeTab === 'logs' && <LogsTab providerNames={data.providers.map((p) => p.name)} />}
      {activeTab === 'analytics' && <AnalyticsTab data={data} />}
    </div>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================
function OverviewTab({ data, onTest, testingProvider }: { data: ProviderDashboardResponse; onTest: (n: string) => void; testingProvider: string | null }) {
  return (
    <div className="space-y-5">
      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => {
            const meta = {
              critical: { icon: AlertCircle, className: 'bg-red-50 text-red-700 border-red-100' },
              warning: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-700 border-amber-100' },
              info: { icon: Info, className: 'bg-blue-50 text-blue-700 border-blue-100' },
            }[a.severity];
            const Icon = meta.icon;
            return (
              <div key={i} className={cn('flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold', meta.className)} role={a.severity === 'critical' ? 'alert' : undefined}>
                <Icon size={16} className="shrink-0" /> {a.message}
              </div>
            );
          })}
        </div>
      )}

      {/* Provider health cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.providers.map((p) => (
          <ProviderCard key={p.name} provider={p} onTest={onTest} testing={testingProvider === p.name} />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({ provider: p, onTest, testing }: { provider: ProviderDashboardItem; onTest: (n: string) => void; testing: boolean }) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-extrabold text-gray-900 text-sm font-display">{label(p.name)}</h3>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.name}</p>
        </div>
        <StatusPill status={p.status} disabled={p.disabled} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3.5">
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Balance</p>
          <p className="text-sm font-extrabold text-gray-900">{formatNaira(p.balance)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Priority</p>
          <p className="text-sm font-extrabold text-gray-900">#{p.priorityPosition + 1} {p.isManualOverride && <span className="text-admin-gold text-[10px]">★ Override</span>}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Success Rate</p>
          <p className={cn('text-sm font-extrabold', p.stats.successRate === null ? 'text-gray-300' : p.stats.successRate >= 90 ? 'text-green-600' : p.stats.successRate >= 70 ? 'text-amber-600' : 'text-red-600')}>
            {p.stats.successRate !== null ? `${p.stats.successRate}%` : '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Avg Response</p>
          <p className="text-sm font-extrabold text-gray-900">{p.stats.avgResponseMs !== null ? `${p.stats.avgResponseMs}ms` : '—'}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Today</p>
          <p className="text-sm font-extrabold text-gray-900">{p.stats.dailyCalls} req</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">30 Days</p>
          <p className="text-sm font-extrabold text-gray-900">{p.stats.monthlyCalls} req</p>
        </div>
      </div>

      <div className="text-[11px] text-gray-400 mb-3 space-y-0.5">
        <p>Last sync: {p.stats.lastSyncAt ? formatDate(p.stats.lastSyncAt) : 'Never'}</p>
        {p.stats.lastError && <p className="text-red-500 truncate" title={p.stats.lastError}>Last error: {p.stats.lastError}</p>}
      </div>

      <button
        onClick={() => onTest(p.name)}
        disabled={testing}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-admin-blue text-admin-blue font-bold text-xs hover:bg-admin-blue-soft/50 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {testing ? <Loader2 size={13} className="animate-spin" /> : <Radio size={13} />} {testing ? 'Testing…' : 'Test Connection'}
      </button>
    </div>
  );
}

// ============================================================
// MANAGEMENT TAB
// ============================================================
function ManagementTab({ data, onSaved, onTest, testingProvider }: {
  data: ProviderDashboardResponse; onSaved: () => void; onTest: (n: string) => void; testingProvider: string | null;
}) {
  const [priorityOrder, setPriorityOrder] = useState(data.settings.priorityOrder);
  const [disabledProviders, setDisabledProviders] = useState(data.settings.disabledProviders);
  const [manualOverride, setManualOverride] = useState<string | null>(data.settings.manualOverrideProvider);
  const [minBalance, setMinBalance] = useState(String(data.settings.minBalanceThreshold));
  const [isSaving, setIsSaving] = useState(false);

  const isDirty =
    JSON.stringify(priorityOrder) !== JSON.stringify(data.settings.priorityOrder) ||
    manualOverride !== data.settings.manualOverrideProvider ||
    Number(minBalance) !== data.settings.minBalanceThreshold;

  const move = (name: string, dir: -1 | 1) => {
    setPriorityOrder((prev) => {
      const idx = prev.indexOf(name);
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const [pendingToggle, setPendingToggle] = useState<{ name: string; disabling: boolean } | null>(null);
  const [toggling, setToggling] = useState(false);

  const requestToggleDisabled = (name: string) => {
    setPendingToggle({ name, disabling: !disabledProviders.includes(name) });
  };

  const confirmToggleDisabled = async (reason: string) => {
    if (!pendingToggle) return;
    const { name, disabling } = pendingToggle;
    const nextDisabled = disabling ? [...disabledProviders, name] : disabledProviders.filter((p) => p !== name);
    setToggling(true);
    try {
      await admin.updateProviderSettings({ disabledProviders: nextDisabled, reason });
      setDisabledProviders(nextDisabled);
      toast.success(`${label(name)} ${disabling ? 'taken out of rotation' : 're-enabled'}`);
      onSaved();
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    const min = Number(minBalance);
    if (Number.isNaN(min) || min < 0) {
      toast.error('Minimum balance threshold must be a valid non-negative number');
      return;
    }
    setIsSaving(true);
    try {
      await admin.updateProviderSettings({ priorityOrder, disabledProviders, manualOverrideProvider: manualOverride, minBalanceThreshold: min });
      toast.success('Provider settings saved');
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Automatic routing indicator */}
      <div className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-bold',
        manualOverride ? 'bg-admin-gold-soft/50 border-admin-gold text-admin-navy' : 'bg-green-50 border-green-100 text-green-700')}>
        {manualOverride ? <Radio size={16} /> : <Zap size={16} />}
        {manualOverride
          ? `Manual routing active — all purchases forced to ${label(manualOverride)}`
          : 'Automatic routing — purchases use priority order with failover'}
      </div>

      <div className="admin-card p-5">
        <h3 className="font-extrabold text-gray-900 mb-1 font-display">Priority Order &amp; Rotation</h3>
        <p className="text-xs text-gray-400 mb-4">Purchases try providers top-to-bottom, skipping any that are disabled or low on balance.</p>

        <div className="space-y-2">
          {priorityOrder.map((name, idx) => {
            const provider = data.providers.find((p) => p.name === name);
            const isDisabled = disabledProviders.includes(name);
            return (
              <div key={name} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 transition-colors', isDisabled ? 'border-gray-100 bg-gray-50/50 opacity-60' : 'border-gray-100')}>
                <span className="w-6 h-6 rounded-lg bg-admin-navy text-white text-[11px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-sm">{label(name)}</p>
                  {provider && <StatusPill status={provider.status} disabled={isDisabled} />}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(name, -1)} disabled={idx === 0} aria-label={`Move ${label(name)} up`} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronUp size={15} /></button>
                  <button onClick={() => move(name, 1)} disabled={idx === priorityOrder.length - 1} aria-label={`Move ${label(name)} down`} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronDown size={15} /></button>
                  <button
                    onClick={() => requestToggleDisabled(name)}
                    aria-label={isDisabled ? `Enable ${label(name)}` : `Disable ${label(name)}`}
                    className={cn('p-1.5 rounded-lg transition-colors ml-1', isDisabled ? 'text-gray-400 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50')}
                    title={isDisabled ? 'Enable' : 'Disable (maintenance mode)'}
                  >
                    {isDisabled ? <PowerOff size={16} /> : <Power size={16} />}
                  </button>
                  <button
                    onClick={() => onTest(name)}
                    disabled={testingProvider === name}
                    aria-label={`Test ${label(name)} connection`}
                    className="p-1.5 rounded-lg text-admin-blue hover:bg-admin-blue-soft/50 transition-colors disabled:opacity-50"
                    title="Test connection"
                  >
                    {testingProvider === name ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-card p-5">
        <h3 className="font-extrabold text-gray-900 mb-1 font-display">Manual Provider Selection</h3>
        <p className="text-xs text-gray-400 mb-4">Force every purchase through one specific provider, bypassing priority order and failover entirely. Use for testing or routing around a known partial outage.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setManualOverride(null)}
            className={cn('px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all', !manualOverride ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-600 hover:border-gray-200')}
          >
            <Zap size={13} className="inline mr-1.5 -mt-0.5" /> Automatic (recommended)
          </button>
          {priorityOrder.map((name) => (
            <button
              key={name}
              onClick={() => setManualOverride(name)}
              disabled={disabledProviders.includes(name)}
              className={cn('px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed', manualOverride === name ? 'border-admin-gold bg-admin-gold-soft/50 text-admin-navy' : 'border-gray-100 text-gray-600 hover:border-gray-200')}
            >
              {label(name)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card p-5">
        <h3 className="font-extrabold text-gray-900 mb-1 font-display">Balance Threshold</h3>
        <p className="text-xs text-gray-400 mb-4">A provider is treated as "low balance" and skipped once its balance falls below this amount.</p>
        <div className="relative max-w-xs">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₦</span>
          <input
            type="number" min="0" value={minBalance} onChange={(e) => setMinBalance(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm font-bold transition-all"
          />
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="admin-btn-primary px-6 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {isSaving ? 'Saving…' : isDirty ? 'Save Settings' : 'Saved'}
        </button>
      </div>

      <ConfirmActionDialog
        open={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={confirmToggleDisabled}
        tone={pendingToggle?.disabling ? 'danger' : 'default'}
        title={pendingToggle ? `${pendingToggle.disabling ? 'Take offline' : 'Re-enable'} ${label(pendingToggle.name)}?` : ''}
        description={pendingToggle?.disabling ? 'Live purchases will stop routing to this provider immediately. This is recorded in the audit log.' : 'This provider will rejoin the active rotation immediately.'}
        confirmLabel={toggling ? 'Saving…' : pendingToggle?.disabling ? 'Take Offline' : 'Re-enable'}
      />
    </div>
  );
}

// ============================================================
// LOGS TAB
// ============================================================
function LogsTab({ providerNames }: { providerNames: string[] }) {
  const [logs, setLogs] = useState<ProviderCallLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<ProviderCallLogEntry | null>(null);
  const pageSize = 25;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await admin.providerLogs({
        page, pageSize,
        provider: providerFilter || undefined,
        success: successFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message || 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, providerFilter, successFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [providerFilter, successFilter, dateFrom, dateTo]);

  const visibleLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => l.method.toLowerCase().includes(q) || l.provider.toLowerCase().includes(q) || (l.error || '').toLowerCase().includes(q));
  }, [logs, search]);

  const handleExport = () => {
    exportToCsv(
      `sescohub-provider-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Provider', 'Method', 'Success', 'Duration (ms)', 'Error', 'Date'],
      visibleLogs.map((l) => [label(l.provider), l.method, l.success ? 'Yes' : 'No', l.durationMs, l.error || '', formatDate(l.createdAt)]),
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
              placeholder="Search by method, provider, or error..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm transition-all"
            />
          </div>
          <button onClick={handleExport} disabled={visibleLogs.length === 0} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0">
            <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Provider</label>
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue">
              <option value="">All</option>
              {providerNames.map((n) => <option key={n} value={n}>{label(n)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Result</label>
            <select value={successFilter} onChange={(e) => setSuccessFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue">
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
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
        ) : visibleLogs.length === 0 ? (
          <EmptyState tone="admin" icon={ListChecks} title="No API calls match your filters" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {visibleLogs.map((l) => (
                    <tr key={l._id} onClick={() => setSelected(l)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-bold text-gray-900 text-xs">{label(l.provider)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{l.method}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', l.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                          {l.success ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {l.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.durationMs}ms</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-50">
              {visibleLogs.map((l) => (
                <button key={l._id} onClick={() => setSelected(l)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', l.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')}>
                    {l.success ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-[13px]">{label(l.provider)} · <span className="font-mono text-xs text-gray-500">{l.method}</span></p>
                    <p className="text-[10px] text-gray-400">{formatDate(l.createdAt)}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-500 shrink-0">{l.durationMs}ms</p>
                </button>
              ))}
            </div>
            <AdminPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="API Call Details">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', selected.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')}>
                {selected.success ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </div>
              <div>
                <p className="font-extrabold text-gray-900">{label(selected.provider)}</p>
                <p className="text-xs text-gray-400 font-mono">{selected.method}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                <p className="font-bold text-gray-900">{selected.durationMs}ms</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                <p className="font-bold text-gray-900">{formatDate(selected.createdAt)}</p>
              </div>
            </div>
            {selected.error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Error</p>
                <p className="text-sm text-red-700 font-mono break-words">{selected.error}</p>
              </div>
            )}
            {selected.failReason && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fail Reason</p>
                <p className="text-sm text-gray-700">{selected.failReason}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ============================================================
// ANALYTICS TAB
// ============================================================
function AnalyticsTab({ data }: { data: ProviderDashboardResponse }) {
  const providerNames = data.providers.map((p) => p.name);
  const [focusProvider, setFocusProvider] = useState<string>('all');

  const chartData = useMemo(() => {
    const byDate = new Map<string, any>();
    for (const point of data.dailySeries) {
      if (focusProvider !== 'all' && point.provider !== focusProvider) continue;
      if (!byDate.has(point.date)) byDate.set(point.date, { date: point.date, total: 0, success: 0, failed: 0, durationSum: 0, durationCount: 0 });
      const bucket = byDate.get(point.date);
      bucket.total += point.total;
      bucket.success += point.success;
      bucket.failed += point.failed;
      bucket.durationSum += point.avgResponseMs * point.total;
      bucket.durationCount += point.total;
    }
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({
        date: b.date.slice(5), // MM-DD
        requests: b.total,
        successRate: b.total > 0 ? Math.round((b.success / b.total) * 1000) / 10 : 0,
        failed: b.failed,
        avgResponseMs: b.durationCount > 0 ? Math.round(b.durationSum / b.durationCount) : 0,
      }));
  }, [data.dailySeries, focusProvider]);

  if (data.dailySeries.length === 0) {
    return <EmptyState tone="admin" icon={TrendingUp} title="No provider activity yet" description="Charts will populate once purchases start flowing through providers." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFocusProvider('all')} className={cn('px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all', focusProvider === 'all' ? 'border-admin-navy bg-admin-navy text-white' : 'border-gray-100 text-gray-600')}>
          All Providers
        </button>
        {providerNames.map((n) => (
          <button key={n} onClick={() => setFocusProvider(n)} className={cn('px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all', focusProvider === n ? 'border-admin-navy bg-admin-navy text-white' : 'border-gray-100 text-gray-600')}>
            {label(n)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="admin-card p-5">
          <h3 className="font-extrabold text-gray-900 text-sm mb-4 font-display">Success Rate (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v: any) => [`${v}%`, 'Success Rate']} />
              <Area type="monotone" dataKey="successRate" stroke="#22C55E" strokeWidth={2} fill="url(#successGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card p-5">
          <h3 className="font-extrabold text-gray-900 text-sm mb-4 font-display">Average Response Time (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip formatter={(v: any) => [`${v}ms`, 'Avg Response']} />
              <Line type="monotone" dataKey="avgResponseMs" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card p-5">
          <h3 className="font-extrabold text-gray-900 text-sm mb-4 font-display">Requests Per Day (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="requests" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card p-5">
          <h3 className="font-extrabold text-gray-900 text-sm mb-4 font-display">Failure Trend (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="failGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} fill="url(#failGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
