import { useOnline } from '../../hooks/useOnline';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { Icon } from '../ui/Icon';
import { ZoomControl } from './ZoomControl';
import { LanguageIcon, type LangGlyph } from '../LanguageIcon';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import { cn } from '../../lib/cn';
import type { Language } from '../../types';
import { useI18n } from '../../i18n';

function glyphForSlug(slug: string): LangGlyph {
  return slug === 'python' ? 'python' : slug === 'c' ? 'c' : 'cpp';
}

export function StatusBar({
  languages,
  selectedLanguage,
  onLanguageChange,
  fileCount,
  fileName,
  running,
  cursorLine,
  cursorColumn,
}: {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (slug: string) => void;
  fileCount: number;
  fileName?: string;
  running: boolean;
  cursorLine: number;
  cursorColumn: number;
}) {
  const online = useOnline();
  const { theme, toggle } = useTheme();
  const { prefs } = usePreferences();
  const { t } = useI18n();
  const meta = languages.find((l) => l.slug === selectedLanguage);

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-edge bg-panel px-3 text-[11px] text-mute">
      <div className="flex min-w-0 items-center gap-2.5">
        <LanguageSelector
          languages={languages}
          selected={selectedLanguage}
          onChange={onLanguageChange}
          compact
        />
        <span className="h-3 w-px shrink-0 bg-edge" />
        <span className="inline-flex items-center gap-1.5 font-medium capitalize text-ink/75">
          <LanguageIcon lang={glyphForSlug(selectedLanguage)} size="sm" />
          {meta?.name ?? selectedLanguage}
        </span>
        {fileName && <span className="hidden truncate font-mono md:inline">{fileName}</span>}
        <span className="hidden items-center gap-1.5 lg:inline-flex">
          <Icon name="file" size={12} className="text-faint" />
          {fileCount} {fileCount === 1 ? t('dashboard.file') : t('dashboard.files_suffix')}
        </span>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2.5">
        {/* Editor state — only when a file is open. */}
        {fileName && (
          <>
            <span className="hidden items-center gap-1.5 sm:inline-flex" title={t('statusbar.utf8')}>
              <Icon name="globe" size={12} className="text-faint" />
              {t('statusbar.utf8')}
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex" title={t('statusbar.indentation')}>
              <Icon name="minus" size={12} className="text-faint" />
              {t('statusbar.spaces', { n: prefs.tabSize })}
            </span>
            <span
              className="inline-flex items-center gap-1.5 tabular-nums"
            >
              <Icon name="cursor" size={12} className="text-faint" />
              {t('statusbar.ln_col', { ln: cursorLine, col: cursorColumn })}
            </span>
          </>
        )}

        <span className="h-3 w-px shrink-0 bg-edge" />

        <span
          className={cn(
            'inline-flex items-center gap-1.5',
            running ? 'font-medium text-info' : 'text-mute',
          )}
          aria-live="polite"
        >
          <span className={cn('relative flex h-2 w-2', running && 'text-info')}>
            <span
              className={cn(
                'inline-flex h-2 w-2 rounded-full',
                running ? 'animate-pulse bg-info' : 'bg-success',
              )}
            />
          </span>
          {running ? t('statusbar.running') : t('statusbar.ready')}
        </span>
        <span className="h-3 w-px shrink-0 bg-edge" />
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'relative flex h-2 w-2',
              online && 'text-success',
              !online && 'text-warning',
            )}
          >
            <span
              className={cn(
                'inline-flex h-2 w-2 rounded-full',
                online ? 'bg-success' : 'bg-warning',
                !online && 'animate-pulse',
              )}
            />
          </span>
          {online ? t('general.online') : t('general.offline')}
        </span>
        <span className="h-3 w-px shrink-0 bg-edge" />
        <ZoomControl />
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-raised hover:text-ink"
          aria-label={t('nav.theme_toggle')}
          title={t('nav.theme_toggle')}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={12} />
          <span className="hidden capitalize sm:inline">{theme}</span>
        </button>
      </div>
    </footer>
  );
}