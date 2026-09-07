import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem<V extends string = string> {
  value: V;
  label: string;
  icon?: 'code' | 'terminal' | 'alertCircle' | 'keyboard';
  badge?: number;
}

export function Tabs<V extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-0.5 border-b border-edge px-2 py-1.5', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              active ? 'text-primary' : 'text-mute hover:bg-raised hover:text-ink',
            )}
          >
            {tab.icon && (
              <span className={active ? 'text-primary' : 'text-faint'}>
                <TabGlyph icon={tab.icon} />
              </span>
            )}
            {tab.label}
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span
                className={cn(
                  'ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                  active ? 'bg-primary/15 text-primary' : 'bg-mute/15 text-mute',
                )}
              >
                {tab.badge}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function TabGlyph({ icon }: { icon: NonNullable<TabItem['icon']> }) {
  const paths: Record<string, ReactNode> = {
    code: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
    terminal: (
      <>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </>
    ),
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    keyboard: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <line x1="6" y1="10" x2="6.01" y2="10" />
        <line x1="10" y1="10" x2="10.01" y2="10" />
        <line x1="14" y1="10" x2="14.01" y2="10" />
        <line x1="18" y1="10" x2="18.01" y2="10" />
        <line x1="6" y1="14" x2="18" y2="14" />
      </>
    ),
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[icon]}
    </svg>
  );
}