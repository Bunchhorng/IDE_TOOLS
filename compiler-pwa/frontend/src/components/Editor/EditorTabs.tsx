import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { LanguageIcon } from '../LanguageIcon';
import type { File } from '../../types';
import { iconForFile } from '../../lib/languages';

interface EditorTabsProps {
  files: File[];
  activeFileId: number | null;
  dirtyIds: Set<number>;
  onSelect: (file: File) => void;
  onCloseTab: (file: File) => void;
}

export function EditorTabs({ files, activeFileId, dirtyIds, onSelect, onCloseTab }: EditorTabsProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex h-10 shrink-0 items-stretch overflow-x-auto border-b border-edge bg-raised/40 no-scrollbar">
      {files.map((file) => {
        const active = file.id === activeFileId;
        const dirty = dirtyIds.has(file.id);
        return (
          <div
            key={file.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(file)}
            className={cn(
              'group relative flex max-w-44 shrink-0 cursor-pointer items-center gap-2 border-r border-edge/70 px-3.5 text-[13px] font-medium transition-colors',
              active
                ? 'bg-editor text-ink shadow-[inset_0_2px_0_0_var(--primary)]'
                : 'text-mute hover:bg-editor/60 hover:text-ink',
            )}
          >
            <LanguageIcon lang={iconForFile(file.filename)} size="sm" />
            <span className="truncate">{file.filename}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(file);
              }}
              className={cn(
                'ml-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-faint transition-colors hover:bg-mute/15 hover:text-ink',
                !active && 'opacity-0 group-hover:opacity-100',
              )}
              aria-label={`Close ${file.filename}`}
            >
              {dirty ? (
                <span className="block h-2 w-2 rounded-full bg-primary" title="Unsaved changes" />
              ) : (
                <Icon name="x" size={13} />
              )}
            </button>
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-px bg-edge" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}