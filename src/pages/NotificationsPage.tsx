import { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle2, XCircle, Clock, ArrowDownLeft, ShoppingCart } from 'lucide-react';
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
  try { localStorage.setItem(READ_KEY, JSON.stringify(ids)); } catch {}
}

function notifMeta(tx: Transaction) {
  // Deposits are positive-amount, purchases negative — reliable since the
  // backend fix that made purchase ledger entries consistently negative.
  if (tx.category === 'deposit' || (tx.amount > 0 && tx.status === 'success')) {
    return { icon: ArrowDownLeft, color: 'text-green-600 bg-green-100', title: 'Wallet Funded', body: `${formatNaira(tx.amount)} was added to your wallet.` };
  }
  const status = tx.deliveryStatus === 'delivered' || tx.status === 'success' ? 'delivered'
    : tx.deliveryStatus === 'failed' || tx.status === 'failed' ? 'failed' : 'pending';

  if (status === 'delivered') {
    return { icon: CheckCircle2, color: 'text-green-600 bg-green-100', title: `${tx.product} delivered`, body: `${formatNaira(Math.abs(tx.amount))} to ${tx.recipient || 'your account'}.` };
  }
  if (status === 'failed') {
    return { icon: XCircle, color: 'text-red-600 bg-red-100', title: `${tx.product} failed`, body: 'Refunded to your wallet automatically.' };
  }
  return { icon: Clock, color: 'text-amber-600 bg-amber-100', title: `${tx.product} pending`, body: 'We\u2019ll notify you once it\u2019s delivered.' };
}

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>(getReadIds());

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

  const handleMarkAllRead = () => {
    const ids = txns.map((t) => t.id);
    setReadIds(ids);
    markAllRead(ids);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 content-reveal pb-8">
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

      <div className="shb-card overflow-hidden">
        {isLoading ? (
          <SkeletonList rows={5} />
        ) : txns.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No activity yet" description="Updates about your purchases and wallet will show up here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {txns.slice(0, 30).map((tx) => {
              const meta = notifMeta(tx);
              const Icon = meta.icon;
              const isUnread = !readIds.includes(tx.id);
              return (
                <div key={tx.id} className={cn('flex items-start gap-3 px-4 sm:px-6 py-4 relative', isUnread && 'bg-shb-gold-soft/10')}>
                  {isUnread && <span className="absolute left-2 top-6 w-1.5 h-1.5 rounded-full bg-shb-gold" />}
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{meta.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{formatDate(tx.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
