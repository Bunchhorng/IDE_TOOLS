import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Tooltip({
  label,
  children,
  side = 'bottom',
}: {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [show, setShow] = useState(false);
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-[70] whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-primary-contrast shadow-pop',
            pos,
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}