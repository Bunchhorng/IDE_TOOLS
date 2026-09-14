import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { LanguageIcon } from '../LanguageIcon';
import { iconForFile } from '../../lib/languages';
import { useI18n } from '../../i18n';

interface EditorTopBarProps {
  projectName: string | null;
  fileName?: string;
  isSaving: boolean;
  dirty: boolean;
  running: boolean;
  canRun: boolean;
  onSave: () => void;
  onRun: () => void;
  onShare: () => void;
  onDownload: () => void;
  onToggleSidebar: () => void;
  sidebarVisible: boolean;
}

export function EditorTopBar({
  projectName,
  fileName,
  isSaving,
  dirty,
  running,
  canRun,
  onSave,
  onRun,
  onShare,
  onDownload,
  onToggleSidebar,
  sidebarVisible,
}: EditorTopBarProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <header className="flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-edge bg-page/85 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-3">
      <div className="flex min-w-0 items-center gap-1">
        <Tooltip label="Back to dashboard" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
          >
            <Icon name="arrowLeft" size={17} />
          </Button>
        </Tooltip>

        <Tooltip label="Toggle file explorer (Ctrl+B)" side="bottom">
          <button
            onClick={onToggleSidebar}
            className={cn(
              'hidden rounded-lg p-2 transition-colors lg:block',
              sidebarVisible ? 'bg-raised text-ink' : 'text-mute hover:bg-raised hover:text-ink',
            )}
            aria-label="Toggle file explorer"
            title="Toggle file explorer (Ctrl+B)"
          >
            <Icon name="panelLeft" size={17} />
          </button>
        </Tooltip>

        {/* Brand plate */}
        <span className="cr-brand-plate ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" aria-hidden="true">
          <Icon name="play" size={12} strokeWidth={2.4} className="ml-px fill-current" />
        </span>

        {/* Breadcrumb — desktop & tablet */}
        <div className="ml-2 hidden min-w-0 sm:block">
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-ink">
            <span className="truncate">{projectName ?? 'Project'}</span>
            {fileName && (
              <>
                <Icon name="chevronRight" size={11} className="shrink-0 text-faint" />
                <span className="flex min-w-0 items-center gap-1.5">
                  <LanguageIcon lang={iconForFile(fileName)} size="sm" />
                  <span className="truncate font-mono text-[13px] font-normal text-mute">{fileName}</span>
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 flex items-center text-[10.5px] leading-none">
            {isSaving ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-info">
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-[2px] border-info border-t-transparent" />
                {t('editor.saving')}
              </span>
            ) : dirty ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning shadow-[0_0_6px_-1px_currentColor]" />
                {t('editor.unsaved_changes')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {t('editor.all_saved')}
              </span>
            )}
          </p>
        </div>

        {/* Mobile — name only */}
        <div className="min-w-0 sm:hidden">
          <p className="truncate text-sm font-semibold text-ink">{projectName ?? 'Project'}</p>
          {fileName && <p className="truncate font-mono text-[11px] text-mute">{fileName}</p>}
        </div>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
        <Tooltip label="Download file" side="bottom">
          <Button variant="ghost" size="icon" onClick={onDownload} disabled={!canRun} className="hidden lg:inline-flex" aria-label="Download file">
            <Icon name="download" size={16} />
          </Button>
        </Tooltip>

        <Tooltip label="Share" side="bottom">
          <Button variant="ghost" size="icon" onClick={onShare} disabled={!canRun} className="hidden lg:inline-flex" aria-label="Share file">
            <Icon name="share" size={16} />
          </Button>
        </Tooltip>

        <Tooltip label="Save (Ctrl+S)" side="bottom">
          <Button variant="secondary" size="sm" onClick={onSave} disabled={!canRun || isSaving} className="hidden lg:inline-flex">
            <Icon name="save" size={15} />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </Tooltip>

        <Button
          variant="primary"
          size="sm"
          onClick={onRun}
          disabled={running || !canRun}
          title="Run (Ctrl+Enter)"
          className="cr-btn-run min-w-[5.5rem] shrink-0 px-4 font-semibold"
        >
          <span className="relative flex items-center justify-center">
            {running ? (
              <Icon name="stop" size={15} className="animate-pulse" />
            ) : (
              <Icon name="play" size={15} className="fill-current" />
            )}
            <span className="ml-1.5">{running ? 'Running' : 'Run'}</span>
          </span>
        </Button>
      </div>
    </header>
  );
}