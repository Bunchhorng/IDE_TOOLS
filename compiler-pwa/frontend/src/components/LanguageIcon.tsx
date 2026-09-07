import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type LangGlyph = 'c' | 'cpp' | 'python' | 'file';

const GLYPHS: Record<Exclude<LangGlyph, 'file'>, { bg: string; fg: string; label: string; node: ReactNode }> = {
  c: {
    bg: 'bg-sky-500/15 text-sky-500 dark:text-sky-400',
    fg: '',
    label: 'C',
    node: <><path d="M18 8a6 6 0 0 0-9.33-5" /><path d="M17.6 10.6A6 6 0 1 1 15 19" /></>,
  },
  cpp: {
    bg: 'bg-primary/15 text-primary',
    fg: '',
    label: 'C++',
    node: (
      <>
        <path d="M15 12h8M9 12H1" />
        <path d="M18 6v12M16 12h-2M6 12H4" />
      </>
    ),
  },
  python: {
    bg: 'bg-warning/15 text-warning',
    fg: '',
    label: 'Py',
    node: <><path d="M12 7V2h-2v5" /><path d="M6 6.5A.5.5 0 0 1 6.5 6h7a.5.5 0 0 1 0 1h-6a1.5 1.5 0 0 0 0 3h5a1.5 1.5 0 0 1 0 3H7" /><path d="M12 8v5h2V8" /></>,
  },
};

export function LanguageIcon({
  lang,
  size = 'md',
  className,
}: {
  lang: LangGlyph;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = { sm: 'h-5 w-5 rounded', md: 'h-7 w-7 rounded-md', lg: 'h-9 w-9 rounded-lg' }[size];
  const icon = { sm: 10, md: 14, lg: 17 }[size];

  if (lang === 'file') {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center bg-raised text-faint', box, className)}
      >
        <FileGlyph size={icon} />
      </span>
    );
  }

  const g = GLYPHS[lang];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center font-bold', g.bg, box, className)}>
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label={g.label}>
        {g.node}
      </svg>
    </span>
  );
}

function FileGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}