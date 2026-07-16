import { CheckCircle2, Clock, XCircle, LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type Status = 'delivered' | 'pending' | 'failed' | 'success' | string;

const STATUS_MAP: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  delivered: { label: 'Delivered', icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200' },
  success:   { label: 'Success',   icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200' },
  pending:   { label: 'Pending',   icon: Clock,         className: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed:    { label: 'Failed',    icon: XCircle,       className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, icon: Clock, className: 'bg-gray-50 text-gray-600 border-gray-200' };
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border', meta.className, className)}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}
