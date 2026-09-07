import { useOnline } from '../../hooks/useOnline';
import { useTheme } from '../../context/ThemeContext';
import { Icon } from '../ui/Icon';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import type { Language } from '../../types';

export function StatusBar({
  languages,
  selectedLanguage,
  onLanguageChange,
  fileCount,
  fileName,
}: {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (slug: string) => void;
  fileCount: number;
  fileName?: string;
}) {
  const online = useOnline();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-edge bg-panel px-3 text-[11px] text-mute">
      <div className="flex min-w-0 items-center gap-3">
        <LanguageSelector
          languages={languages}
          selected={selectedLanguage}
          onChange={onLanguageChange}
          compact
        />
        {fileName && <span className="hidden truncate font-mono md:inline">{fileName}</span>}
        <span className="hidden lg:inline">{fileCount} file{fileCount === 1 ? '' : 's'}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={
              online
                ? 'h-1.5 w-1.5 rounded-full bg-success'
                : 'h-1.5 w-1.5 rounded-full bg-warning'
            }
          />
          {online ? 'Online' : 'Offline'}
        </span>
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
          aria-label="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={12} />
          <span className="hidden capitalize sm:inline">{theme}</span>
        </button>
      </div>
    </div>
  );
}