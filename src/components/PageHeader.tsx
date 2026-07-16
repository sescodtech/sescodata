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
    <header className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {backTo && (
          <Link to={backTo} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-100 shrink-0">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
        )}
        {Icon && (
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-shb-navy shadow-lg bg-gradient-to-br from-shb-gold-soft to-shb-gold shrink-0" style={{ boxShadow: 'var(--shadow-gold)' }}>
            <Icon size={22} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 font-display truncate">{title}</h1>
          {description && <p className="text-gray-500 text-sm truncate">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
