import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center lg:hidden">
      <div className="absolute inset-0 animate-cr-fade-in bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative max-h-[80vh] w-full overflow-hidden rounded-t-2xl border-t border-edge bg-panel shadow-pop',
          'animate-cr-sheet-up',
          className,
        )}
      >
        <div className="flex items-center justify-center pt-2.5 pb-1" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-edge" />
        </div>
        {title && (
          <div className="px-5 pb-2 pt-1">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
          </div>
        )}
        <div className="min-h-0 overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}