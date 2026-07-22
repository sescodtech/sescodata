import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: ReactNode;
  trailing?: ReactNode;
}

/**
 * One input primitive for the whole app: label + left icon + error state +
 * optional trailing element (e.g. show/hide password toggle). Built on the
 * .shb-input CSS class in index.css so styling stays centralized.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, hint, trailing, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-bold text-gray-700 block">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={`shb-input ${icon ? 'pl-11' : 'pl-4'} ${trailing ? 'pr-12' : ''} ${error ? 'shb-input-error' : ''} ${className}`}
            {...props}
          />
          {trailing && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
        {!error && hint && <div className="text-xs text-gray-400">{hint}</div>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export default Input;
