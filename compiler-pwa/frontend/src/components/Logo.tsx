import { cn } from '../lib/cn';
import logoUrl from '../assets/logo.png';

export function Logo({ size = 'md', withText = true, className }: { size?: 'sm' | 'md' | 'lg'; withText?: boolean; className?: string }) {
  const box = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' }[size];
  const text = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src={logoUrl} alt="CodeRunner logo" className={cn('shrink-0 rounded-lg object-contain', box)} />
      {withText && (
        <span className={cn('font-semibold tracking-tight text-ink', text)}>
          Code<span className="text-primary">Runner</span>
        </span>
      )}
    </span>
  );
}