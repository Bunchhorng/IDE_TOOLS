import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: 'search';
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightSlot, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-ink">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon === 'search' && (
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'h-9.5 w-full rounded-lg border border-edge bg-panel px-3 text-sm text-ink placeholder:text-faint',
              'transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              leftIcon === 'search' && 'pl-9',
              rightSlot != null && 'pr-10',
              error && 'border-error focus:border-error focus:ring-error/20',
              className,
            )}
            {...rest}
          />
          {rightSlot && <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{rightSlot}</div>}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-error">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-faint">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';