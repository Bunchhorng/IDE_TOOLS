import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary-hover focus-visible:ring-ring active:scale-[0.98] disabled:bg-primary/50 disabled:text-white disabled:shadow-none',
  secondary:
    'bg-panel text-ink border border-edge hover:border-primary/50 hover:bg-raised focus-visible:ring-ring active:bg-panel',
  outline:
    'bg-transparent text-primary border border-primary/40 hover:bg-primary/5 focus-visible:ring-ring active:bg-primary/10 disabled:text-mute disabled:border-edge',
  ghost:
    'bg-transparent text-mute hover:bg-raised hover:text-ink focus-visible:ring-ring active:bg-panel disabled:text-mute',
  danger:
    'bg-error text-white shadow-sm hover:bg-error/90 focus-visible:ring-error/40 active:scale-[0.98] disabled:bg-error/50 disabled:text-white disabled:shadow-none',
  success:
    'bg-success text-white shadow-sm hover:bg-success/90 focus-visible:ring-success/40 active:scale-[0.98] disabled:bg-success/50 disabled:text-white disabled:shadow-none',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-9.5 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-lg',
};

/**
 * Compose button classes for non-<button> elements (e.g. <Link> or <div>).
 */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return cn(
    'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-page',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, fullWidth = false, className, children, disabled, ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-page disabled:cursor-not-allowed disabled:opacity-80',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" className="text-current" />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';

export function Spinner({ size = 'md', className }: { size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const px = { xs: 14, sm: 18, md: 26, lg: 44 }[size];
  return (
    <svg
      className={cn('animate-spin', className)}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function IconButton({
  name,
  label,
  size = 'icon',
  className,
  ...rest
}: ButtonProps & { name: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size={size}
      className={cn('rounded-md', className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={name as Parameters<typeof Icon>[0]['name']} size={size === 'icon' ? 18 : 16} />
    </Button>
  );
}