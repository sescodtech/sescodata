import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

/**
 * Shared shell for Login / Register / Forgot / Reset. Mobile-first: a single
 * centered column that reads like a native fintech app on phone (OPay/Kuda/
 * PalmPay style — brand mark up top, card below, no split desktop hero that
 * only ever showed on large screens). On wider viewports it just centers
 * with a max width rather than switching to a completely different layout,
 * so there's one visual language instead of two.
 */
export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  backTo,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  backTo?: { to: string; label: string };
}) {
  return (
    <div className="min-h-screen bg-shb-bg flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center px-5 py-10 sm:py-14">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-shb-gold to-shb-gold-dark shrink-0"
                style={{ boxShadow: 'var(--shadow-gold)' }}
              >
                <span className="text-white font-extrabold text-xl leading-none font-display">S</span>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-gray-900 font-display">SescoHub</span>
            </Link>
            {backTo && (
              <Link to={backTo.to} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                {backTo.label}
              </Link>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-7">
              {eyebrow && (
                <span className="shb-badge shb-badge-info mb-3">{eyebrow}</span>
              )}
              <h1 className="text-[26px] font-extrabold text-gray-900 font-display tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle && <p className="text-[15px] text-gray-500 mt-1.5 leading-snug">{subtitle}</p>}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-7">
              {children}
            </div>

            {footer && <div className="mt-6 text-center">{footer}</div>}
          </motion.div>
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-300 pb-6 font-medium">
        © {new Date().getFullYear()} SescoHub · Secured wallet, data, airtime &amp; bills
      </p>
    </div>
  );
}
