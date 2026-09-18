import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon, type IconName } from './Icon';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: IconName;
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
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
              <Icon name={leftIcon} size={16} />
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'h-9.5 w-full rounded-lg border border-edge bg-panel px-3 text-sm text-ink placeholder:text-faint',
              'transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              leftIcon && 'pl-9',
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