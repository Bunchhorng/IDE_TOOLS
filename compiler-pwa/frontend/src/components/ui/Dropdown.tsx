import { cloneElement, isValidElement, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useClickOutside } from '../../hooks/useClickOutside';
import { Icon, type IconName } from './Icon';

export interface MenuItem {
  key: string;
  label: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

function MenuList({ items, onSelect }: { items: MenuItem[]; onSelect: (item: MenuItem) => void }) {
  return (
    <div className="w-52 overflow-hidden rounded-lg border border-edge bg-panel p-1 shadow-pop">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={item.disabled}
          onClick={() => onSelect(item)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
            item.danger ? 'text-error hover:bg-error/10' : 'text-ink hover:bg-raised',
            item.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
          )}
        >
          {item.icon && <Icon name={item.icon} size={15} className={item.danger ? 'text-error' : 'text-mute'} />}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Dropdown({
  trigger,
  items,
  align = 'right',
  className,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  const triggerEl = isValidElement(trigger)
    ? (() => {
        const el = trigger as React.ReactElement<{ onClick?: (e: MouseEvent) => void }>;
        return cloneElement(el, {
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            (el.props.onClick as ((e: MouseEvent) => void) | undefined)?.(e);
            setOpen((o) => !o);
          },
        });
      })()
    : trigger;

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {triggerEl}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-50 mt-1.5 animate-cr-pop-in origin-top',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <MenuList items={items} onSelect={(item) => { setOpen(false); item.onSelect?.(); }} />
        </div>
      )}
    </div>
  );
}

export function SplitMenu({
  items,
  trigger,
  className,
}: {
  items: MenuItem[];
  trigger: ReactNode;
  className?: string;
}) {
  return (
    <Dropdown
      items={items}
      trigger={trigger}
      className={className}
    />
  );
}