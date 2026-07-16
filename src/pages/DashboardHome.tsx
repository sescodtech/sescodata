import { useState, useEffect } from 'react';
import { Wallet, Smartphone, Tv, Zap, ArrowDownLeft, Clock, ShoppingCart, ChevronRight, GraduationCap, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { transactions as txnApi, formatNaira, formatDate, type Transaction } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const QUICK_ACTIONS = [
  { title: 'Buy Data',      icon: ShoppingCart,   to: '/app/buy-data' },
  { title: 'Buy Airtime',   icon: Smartphone,     to: '/app/buy-airtime' },
  { title: 'TV Subscription', icon: Tv,           to: '/app/tv' },
  { title: 'Electricity',   icon: Zap,            to: '/app/electricity' },
  { title: 'Exam PINs',     icon: GraduationCap,  to: '/app/exam-pins' },
  { title: 'Wallet',        icon: Wallet,         to: '/app/wallet' },
];

function resolvedStatus(tx: Transaction) {
  if (tx.deliveryStatus === 'delivered' || tx.status === 'success') return 'delivered';
  if (tx.deliveryStatus === 'failed' || tx.status === 'failed') return 'failed';
  return 'pending';
}

export default function DashboardHome() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(true);

  const loadTxns = async () => {
    setIsLoadingTxns(true);
    try {
      const res = await txnApi.list();
      setTxns(res.transactions);
    } catch {
      // silently fail — empty state handles it
    } finally {
      setIsLoadingTxns(false);
    }
  };

  useEffect(() => { loadTxns(); }, []);

  const totalSpent = txns.filter((t) => resolvedStatus(t) === 'delivered' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const successCount = txns.filter((t) => resolvedStatus(t) === 'delivered').length;
  const recentTxns = txns.slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8 content-reveal">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 font-display">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your account.</p>
        </div>
        <Link to="/app/buy-data" className="shb-btn-primary text-sm px-4 py-2.5 flex items-center gap-2 self-start sm:self-auto">
          <ShoppingCart size={16} /> Buy Data
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Wallet Card — matches WalletPage's balance card for consistency */}
        <Link to="/app/wallet" className="lg:col-span-2 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl block bg-gradient-to-br from-shb-navy via-shb-navy-2 to-shb-navy-3 group">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-shb-gold/15 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-shb-gold-soft" />
              <p className="text-shb-gold-soft text-sm font-semibold">Wallet Balance</p>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 sm:mb-8 font-display">{formatNaira(user?.walletBalance ?? 0)}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1 border border-white/10 group-hover:bg-white/15 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <TrendingUp size={18} className="text-shb-gold-soft" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Total Spent</span>
                </div>
                <p className="text-lg sm:text-xl font-bold">{formatNaira(totalSpent)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1 border border-white/10 group-hover:bg-white/15 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Delivered</span>
                </div>
                <p className="text-lg sm:text-xl font-bold">{successCount}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Actions */}
        <div className="shb-card p-4 sm:p-6 flex flex-col justify-between">
          <h3 className="font-bold text-gray-900 mb-4 sm:mb-5 font-display">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl hover:bg-shb-gold-soft/20 transition-colors group border border-transparent hover:border-shb-gold-soft touch-manipulation"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-1.5 sm:mb-2 bg-shb-gold-soft/50 text-shb-gold-dark group-hover:scale-110 transition-transform">
                  <action.icon size={17} />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-gray-700 text-center leading-tight">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="shb-card overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 font-display">
                <Clock size={18} className="text-shb-gold-dark" />
                Recent Purchases
              </h3>
              <Link to="/app/transactions" className="text-xs font-bold text-shb-gold-dark hover:underline">View All</Link>
            </div>

            {isLoadingTxns ? (
              <SkeletonList rows={5} />
            ) : recentTxns.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No transactions yet"
                description="Your purchases will show up here."
                action={<Link to="/app/buy-data" className="mt-1 text-sm text-shb-gold-dark font-bold hover:underline">Buy your first data plan →</Link>}
              />
            ) : (
              <div className="divide-y divide-gray-50">
                {recentTxns.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-shb-gold-soft/50 text-shb-gold-dark')}>
                        {tx.amount > 0 ? <ArrowDownLeft size={18} /> : <ShoppingCart size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm leading-tight truncate">{tx.product}</p>
                        <p className="text-xs text-gray-500 font-medium truncate">{tx.recipient || formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={cn('font-bold text-sm', tx.amount > 0 ? 'text-green-600' : 'text-gray-900')}>
                        {tx.amount > 0 ? '+' : ''}{formatNaira(Math.abs(tx.amount))}
                      </p>
                      <StatusBadge status={resolvedStatus(tx)} className="mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="shb-card p-6">
            <h3 className="font-bold text-gray-900 mb-4 font-display">Account Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Delivered orders</span>
                <span className="text-sm font-bold text-gray-900">{successCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Total transactions</span>
                <span className="text-sm font-bold text-gray-900">{txns.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Account status</span>
                <span className="text-sm font-bold text-green-600">Active</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-6 text-white relative overflow-hidden group cursor-pointer bg-gradient-to-br from-shb-navy to-shb-navy-3">
            <h4 className="text-xl font-bold mb-2 font-display">Need Help?</h4>
            <p className="text-gray-300 text-sm mb-4">Our support team is available to help with any issue.</p>
            <Link
              to="/app/support"
              className="bg-shb-gold text-shb-navy px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
            >
              Contact Support <ChevronRight size={14} />
            </Link>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-shb-gold/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
