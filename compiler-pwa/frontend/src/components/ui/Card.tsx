import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-edge bg-panel shadow-card transition-shadow hover:shadow-card-hover',
        className,
      )}
      {...rest}
    />
  );
}