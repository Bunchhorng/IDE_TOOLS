import { useState } from 'react';
import { useRef } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { LanguageIcon } from '../LanguageIcon';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { Language } from '../../types';

interface LanguageSelectorProps {
  languages: Language[];
  selected: string;
  onChange: (slug: string) => void;
  compact?: boolean;
  align?: 'left' | 'right';
}

export default function LanguageSelector({
  languages,
  selected,
  onChange,
  compact = false,
  align = 'left',
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const current = languages.find((l) => l.slug === selected);

  const defaultTrigger = (
    <button
      onClick={() => setOpen((o) => !o)}
      className={cn(
        'inline-flex items-center gap-2 overflow-hidden rounded-lg border border-edge bg-panel text-[13px] font-medium text-ink transition-colors hover:border-edge-strong',
        compact ? 'h-9 max-w-[38vw] px-2.5 sm:h-8 sm:max-w-none' : 'h-9 px-3',
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      <LanguageIcon
        lang={selected === 'python' ? 'python' : selected === 'c' ? 'c' : 'cpp'}
        size="sm"
      />
      <span className="min-w-0 max-w-24 truncate sm:max-w-none">{current ? current.name : selected}</span>
      {current?.version && <span className="hidden shrink-0 text-[11px] text-faint sm:inline">{current.version}</span>}
      <Icon name="chevronDown" size={13} className="shrink-0 text-faint" />
    </button>
  );

  return (
    <div ref={ref} className="relative min-w-0">
      {defaultTrigger}
      {open && (
        <div
          role="listbox"
          className={cn(
            'fixed inset-x-2 top-[calc(3rem+env(safe-area-inset-top))] z-50 origin-top animate-cr-pop-in overflow-hidden rounded-lg border border-edge bg-panel p-1 shadow-pop sm:absolute sm:inset-auto sm:top-full sm:mt-1.5 sm:w-56',
            align === 'right' ? 'sm:right-0' : 'sm:left-0',
          )}
        >
          {languages.map((lang) => {
            const active = lang.slug === selected;
            const glyph = lang.slug === 'python' ? 'python' as const : lang.slug === 'c' ? 'c' as const : 'cpp' as const;
            return (
              <button
                key={lang.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(lang.slug);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                  active ? 'bg-primary/10' : 'hover:bg-raised',
                )}
              >
                <LanguageIcon lang={glyph} size="sm" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{lang.name}</span>
                  <span className="block text-[11px] text-faint">
                    {lang.compile_command ? `${lang.compile_command} compiler` : `${lang.run_command} runtime`}
                  </span>
                </span>
                {active && <Icon name="check" size={15} className="ml-auto text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}