import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../lib/utils';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'customer',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** 'customer' keeps the gold SescoHub brand treatment; 'admin' uses the operations-console blue. */
  tone?: 'customer' | 'admin';
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', tone === 'admin' ? 'bg-admin-blue-soft' : 'bg-shb-gold-soft/40')}>
        <Icon size={24} className={tone === 'admin' ? 'text-admin-blue' : 'text-shb-gold-dark'} />
      </div>
      <p className="text-gray-800 text-sm font-bold">{title}</p>
      {description && <p className="text-xs text-gray-400 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
