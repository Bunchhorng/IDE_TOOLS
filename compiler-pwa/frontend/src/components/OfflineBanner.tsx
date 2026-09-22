import { useState } from 'react';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { useI18n } from '../i18n';
import { cn } from '../lib/cn';

export function OfflineBanner() {
  const {
    online,
    syncState,
    pendingCount,
    conflicts,
    resolveConflict,
  } = useOfflineSync();
  const { t } = useI18n();
  const [busy, setBusy] = useState<{ id: number; choice: 'local' | 'server' } | null>(null);

  const resolve = (fileId: number, choice: 'local' | 'server') => {
    setBusy({ id: fileId, choice });
    void resolveConflict(fileId, choice).finally(() => {
      setBusy(null);
      window.dispatchEvent(new CustomEvent('coderunner:conflict-resolved'));
    });
  };

  if (conflicts.length > 0) {
    return (
      <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-warning">
        <div className="flex items-center justify-center gap-2">
          <Icon name="alertTriangle" size={14} />
          <span className="text-xs font-semibold">
            {t('offline.conflicts', { n: conflicts.length })}
          </span>
        </div>
        <ul className="mx-auto mt-2 w-full max-w-2xl space-y-1.5 pb-1">
          {conflicts.map((c) => (
            <li
              key={c.opId}
              className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-1.5"
            >
              <span className="min-w-0 truncate text-xs" title={c.slug}>
                {c.filename}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-warning"
                  loading={busy?.id === c.fileId && busy?.choice === 'server'}
                  onClick={() => resolve(c.fileId, 'server')}
                >
                  {t('offline.keep_server')}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-warning"
                  loading={busy?.id === c.fileId && busy?.choice === 'local'}
                  onClick={() => resolve(c.fileId, 'local')}
                >
                  {t('offline.keep_local')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (online && pendingCount === 0) return null;

  const syncing = syncState === 'syncing';
  const offlineNow = !online;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5',
        offlineNow
          ? 'border-b border-warning/40 bg-warning/10 text-warning'
          : 'border-b border-info/40 bg-info/10 text-info',
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full bg-current opacity-75',
            !syncing && offlineNow && 'animate-ping',
          )}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      <span className="text-xs font-semibold">
        {offlineNow ? t('offline.heading') : t('offline.syncing')}
      </span>
      <span className="hidden text-xs text-mute sm:inline">
        — {offlineNow ? t('offline.desc') : t('offline.syncing_desc')}
      </span>
      {offlineNow && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="text-current"
            onClick={() => window.location.reload()}
          >
            <Icon name="refresh" size={12} />
            {t('offline.retry')}
          </Button>
        </div>
      )}
    </div>
  );
}