import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';
import { useI18n } from '../../i18n';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string | ReactNode;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  hideClose?: boolean;
}) {
  const { t } = useI18n();
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

  const sizes: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    full: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-cr-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-panel shadow-pop sm:rounded-2xl',
          'animate-cr-sheet-up sm:animate-cr-pop-in',
          'border border-edge',
          sizes[size],
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
              {description && <p className="mt-0.5 text-[13px] text-mute">{description}</p>}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-faint transition-colors hover:bg-raised hover:text-ink"
                aria-label={t('general.close')}
              >
                <Icon name="x" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-edge bg-raised/60 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}