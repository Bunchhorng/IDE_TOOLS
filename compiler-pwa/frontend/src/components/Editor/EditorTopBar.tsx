import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';

interface EditorTopBarProps {
  projectName: string | null;
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

  return (
    <div className="flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-2 border-b border-edge bg-page/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <Tooltip label="Back to dashboard" side="bottom">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
            <Icon name="arrowLeft" size={17} />
          </Button>
        </Tooltip>

        <button
          onClick={onToggleSidebar}
          className={cn(
            'hidden rounded-md p-2 transition-colors lg:block',
            sidebarVisible ? 'bg-raised text-ink' : 'text-mute hover:bg-raised hover:text-ink',
          )}
          aria-label="Toggle file explorer"
          title="Toggle file explorer"
        >
          <Icon name="panelLeft" size={17} />
        </button>

        <div className="ml-1 min-w-0">
          <p className="truncate text-sm font-semibold text-ink" title={projectName ?? ''}>
            {projectName ?? '…'}
          </p>
          <p className="hidden text-[11px] text-mute sm:block">
            {dirty ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                All changes saved
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
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
          className="min-w-20 shrink-0 px-4 font-semibold"
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
    </div>
  );
}