import { ReactNode } from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({
  title,
  description,
  icon: Icon,
  backTo,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backTo?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {backTo && (
          <Link to={backTo} className="p-1.5 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-100 shrink-0">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
        )}
        {Icon && (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-shb-navy shadow-md bg-gradient-to-br from-shb-gold-soft to-shb-gold shrink-0" style={{ boxShadow: 'var(--shadow-gold)' }}>
            <Icon size={16} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="shb-page-title truncate">{title}</h1>
          {description && <p className="text-gray-500 text-[10.5px] sm:text-[11.5px] truncate">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
