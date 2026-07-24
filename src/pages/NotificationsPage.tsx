import { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle2, XCircle, Clock, ArrowDownLeft, ShoppingCart, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { transactions as txnApi, formatNaira, formatDate, type Transaction } from '../lib/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/**
 * There is no notifications model/endpoint anywhere in this backend — building
 * a full push/email notification system would be new backend surface area,
 * not a frontend redesign. Instead, this derives a real, honest activity feed
 * from the transactions the user already has (no fake/mock data), read-state
 * tracked locally since there's no backend field for it either.
 */
const READ_KEY = 'shb_read_notifications';

function getReadIds(): string[] {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]'); } catch { return []; }
}
function markAllRead(ids: string[]) {
  try { localStorage.setItem(READ_KEY, JSON.stringify(ids)); } catch { /* best-effort only */ }
}

type Category = 'wallet' | 'purchase' | 'failed';

function notifMeta(tx: Transaction): { icon: typeof ArrowDownLeft; color: string; title: string; body: string; category: Category } {
  if (tx.category === 'deposit' || (tx.amount > 0 && tx.status === 'success')) {
    return { icon: ArrowDownLeft, color: 'text-green-600 bg-green-100', title: 'Wallet Funded', body: `${formatNaira(tx.amount)} was added to your wallet.`, category: 'wallet' };
  }
  const status = tx.deliveryStatus === 'delivered' || tx.status === 'success' ? 'delivered'
    : tx.deliveryStatus === 'failed' || tx.status === 'failed' ? 'failed' : 'pending';

  if (status === 'delivered') {
    return { icon: CheckCircle2, color: 'text-green-600 bg-green-100', title: `${tx.product} delivered`, body: `${formatNaira(Math.abs(tx.amount))} to ${tx.recipient || 'your account'}.`, category: 'purchase' };
  }
  if (status === 'failed') {
    return { icon: XCircle, color: 'text-red-600 bg-red-100', title: `${tx.product} failed`, body: 'Refunded to your wallet automatically.', category: 'failed' };
  }
  return { icon: Clock, color: 'text-amber-600 bg-amber-100', title: `${tx.product} pending`, body: 'We\u2019ll notify you once it\u2019s delivered.', category: 'purchase' };
}

function groupLabel(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 7);
  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This week';
  return 'Earlier';
}

const FILTERS: { id: 'ALL' | Category; label: string; icon: typeof Bell }[] = [
  { id: 'ALL', label: 'All', icon: Bell },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'purchase', label: 'Purchases', icon: ShoppingCart },
  { id: 'failed', label: 'Failed', icon: XCircle },
];

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>(getReadIds());
  const [filter, setFilter] = useState<'ALL' | Category>('ALL');

  useEffect(() => {
    (async () => {
      try {
        const res = await txnApi.list();
        setTxns(res.transactions || []);
      } catch {
        // fail silently — empty state handles it
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const unreadCount = useMemo(() => txns.filter((t) => !readIds.includes(t.id)).length, [txns, readIds]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { wallet: 0, purchase: 0, failed: 0 };
    for (const t of txns) c[notifMeta(t).category]++;
    return c;
  }, [txns]);

  const grouped = useMemo(() => {
    const filtered = filter === 'ALL' ? txns : txns.filter((t) => notifMeta(t).category === filter);
    const groups = new Map<string, Transaction[]>();
    for (const t of filtered.slice(0, 60)) {
      const label = groupLabel(new Date(t.date));
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(t);
    }
    return groups;
  }, [txns, filter]);

  const handleMarkAllRead = () => {
    const ids = txns.map((t) => t.id);
    setReadIds(ids);
    markAllRead(ids);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 content-reveal pb-8">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread update${unreadCount !== 1 ? 's' : ''}` : 'You\u2019re all caught up.'}
        icon={Bell}
        actions={unreadCount > 0 ? (
          <button onClick={handleMarkAllRead} className="text-xs font-bold text-shb-gold-dark hover:underline">
            Mark all read
          </button>
        ) : undefined}
      />

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => {
          const count = f.id === 'ALL' ? txns.length : counts[f.id];
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all duration-200',
                filter === f.id ? 'bg-shb-navy text-white border-shb-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-shb-gold-soft',
              )}
            >
              <f.icon size={13} /> {f.label}
              {count > 0 && (
                <span className={cn('text-[10px] rounded-full px-1.5 py-0.5', filter === f.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="shb-card overflow-hidden">
        {isLoading ? (
          <SkeletonList rows={5} />
        ) : grouped.size === 0 ? (
          <EmptyState
            icon={filter === 'ALL' ? ShoppingCart : FILTERS.find((f) => f.id === filter)!.icon}
            title={filter === 'ALL' ? 'No activity yet' : `No ${filter} notifications`}
            description={filter === 'ALL' ? 'Updates about your purchases and wallet will show up here.' : undefined}
            action={filter !== 'ALL' ? <button onClick={() => setFilter('ALL')} className="text-shb-gold-dark text-sm font-bold hover:underline">Show all</button> : undefined}
          />
        ) : (
          Array.from(grouped.entries()).map(([label, items]) => (
            <div key={label}>
              <div className="px-4 sm:px-5 py-2 bg-gray-50/70 sticky top-0">
                <span className="shb-eyebrow">{label}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((tx) => {
                  const meta = notifMeta(tx);
                  const Icon = meta.icon;
                  const isUnread = !readIds.includes(tx.id);
                  return (
                    <div key={tx.id} className={cn('flex items-start gap-3 px-4 sm:px-5 py-3 relative transition-colors', isUnread && 'bg-shb-gold-soft/10')}>
                      {isUnread && <span className="absolute left-2 top-6 w-1.5 h-1.5 rounded-full bg-shb-gold" />}
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{meta.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{meta.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
