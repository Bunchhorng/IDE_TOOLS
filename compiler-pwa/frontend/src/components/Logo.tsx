import { cn } from '../lib/cn';
import { Icon } from './ui/Icon';

export function Logo({ size = 'md', withText = true, className }: { size?: 'sm' | 'md' | 'lg'; withText?: boolean; className?: string }) {
  const box = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' }[size];
  const text = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }[size];
  const icon = { sm: 15, md: 19, lg: 23 }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn('relative inline-flex items-center justify-center rounded-lg bg-primary text-white shadow-sm', box)}
      >
        <Icon name="play" size={icon} strokeWidth={2.2} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-page bg-success" />
      </span>
      {withText && (
        <span className={cn('font-semibold tracking-tight text-ink', text)}>
          Code<span className="text-primary">Runner</span>
        </span>
      )}
    </span>
  );
}