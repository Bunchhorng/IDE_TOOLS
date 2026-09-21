import { Icon } from '../ui/Icon';
import { usePreferences } from '../../context/PreferencesContext';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';

const MIN_FONT = 9;
const MAX_FONT = 28;
const BASE_FONT = 14;

function percent(fontSize: number): number {
  return Math.round((fontSize / BASE_FONT) * 100);
}

/** Editor font-size zoom stepper (- / % / +). Clicking the percentage resets. */
export function ZoomControl({ className }: { className?: string }) {
  const { prefs, updatePrefs } = usePreferences();
  const { t } = useI18n();

  const change = (delta: number) => {
    const next = Math.min(MAX_FONT, Math.max(MIN_FONT, prefs.fontSize + delta));
    if (next !== prefs.fontSize) updatePrefs({ fontSize: next });
  };

  const btnClass =
    'inline-flex h-6.5 w-6.5 items-center justify-center rounded-md text-mute transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-panel disabled:text-faint disabled:hover:bg-transparent';

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={prefs.fontSize <= MIN_FONT}
        className={btnClass}
        aria-label={t('editor.zoom_out')}
        title={t('editor.zoom_out')}
      >
        <Icon name="minus" size={13} />
      </button>
      <button
        type="button"
        onClick={() => updatePrefs({ fontSize: BASE_FONT })}
        disabled={prefs.fontSize === BASE_FONT}
        className="rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-mute transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hover:bg-transparent"
        aria-label={t('editor.zoom_reset')}
        title={t('editor.zoom_reset')}
      >
        {percent(prefs.fontSize)}%
      </button>
      <button
        type="button"
        onClick={() => change(1)}
        disabled={prefs.fontSize >= MAX_FONT}
        className={btnClass}
        aria-label={t('editor.zoom_in')}
        title={t('editor.zoom_in')}
      >
        <Icon name="plus" size={13} />
      </button>
    </span>
  );
}