import { useState } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { Dropdown } from '../ui/Dropdown';
import { EmptyState } from '../ui/EmptyState';
import { LanguageIcon } from '../LanguageIcon';
import { iconForFile } from '../../lib/languages';
import type { File } from '../../types';

interface FileExplorerSidebarProps {
  files: File[];
  activeFileId: number | null;
  projectName: string;
  onSelectFile: (file: File) => void;
  onCreateFile: (filename: string, language: string, content?: string) => void;
  onDeleteFile: (file: File) => void;
  onRenameFile: (file: File, newName: string) => void;
}

export function FileExplorerSidebar({
  files,
  activeFileId,
  projectName,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileExplorerSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startCreate = () => {
    setCreating(true);
    setNewName('');
  };

  const submitCreate = () => {
    const name = newName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const language = ext === 'py' ? 'python' : ext === 'c' ? 'c' : 'cpp';
    onCreateFile(language === 'python' ? `${name}` : name, language);
    setCreating(false);
  };

  const submitRename = (file: File) => {
    const name = renameValue.trim();
    if (name && name !== file.filename) {
      onRenameFile(file, name);
    }
    setRenamingId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon name="folder" size={14} className="shrink-0 text-primary" />
          <span className="truncate text-[13px] font-semibold text-ink" title={projectName}>
            {projectName}
          </span>
        </div>
        <button
          onClick={startCreate}
          className="rounded-md p-1 text-faint transition-colors hover:bg-raised hover:text-ink"
          aria-label="New file"
          title="New file"
        >
          <Icon name="filePlus" size={16} />
        </button>
      </div>

      {creating && (
        <div className="mx-3 mb-2 flex items-center gap-1.5 rounded-md border border-primary/50 bg-panel p-1.5 focus-within:ring-2 focus-within:ring-primary/20">
          <Icon name="filePlus" size={14} className="text-primary" />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            onBlur={submitCreate}
            placeholder="main.cpp"
            className="w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {files.length === 0 ? (
          <EmptyState
            compact
            icon="fileText"
            title="No files yet"
            message="Create your first file to start coding."
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {files.map((file) => {
              const active = file.id === activeFileId;
              const renaming = renamingId === file.id;
              return (
                <li key={file.id}>
                  {renaming ? (
                    <div className="mx-1 flex items-center gap-1.5 rounded-md border border-primary/50 bg-panel p-1.5">
                      <Icon name="pencil" size={13} className="text-primary" />
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(file);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => submitRename(file)}
                        className="w-full bg-transparent text-[13px] text-ink focus:outline-none"
                      />
                    </div>
                  ) : (
                    <Dropdown
                      align="right"
                      trigger={
                        <button
                          onClick={() => onSelectFile(file)}
                          className={cn(
                            'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                            active
                              ? 'bg-primary/10 font-medium text-ink'
                              : 'text-mute hover:bg-raised hover:text-ink',
                          )}
                        >
                          <LanguageIcon lang={iconForFile(file.filename)} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-left">{file.filename}</span>
                          <span
                            className={cn(
                              'shrink-0 text-faint transition-colors group-hover:text-ink',
                              active && 'text-mute',
                            )}
                          >
                            <Icon name="moreV" size={14} />
                          </span>
                        </button>
                      }
                      items={[
                        {
                          key: 'rename',
                          label: 'Rename',
                          icon: 'pencil',
                          onSelect: () => {
                            setRenamingId(file.id);
                            setRenameValue(file.filename);
                          },
                        },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: 'trash',
                          danger: true,
                          onSelect: () => onDeleteFile(file),
                        },
                      ]}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}