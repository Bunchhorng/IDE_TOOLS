import { cn } from '../../lib/cn';

const BGS = [
  'bg-primary',
  'bg-info',
  'bg-success',
  'bg-warning',
  'bg-error',
  'bg-purple-500',
  'bg-teal-500',
  'bg-rose-500',
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const px = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-lg' }[size];
  const bg = BGS[(name.codePointAt(0) ?? 0) % BGS.length];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', px, className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white',
        bg,
        px,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}