import { useOnline } from '../hooks/useOnline';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { useI18n } from '../i18n';

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useI18n();

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-1.5 text-warning">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
      </span>
      <span className="text-xs font-semibold">{t('offline.heading')}</span>
      <span className="hidden text-xs text-mute sm:inline">— {t('offline.desc')}</span>
      <Button
        variant="ghost"
        size="xs"
        className="text-warning"
        onClick={() => window.location.reload()}
      >
        <Icon name="refresh" size={12} />
        {t('offline.retry')}
      </Button>
    </div>
  );
}