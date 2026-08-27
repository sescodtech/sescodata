import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../lib/utils';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'customer',
  variant = 'empty',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** 'customer' keeps the gold SescoHub brand treatment; 'admin' uses the operations-console blue. */
  tone?: 'customer' | 'admin';
  /** 'empty' = neutral brand tint (default). 'error'/'success' override the tint regardless of tone, for consistent error/success states app-wide. */
  variant?: 'empty' | 'error' | 'success';
}) {
  const iconWrap =
    variant === 'error' ? 'bg-red-50' :
    variant === 'success' ? 'bg-green-50' :
    tone === 'admin' ? 'bg-admin-blue-soft' : 'bg-shb-gold-soft/40';
  const iconColor =
    variant === 'error' ? 'text-red-500' :
    variant === 'success' ? 'text-green-500' :
    tone === 'admin' ? 'text-admin-blue' : 'text-shb-gold-dark';

  return (
    <div className="flex flex-col items-center justify-center py-10 px-5 text-center gap-2.5">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconWrap)}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-gray-800 text-[13px] font-bold">{title}</p>
      {description && <p className="text-[12px] text-gray-400 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
