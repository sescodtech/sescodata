import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-shb-gold-soft/40">
        <Icon size={24} className="text-shb-gold-dark" />
      </div>
      <p className="text-gray-800 text-sm font-bold">{title}</p>
      {description && <p className="text-xs text-gray-400 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
