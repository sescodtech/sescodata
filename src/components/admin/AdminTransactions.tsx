import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search, Download, RefreshCw, ChevronDown, Receipt, ArrowDownLeft, ShoppingCart,
  Printer, Share2, Loader2, Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { admin, formatNaira, formatDate, type AdminTransaction, type Transaction } from '../../lib/api';
import { exportToCsv } from '../../lib/adminCsvExport';
import EmptyState from '../EmptyState';
import { SkeletonList } from '../Skeleton';
import StatusBadge from '../StatusBadge';
import Drawer from '../Drawer';
import TransactionReceipt from '../TransactionReceipt';
import { downloadReceiptPdf, printReceipt, shareReceipt } from '../../lib/receipt';
import AdminPagination from './AdminPagination';

const CATEGORY_OPTIONS = ['', 'data', 'airtime', 'cable', 'electricity', 'education', 'recharge', 'admin_adjustment', 'deposit'];
const STATUS_OPTIONS = ['', 'delivered', 'pending', 'failed'];

/** Adapts the admin's Mongo-shaped transaction into the flat shape TransactionReceipt expects — same fields, different source. */
function toReceiptShape(tx: AdminTransaction): Transaction {
  return {
    id: tx._id,
    ref: tx.paymentReference,
    product: tx.product?.name || tx.type,
    category: tx.product?.category || tx.type,
    recipient: tx.product?.recipient || '',
    amount: tx.amount,
    status: tx.status as Transaction['status'],
    deliveryStatus: tx.deliveryStatus,
    date: tx.createdAt,
    statusMessage: tx.failReason,
  };
}

export default function AdminTransactions() {
  const [txns, setTxns] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<AdminTransaction | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await admin.transactions({
        page, limit: pageSize, search: search || undefined,
        status: statusFilter || undefined, category: categoryFilter || undefined,
        dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
      });
      setTxns(res.transactions);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, dateFrom, dateTo]);

  const handleExport = () => {
    exportToCsv(
      `sescohub-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Reference', 'Customer', 'Product', 'Category', 'Amount', 'Status', 'Date'],
      txns.map((t) => {
        const user = typeof t.userId === 'object' ? t.userId : null;
        return [t.paymentReference, user?.email || '', t.product?.name || t.type, t.product?.category || '', t.amount, t.deliveryStatus, formatDate(t.createdAt)];
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="shb-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, product, or recipient..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-admin-blue text-sm transition-all"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            Filters <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button onClick={load} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          </button>
          <button onClick={handleExport} disabled={txns.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize">
                {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o || 'All'}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-admin-blue capitalize">
                {CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o ? o.replace('_', ' ') : 'All'}</option>)}
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
        )}
      </div>

      {/* Table */}
      <div className="shb-card overflow-hidden">
        {isLoading ? (
          <SkeletonList rows={8} />
        ) : txns.length === 0 ? (
          <EmptyState tone="admin" icon={Receipt} title="No transactions match your filters" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-4 py-3">Transaction</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {txns.map((tx) => {
                    const user = typeof tx.userId === 'object' ? tx.userId : null;
                    return (
                      <tr key={tx._id} onClick={() => setSelected(tx)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-admin-blue-soft text-admin-blue')}>
                              {tx.amount > 0 ? <ArrowDownLeft size={14} /> : <ShoppingCart size={14} />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-xs truncate">{tx.product?.name || tx.type}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{tx.paymentReference}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{user?.email || '—'}</td>
                        <td className="px-4 py-3 font-bold text-xs text-gray-900">{formatNaira(Math.abs(tx.amount))}</td>
                        <td className="px-4 py-3"><StatusBadge status={tx.deliveryStatus} /></td>
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

      {/* Detail Drawer with Receipt */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Transaction Receipt">
        {selected && (
          <div className="space-y-5">
            <TransactionReceipt
              txn={toReceiptShape(selected)}
              customer={{
                name: typeof selected.userId === 'object' ? selected.userId.name : '',
                email: typeof selected.userId === 'object' ? selected.userId.email : '',
              }}
              status={selected.deliveryStatus}
            />
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={async () => {
                  setIsGeneratingPdf(true);
                  try {
                    await downloadReceiptPdf(toReceiptShape(selected), {
                      name: typeof selected.userId === 'object' ? selected.userId.name : '',
                      email: typeof selected.userId === 'object' ? selected.userId.email : '',
                    }, selected.deliveryStatus);
                  } finally {
                    setIsGeneratingPdf(false);
                  }
                }}
                disabled={isGeneratingPdf}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 hover:border-admin-blue hover:bg-admin-blue-soft/50 transition-all text-xs font-bold text-gray-700 disabled:opacity-50"
              >
                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF
              </button>
              <button onClick={printReceipt} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 hover:border-admin-blue hover:bg-admin-blue-soft/50 transition-all text-xs font-bold text-gray-700">
                <Printer size={16} /> Print
              </button>
              <button
                onClick={async () => {
                  const r = await shareReceipt(toReceiptShape(selected));
                  if (r.copiedToClipboard) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
                }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 hover:border-admin-blue hover:bg-admin-blue-soft/50 transition-all text-xs font-bold text-gray-700"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />} {copied ? 'Copied' : 'Share'}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
