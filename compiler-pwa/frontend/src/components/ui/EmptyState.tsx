import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
  compact = false,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-16',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-raised text-faint">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-mute">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}