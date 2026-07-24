import { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Smartphone, Tv, Zap, ArrowDownLeft, Clock, ShoppingCart, ChevronRight,
  GraduationCap, CheckCircle2, TrendingUp, Bell, Star, ShieldCheck, Tag, Phone as PhoneIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { transactions as txnApi, products as productsApi, formatNaira, formatDate, type Transaction, type Product } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonList, Skeleton } from '../components/Skeleton';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useFavoriteNumbers } from '../lib/useFavoriteNumbers';

const QUICK_ACTIONS = [
  { title: 'Data',        icon: ShoppingCart,   to: '/app/buy-data' },
  { title: 'Airtime',     icon: Smartphone,     to: '/app/buy-airtime' },
  { title: 'TV',          icon: Tv,             to: '/app/tv' },
  { title: 'Electricity', icon: Zap,            to: '/app/electricity' },
  { title: 'Exam PINs',   icon: GraduationCap,  to: '/app/exam-pins' },
  { title: 'Wallet',      icon: Wallet,         to: '/app/wallet' },
];

const SECURITY_TIPS = [
  'Never share your password or OTP with anyone, including SescoHub staff.',
  'Use a unique password you don\'t reuse on other sites.',
  'Log out of shared or public devices after every session.',
  'We\'ll never ask for your password over email or phone.',
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
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const { favorites, toggleFavorite, isFavorite } = useFavoriteNumbers();
  const tipOfTheDay = SECURITY_TIPS[new Date().getDate() % SECURITY_TIPS.length];

  useEffect(() => {
    (async () => {
      setIsLoadingTxns(true);
      try {
        const res = await txnApi.list();
        setTxns(res.transactions);
      } catch {
        // silently fail — empty state handles it
      } finally {
        setIsLoadingTxns(false);
      }
    })();
    (async () => {
      try {
        const res = await productsApi.list();
        setPromoProducts(res.products.filter((p) => p.is_promo && p.original_price && p.original_price > p.price).slice(0, 4));
      } catch {
        // Promotions are a nice-to-have — never block the dashboard on this.
      }
    })();
  }, []);

  const totalSpent = txns.filter((t) => resolvedStatus(t) === 'delivered' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const successCount = txns.filter((t) => resolvedStatus(t) === 'delivered').length;
  const recentTxns = txns.slice(0, 4);

  // Recent numbers: derived from real purchase history recipients — no new
  // backend needed. "Favorite" pin is a genuine, working feature stored
  // locally on-device (localStorage) since there's no beneficiaries API yet.
  const recentNumbers = useMemo(() => {
    const seen = new Map<string, { number: string; product: string }>();
    for (const t of txns) {
      if (t.recipient && /^\d{10,11}$/.test(t.recipient.replace(/\D/g, '')) && !seen.has(t.recipient)) {
        seen.set(t.recipient, { number: t.recipient, product: t.product });
      }
    }
    const list = Array.from(seen.values());
    // Favorited numbers first, then most-recent order.
    return list.sort((a, b) => Number(isFavorite(b.number)) - Number(isFavorite(a.number))).slice(0, 5);
  }, [txns, favorites]);

  const unreadNotifPreview = txns.slice(0, 2).map((t) => ({
    id: t.id,
    text: t.amount > 0 ? `${formatNaira(t.amount)} was added to your wallet` : `${t.product} purchase ${resolvedStatus(t)}`,
    time: formatDate(t.date),
  }));

  return (
    <div className="space-y-5 sm:space-y-6 content-reveal">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
        <div>
          <h1 className="shb-page-title">Hi, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="shb-body mt-0.5">Here's what's happening with your account.</p>
        </div>
        <Link to="/app/buy-data" className="shb-btn-primary text-sm px-4 py-2.5 self-start sm:self-auto">
          <ShoppingCart size={16} /> Buy Data
        </Link>
      </header>

      {/* Wallet + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link to="/app/wallet" className="lg:col-span-2 rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden block bg-gradient-to-br from-shb-navy via-shb-navy-2 to-shb-navy-3 group transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99]" style={{ boxShadow: 'var(--shadow-pop)' }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-shb-gold/15 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <Wallet size={15} className="text-shb-gold-soft" />
              <p className="text-shb-gold-soft text-[13px] font-semibold">Wallet Balance</p>
            </div>
            <p className="text-[28px] sm:text-3xl font-extrabold tracking-tight mb-5 font-display">{formatNaira(user?.walletBalance ?? 0)}</p>
            <div className="flex gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 flex-1 border border-white/10 group-hover:bg-white/15 transition-colors duration-300">
                <div className="flex justify-between items-start mb-1.5">
                  <TrendingUp size={16} className="text-shb-gold-soft" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300">Spent</span>
                </div>
                <p className="text-base sm:text-lg font-bold">{formatNaira(totalSpent)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 flex-1 border border-white/10 group-hover:bg-white/15 transition-colors duration-300">
                <div className="flex justify-between items-start mb-1.5">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300">Delivered</span>
                </div>
                <p className="text-base sm:text-lg font-bold">{successCount}</p>
              </div>
            </div>
          </div>
        </Link>

        <div className="shb-card-sm sm:p-5 flex flex-col justify-between">
          <h3 className="shb-section-title mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-shb-gold-soft/20 active:scale-95 transition-all duration-200 group border border-transparent hover:border-shb-gold-soft touch-manipulation"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 bg-shb-gold-soft/50 text-shb-gold-dark group-hover:scale-110 transition-transform duration-200">
                  <action.icon size={16} />
                </div>
                <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Promotions + Notifications preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="shb-card-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="shb-section-title flex items-center gap-1.5"><Tag size={14} className="text-shb-gold-dark" /> Active Promotions</h3>
          </div>
          {promoProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-3">No active promotions right now — check back soon.</p>
          ) : (
            <div className="space-y-2">
              {promoProducts.slice(0, 2).map((p) => (
                <Link key={p.id} to="/app/buy-data" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-shb-gold-soft/10 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.provider}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-extrabold text-shb-gold-dark">{formatNaira(p.price)}</p>
                    <p className="text-[10px] text-gray-300 line-through">{formatNaira(p.original_price!)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="shb-card-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="shb-section-title flex items-center gap-1.5"><Bell size={14} className="text-shb-gold-dark" /> Notifications</h3>
            <Link to="/app/notifications" className="text-[11px] font-bold text-shb-gold-dark hover:underline">View all</Link>
          </div>
          {unreadNotifPreview.length === 0 ? (
            <p className="text-xs text-gray-400 py-3">You're all caught up.</p>
          ) : (
            <div className="space-y-2.5">
              {unreadNotifPreview.map((n) => (
                <div key={n.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-shb-gold mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{n.text}</p>
                    <p className="text-[10px] text-gray-400">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transactions & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="shb-card overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="shb-section-title flex items-center gap-1.5">
                <Clock size={14} className="text-shb-gold-dark" /> Recent Purchases
              </h3>
              <Link to="/app/transactions" className="text-[11px] font-bold text-shb-gold-dark hover:underline">View all</Link>
            </div>

            {isLoadingTxns ? (
              <SkeletonList rows={4} />
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
                  <div key={tx.id} className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-shb-gold-soft/50 text-shb-gold-dark')}>
                        {tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ShoppingCart size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-xs sm:text-[13px] leading-tight truncate">{tx.product}</p>
                        <p className="text-[11px] text-gray-500 font-medium truncate">{tx.recipient || formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={cn('font-bold text-[13px]', tx.amount > 0 ? 'text-green-600' : 'text-gray-900')}>
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
        <div className="space-y-4">
          {/* Recent / favorite numbers */}
          <div className="shb-card-sm">
            <h3 className="shb-section-title flex items-center gap-1.5 mb-3"><PhoneIcon size={14} className="text-shb-gold-dark" /> Recent Numbers</h3>
            {recentNumbers.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Numbers you buy for will appear here.</p>
            ) : (
              <div className="space-y-1">
                {recentNumbers.map((n) => (
                  <div key={n.number} className="flex items-center justify-between py-1.5 group">
                    <Link to="/app/buy-data" className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900">{n.number}</p>
                      <p className="text-[10px] text-gray-400 truncate">{n.product}</p>
                    </Link>
                    <button
                      onClick={() => toggleFavorite(n.number)}
                      aria-label={isFavorite(n.number) ? 'Remove from favorites' : 'Save as favorite'}
                      className="p-1.5 text-gray-300 hover:text-shb-gold-dark transition-colors"
                    >
                      <Star size={14} className={isFavorite(n.number) ? 'fill-shb-gold text-shb-gold' : ''} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security tip */}
          <div className="shb-card-sm bg-shb-gold-soft/20 border-shb-gold-soft">
            <h3 className="shb-section-title flex items-center gap-1.5 mb-2"><ShieldCheck size={14} className="text-shb-gold-dark" /> Security Tip</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{tipOfTheDay}</p>
          </div>

          <div className="rounded-3xl p-5 text-white relative overflow-hidden group cursor-pointer bg-gradient-to-br from-shb-navy to-shb-navy-3">
            <h4 className="text-base font-bold mb-1.5 font-display">Need help?</h4>
            <p className="text-gray-300 text-xs mb-3.5 leading-relaxed">Our support team can help with any issue.</p>
            <Link
              to="/app/support"
              className="bg-shb-gold text-white px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 group-hover:gap-2.5 transition-all duration-200"
            >
              Contact Support <ChevronRight size={13} />
            </Link>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-shb-gold/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
