import { Modal } from './Modal';
import { Button } from './Button';
import { Icon } from './Icon';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  danger = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className="flex items-start gap-4">
        <span
          className={danger
            ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error'
            : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning'}
        >
          <Icon name={danger ? 'alertTriangle' : 'info'} size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-mute">{message}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}