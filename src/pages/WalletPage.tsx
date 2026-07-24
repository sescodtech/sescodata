import { useState, useEffect, useMemo } from 'react';
import { CreditCard, ArrowDownLeft, ArrowUpRight, Wallet, ShieldCheck, Loader2, AlertCircle, RefreshCw, ShoppingCart, Sparkles, CheckCircle2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { wallet as walletApi, transactions as txnApi, formatNaira, formatDate, type Transaction, type WalletLedgerEntry } from '../lib/api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { Skeleton, SkeletonList } from '../components/Skeleton';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function WalletPage() {
  useDocumentTitle('Wallet');
  const { user, refreshUser } = useAuth();

  const [walletBalance, setWalletBalance]   = useState<number>(0);
  const [ledger, setLedger]                 = useState<WalletLedgerEntry[]>([]);
  const [txns, setTxns]                     = useState<Transaction[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [topUpAmount, setTopUpAmount]       = useState('');
  const [topUpError, setTopUpError]         = useState('');
  const [ledgerSearch, setLedgerSearch]     = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [walletRes, txnRes] = await Promise.all([
        walletApi.get(),
        txnApi.list(),
      ]);
      setWalletBalance(walletRes.balance);
      setLedger(walletRes.ledger || []);
      setTxns(txnRes.transactions || []);
    } catch {
      // silently fail — show zeros
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const [paymentBanner, setPaymentBanner] = useState<{ type: 'success' | 'pending' | 'failed'; text: string } | null>(null);

  // Handle payment return from Paystack — success, still-processing, or failed.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    if (status === 'success') {
      loadData();
      refreshUser();
      setPaymentBanner({ type: 'success', text: 'Wallet funded successfully!' });
    } else if (status === 'pending') {
      setPaymentBanner({ type: 'pending', text: "Your payment is still processing — we'll credit your wallet as soon as it confirms." });
    } else if (status === 'failed' || status === 'error') {
      setPaymentBanner({ type: 'failed', text: 'That payment did not go through. No funds were deducted.' });
    }
    if (status) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const handleTopUp = async () => {
    const amt = Number(topUpAmount);
    if (!amt || amt < 100) {
      setTopUpError('Minimum deposit is ₦100');
      return;
    }
    setTopUpError('');
    setIsTopUpLoading(true);
    try {
      const res = await walletApi.depositInitiate(amt);
      window.location.href = res.paymentUrl;
    } catch (err: any) {
      setTopUpError(err.message || 'Failed to initiate top-up. Try again.');
      setIsTopUpLoading(false);
    }
  };

  const totalSpent    = txns.filter((t) => t.deliveryStatus === 'delivered').reduce((s, t) => s + Math.abs(t.amount), 0);
  const successCount  = txns.filter((t) => t.deliveryStatus === 'delivered').length;
  const pendingCount  = txns.filter((t) => t.deliveryStatus === 'pending').length;
  const successRate   = txns.length > 0 ? Math.round((successCount / txns.length) * 100) : 0;

  const filteredLedger = useMemo(() => {
    if (!ledgerSearch.trim()) return ledger;
    const q = ledgerSearch.toLowerCase();
    return ledger.filter((e) => e.description?.toLowerCase().includes(q));
  }, [ledger, ledgerSearch]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6 content-reveal pb-8">
      <PageHeader
        title="Wallet"
        description="Fund your wallet and track spending."
        actions={
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />

      <AnimatePresence>
        {paymentBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={cn(
              'p-4 rounded-2xl flex items-start gap-3 text-sm font-medium border',
              paymentBanner.type === 'success' && 'bg-green-50 border-green-200 text-green-700',
              paymentBanner.type === 'pending' && 'bg-amber-50 border-amber-200 text-amber-700',
              paymentBanner.type === 'failed' && 'bg-red-50 border-red-200 text-red-700',
            )}
          >
            {paymentBanner.type === 'success' && <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
            {paymentBanner.type === 'pending' && <Loader2 size={16} className="shrink-0 mt-0.5 animate-spin" />}
            {paymentBanner.type === 'failed' && <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            {paymentBanner.text}
            <button onClick={() => setPaymentBanner(null)} className="ml-auto font-bold shrink-0" aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance Card — premium gold/navy */}
      <div className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden bg-gradient-to-br from-shb-navy via-shb-navy-2 to-shb-navy-3" style={{ boxShadow: 'var(--shadow-pop)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-shb-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-shb-gold/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-shb-gold-soft" />
            <p className="text-shb-gold-soft text-sm font-semibold">Wallet Balance</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-10 sm:h-12 w-32 sm:w-40 bg-white/10 mb-2" />
          ) : (
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 font-display">{formatNaira(walletBalance)}</p>
          )}
          <p className="text-gray-300 text-sm">{user?.name} · {user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="shb-card-sm relative overflow-hidden">
          <p className="shb-eyebrow mb-1.5">Total Spent</p>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{isLoading ? '...' : formatNaira(totalSpent)}</p>
          <div className="absolute -top-8 -right-8 w-20 h-20 bg-shb-gold-soft/40 rounded-full blur-2xl" />
        </div>
        <div className="shb-card-sm">
          <p className="shb-eyebrow mb-1.5">Successful</p>
          <p className="text-xl sm:text-2xl font-extrabold text-green-600 tracking-tight">{successCount}</p>
        </div>
        <div className="shb-card-sm">
          <p className="shb-eyebrow mb-1.5">Pending</p>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-500 tracking-tight">{pendingCount}</p>
        </div>
        <div className="shb-card-sm">
          <p className="shb-eyebrow mb-1.5">Success Rate</p>
          <p className="text-xl sm:text-2xl font-extrabold text-shb-gold-dark tracking-tight">{successRate}%</p>
        </div>
      </div>

      {/* Fund Wallet */}
      <div className="shb-card p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-shb-gold-soft/50">
            <ArrowDownLeft size={20} className="text-shb-gold-dark" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 font-display">Fund Wallet</h2>
            <p className="text-sm text-gray-500">Add money via Paystack — use for purchases</p>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => { setTopUpAmount(String(a)); setTopUpError(''); }}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all touch-manipulation',
                topUpAmount === String(a)
                  ? 'border-shb-gold bg-shb-gold-soft/40 text-shb-gold-dark'
                  : 'border-gray-100 text-gray-700 hover:border-shb-gold-soft',
              )}
            >
              {formatNaira(a)}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
            <input
              type="number"
              value={topUpAmount}
              onChange={(e) => { setTopUpAmount(e.target.value); setTopUpError(''); }}
              placeholder="Enter amount (min ₦100)"
              min="100"
              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold outline-none transition-all text-base"
            />
          </div>
          <button
            onClick={handleTopUp}
            disabled={isTopUpLoading || !topUpAmount}
            className="shb-btn-primary text-base flex items-center justify-center gap-2"
          >
            {isTopUpLoading ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <>Fund Wallet</>}
          </button>
        </div>

        <AnimatePresence>
          {topUpError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={14} /> {topUpError}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={14} />
          <span>Secured by Paystack · Instant credit to wallet</span>
        </div>
      </div>

      {/* Wallet Ledger — Funding History */}
      <div className="shb-card overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-shb-gold-dark" />
            <div>
              <h3 className="shb-section-title">Wallet Activity</h3>
              <p className="text-[11px] text-gray-400">Last 30 entries</p>
            </div>
          </div>
          {ledger.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search wallet activity..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-shb-gold transition-all text-xs"
              />
            </div>
          )}
        </div>
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : filteredLedger.length === 0 ? (
          <EmptyState icon={Sparkles} title={ledgerSearch ? 'No matching activity' : 'No wallet activity yet'} description={ledgerSearch ? undefined : 'Fund your wallet to see activity here.'} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredLedger.map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    entry.type === 'credit' ? 'bg-green-100' : 'bg-red-100')}>
                    {entry.type === 'credit'
                      ? <ArrowDownLeft size={16} className="text-green-600" />
                      : <ArrowUpRight size={16} className="text-red-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 truncate">{entry.description}</p>
                    <p className="text-[11px] text-gray-400">{formatDate(entry.date)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={cn('font-bold text-[13px]', entry.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                    {entry.type === 'credit' ? '+' : '-'}{formatNaira(entry.amount)}
                  </p>
                  {entry.balance !== undefined && (
                    <p className="text-[11px] text-gray-400">Bal: {formatNaira(entry.balance)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="shb-card overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="shb-section-title">Recent Purchases</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Your last transactions</p>
          </div>
        </div>

        {isLoading ? (
          <SkeletonList rows={4} />
        ) : txns.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No transactions yet" description="Your purchases will show up here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {txns.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-shb-gold-soft/50">
                    <CreditCard size={16} className="text-shb-gold-dark" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{tx.product}</p>
                    <p className="text-xs text-gray-400 truncate">{tx.recipient} · {formatDate(tx.date)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-bold text-sm text-gray-900">{formatNaira(Math.abs(tx.amount))}</p>
                  <StatusBadge status={tx.deliveryStatus} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
