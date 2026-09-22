import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { useI18n } from '../i18n';
import { cn } from '../lib/cn';
import { Icon } from './ui/Icon';

export function AppStatusBar() {
  const { online, syncState, pendingCount } = useOfflineSync();
  const { user, isAuthenticated, isGuest } = useAuth();
  const { theme, toggle } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const isDark = theme === 'dark';
  const otherTheme = isDark ? t('settings.light') : t('settings.dark');
  const themeLabel = t('nav.switch_theme', { theme: otherTheme });

  const accountLabel = !isAuthenticated
    ? t('appbar.not_signed_in')
    : isGuest || !user?.name
      ? t('settings.guest')
      : user.name;

  const pendingLabel =
    syncState === 'syncing'
      ? t('offline.syncing')
      : pendingCount > 0
        ? t('offline.pending_changes', { n: pendingCount })
        : null;

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-edge bg-panel px-3 pb-[env(safe-area-inset-bottom)] text-[11px] text-mute sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="inline-flex items-center gap-1.5"
          title={online ? t('general.online') : t('general.offline')}
        >
          <span aria-hidden="true" className="relative flex h-2 w-2">
            <span
              className={cn(
                'inline-flex h-2 w-2 rounded-full',
                online ? 'bg-success' : 'bg-warning',
                !online && 'animate-pulse',
              )}
            />
          </span>
          <span className={cn('hidden sm:inline', !online && 'text-warning')}>
            {online ? t('general.online') : t('general.offline')}
          </span>
        </span>

        <span className="hidden h-3 w-px bg-edge md:block" aria-hidden="true" />

        <span className="hidden items-center gap-1.5 font-semibold text-ink/80 md:inline-flex">
          <Icon name="shield" size={12} strokeWidth={2} className="text-primary/70" />
          {t('appbar.brand')}
        </span>

        {pendingLabel && (
          <>
            <span className="hidden h-3 w-px bg-edge md:block" aria-hidden="true" />
            <span
              className={cn(
                'hidden items-center gap-1.5 md:inline-flex',
                syncState === 'syncing' ? 'text-primary' : 'text-warning',
              )}
              title={pendingLabel}
            >
              {syncState === 'syncing' && (
                <Icon name="refresh" size={11} className="animate-spin" />
              )}
              <span className="max-w-36 truncate">{pendingLabel}</span>
            </span>
          </>
        )}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2.5">
        <span className="inline-flex min-w-0 items-center gap-1.5" title={accountLabel}>
          <Icon
            name={isAuthenticated ? 'user' : 'lock'}
            size={12}
            className="shrink-0 text-faint"
          />
          <span className="max-w-24 truncate sm:max-w-40">{accountLabel}</span>
        </span>

        <span className="h-3 w-px shrink-0 bg-edge" aria-hidden="true" />

        <span
          role="group"
          aria-label={t('language.switch')}
          className="inline-flex items-center rounded-md border border-edge bg-raised p-0.5 text-[11px] font-semibold"
        >
          <button
            type="button"
            onClick={() => setLocale('en')}
            aria-pressed={locale === 'en'}
            title={t('language.english')}
            className={cn(
              'rounded px-1.5 py-0.5 transition-colors',
              locale === 'en' ? 'bg-panel text-primary' : 'text-faint hover:text-ink',
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale('km')}
            aria-pressed={locale === 'km'}
            title={t('language.khmer')}
            className={cn(
              'rounded px-1.5 py-0.5 transition-colors',
              locale === 'km' ? 'bg-panel text-primary' : 'text-faint hover:text-ink',
            )}
          >
            ខ្មែរ
          </button>
        </span>

        <span className="hidden h-3 w-px shrink-0 bg-edge sm:block" aria-hidden="true" />

        <button
          type="button"
          onClick={toggle}
          aria-label={themeLabel}
          title={themeLabel}
          className="flex items-center gap-1.5 text-faint transition-colors hover:text-ink"
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={13} />
          <span className="hidden capitalize sm:inline">{otherTheme}</span>
        </button>
      </div>
    </footer>
  );
}