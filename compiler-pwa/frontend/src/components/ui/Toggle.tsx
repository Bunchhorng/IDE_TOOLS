import { cn } from '../../lib/cn';

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-raised',
        'px-1 py-0.5',
      )}
    >
      <span
        className={cn(
          'relative mt-0.5 inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-primary' : 'bg-edge',
        )}
      >
        <span
          className={cn(
            'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-1',
          )}
        />
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-mute">{description}</span>}
        </span>
      )}
    </button>
  );
}