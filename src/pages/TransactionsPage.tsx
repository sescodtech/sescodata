import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowDownLeft, ShoppingCart, Smartphone, Tv, Zap, GraduationCap, Download, RefreshCw, AlertCircle, ChevronRight, Check, Printer, Share2, Loader2, TrendingUp, CheckCircle2, Clock3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { transactions as txnApi, formatNaira, formatDate, type Transaction } from '../lib/api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import Drawer from '../components/Drawer';
import TransactionReceipt from '../components/TransactionReceipt';
import { downloadReceiptPdf, printReceipt, shareReceipt } from '../lib/receipt';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';

function txIcon(category: string, amount: number) {
  if (amount > 0) return ArrowDownLeft;
  if (category === 'airtime') return Smartphone;
  if (category === 'cable') return Tv;
  if (category === 'electricity' || category === 'bills') return Zap;
  if (category === 'education') return GraduationCap;
  return ShoppingCart;
}

function resolvedStatus(tx: Transaction) {
  if (tx.deliveryStatus === 'delivered' || tx.status === 'success') return 'delivered';
  if (tx.deliveryStatus === 'failed' || tx.status === 'failed') return 'failed';
  return 'pending';
}

type FilterType = 'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING';

function exportCsv(txns: Transaction[]) {
  const header = ['Reference', 'Product', 'Category', 'Recipient', 'Amount', 'Status', 'Date'];
  const rows = txns.map((t) => [t.ref, t.product, t.category, t.recipient, String(t.amount), resolvedStatus(t), formatDate(t.date)]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sescohub-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsPage() {
  useDocumentTitle('Transactions');
  const { user } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await txnApi.list();
      setTxns(res.transactions);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTransactions(); }, []);

  const filteredTxns = useMemo(() => txns.filter((tx) => {
    const status = resolvedStatus(tx);
    const q = searchTerm.toLowerCase();
    const matchSearch =
      tx.ref?.toLowerCase().includes(q) ||
      tx.recipient?.toLowerCase().includes(q) ||
      tx.product?.toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (filter === 'ALL') return true;
    if (filter === 'SUCCESS') return status === 'delivered';
    if (filter === 'FAILED') return status === 'failed';
    if (filter === 'PENDING') return status === 'pending';
    return true;
  }), [txns, searchTerm, filter]);

  const totalSpent = useMemo(() => txns.filter((t) => resolvedStatus(t) === 'delivered' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0), [txns]);
  const deliveredCount = useMemo(() => txns.filter((t) => resolvedStatus(t) === 'delivered').length, [txns]);
  const pendingCount = useMemo(() => txns.filter((t) => resolvedStatus(t) === 'pending').length, [txns]);

  return (
    <div className="space-y-6 content-reveal">
      <PageHeader
        title="Transaction History"
        description="Review all your purchases and receipts."
        actions={
          <>
            <button
              onClick={loadTransactions}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => exportCsv(filteredTxns)}
              disabled={filteredTxns.length === 0}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </>
        }
      />

      {/* Analytics strip */}
      {!isLoading && txns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="shb-card-sm">
            <p className="shb-eyebrow mb-1 flex items-center gap-1"><TrendingUp size={11} /> Total Spent</p>
            <p className="text-base sm:text-lg font-extrabold text-gray-900">{formatNaira(totalSpent)}</p>
          </div>
          <div className="shb-card-sm">
            <p className="shb-eyebrow mb-1 flex items-center gap-1"><CheckCircle2 size={11} /> Delivered</p>
            <p className="text-base sm:text-lg font-extrabold text-green-600">{deliveredCount}</p>
          </div>
          <div className="shb-card-sm">
            <p className="shb-eyebrow mb-1 flex items-center gap-1"><Clock3 size={11} /> Pending</p>
            <p className="text-base sm:text-lg font-extrabold text-amber-500">{pendingCount}</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="shb-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by ref, phone, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-sm"
          />
        </div>
        <div className="flex gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto whitespace-nowrap">
          {(['ALL', 'SUCCESS', 'PENDING', 'FAILED'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 sm:px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                filter === f ? 'bg-white text-shb-navy shadow-sm' : 'text-gray-500 hover:text-gray-900',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="shb-card overflow-hidden">
        {isLoading ? (
          <SkeletonList rows={6} />
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title={error}
            action={<button onClick={loadTransactions} className="shb-btn-primary mt-2 px-5 py-2 text-sm">Try Again</button>}
          />
        ) : filteredTxns.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={searchTerm || filter !== 'ALL' ? 'No transactions match your filter' : 'No transactions yet'}
            description={searchTerm || filter !== 'ALL' ? undefined : 'Your purchases will show up here.'}
            action={(searchTerm || filter !== 'ALL') ? (
              <button onClick={() => { setSearchTerm(''); setFilter('ALL'); }} className="text-shb-gold-dark text-sm font-bold hover:underline">Clear filters</button>
            ) : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 py-4">Transaction</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4 text-right">Date</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {filteredTxns.map((tx) => {
                    const Icon = txIcon(tx.category, tx.amount);
                    return (
                      <tr key={tx.id} onClick={() => setSelected(tx)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-shb-gold-soft/50 text-shb-gold-dark')}>
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-xs leading-tight truncate">{tx.product}</p>
                              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{tx.ref}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('font-bold', tx.amount > 0 ? 'text-green-600' : 'text-gray-900')}>
                            {tx.amount > 0 ? '+' : ''}{formatNaira(Math.abs(tx.amount))}
                          </span>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={resolvedStatus(tx)} /></td>
                        <td className="px-6 py-4"><span className="font-mono text-xs text-gray-600">{tx.recipient || '—'}</span></td>
                        <td className="px-6 py-4 text-right text-xs text-gray-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="px-6 py-4"><ChevronRight size={16} className="text-gray-300" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filteredTxns.map((tx) => {
                const Icon = txIcon(tx.category, tx.amount);
                return (
                  <button key={tx.id} onClick={() => setSelected(tx)} className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-shb-gold-soft/50 text-shb-gold-dark')}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{tx.product}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={cn('font-bold text-sm', tx.amount > 0 ? 'text-green-600' : 'text-gray-900')}>
                        {tx.amount > 0 ? '+' : ''}{formatNaira(Math.abs(tx.amount))}
                      </p>
                      <StatusBadge status={resolvedStatus(tx)} className="mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!isLoading && !error && filteredTxns.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-50 text-xs text-gray-400 font-medium">
            Showing {filteredTxns.length} of {txns.length} transactions
          </div>
        )}
      </div>

      {/* Details Drawer — full digital receipt */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Transaction Receipt">
        {selected && (
          <div className="space-y-5">
            <TransactionReceipt txn={selected} customer={{ name: user?.name ?? '', email: user?.email ?? '' }} status={resolvedStatus(selected)} />

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={async () => {
                  setIsGeneratingPdf(true);
                  try {
                    await downloadReceiptPdf(selected, { name: user?.name ?? '', email: user?.email ?? '' }, resolvedStatus(selected));
                  } finally {
                    setIsGeneratingPdf(false);
                  }
                }}
                disabled={isGeneratingPdf}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 hover:border-shb-gold hover:bg-shb-gold-soft/10 transition-all text-xs font-bold text-gray-700 disabled:opacity-50"
              >
                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF
              </button>
              <button
                onClick={printReceipt}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 hover:border-shb-gold hover:bg-shb-gold-soft/10 transition-all text-xs font-bold text-gray-700"
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={async () => {
                  const r = await shareReceipt(selected);
                  if (r.copiedToClipboard) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
                }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 hover:border-shb-gold hover:bg-shb-gold-soft/10 transition-all text-xs font-bold text-gray-700"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />} {copied ? 'Copied' : 'Share'}
              </button>
            </div>

            {selected.statusMessage && resolvedStatus(selected) === 'failed' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {selected.statusMessage}
              </div>
            )}

            {resolvedStatus(selected) === 'failed' && (
              <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
                Failed transactions are automatically refunded to your wallet. If you don't see the refund,{' '}
                <Link to="/app/support" className="text-shb-gold-dark font-bold hover:underline">contact support</Link>.
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
