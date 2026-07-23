import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'shb-btn-primary',
  secondary: 'shb-btn-secondary',
  ghost: 'shb-btn-ghost',
  danger: 'bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-[15px]',
  lg: 'px-6 py-4 text-base',
};

/**
 * Single button primitive for the whole customer app. Existing shb-btn-primary
 * / shb-btn-secondary CSS classes are reused underneath (so anything already
 * using those raw classes keeps working) — this just gives new screens one
 * consistent component instead of hand-rolling className strings each time.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, icon, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`${VARIANT_CLASSES[variant]} ${size !== 'md' ? SIZE_CLASSES[size] : ''} ${fullWidth ? 'w-full' : ''} inline-flex items-center justify-center gap-2 touch-manipulation ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 14 : 18} aria-hidden="true" /> : icon}
        <span>{children}</span>
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
