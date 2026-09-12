import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { Dropdown, type MenuItem } from '../ui/Dropdown';
import { EmptyState } from '../ui/EmptyState';
import { LanguageIcon } from '../LanguageIcon';
import { iconForFile } from '../../lib/languages';
import type { File, Folder } from '../../types';

interface FileExplorerSidebarProps {
  files: File[];
  folders: Folder[];
  activeFileId: number | null;
  projectName: string;
  onSelectFile: (file: File) => void;
  onCreateFile: (filename: string, language: string, folderId?: number | null, content?: string) => void;
  onCreateFolder: (name: string, parentId?: number | null) => void;
  onDeleteFile: (file: File) => void;
  onDeleteFolder: (folder: Folder) => void;
  onRenameFile: (file: File, newName: string) => void;
  onRenameFolder: (folder: Folder, newName: string) => void;
  onMoveFile: (file: File, folderId: number | null) => void;
  onMoveFolder: (folder: Folder, parentId: number | null) => void;
}

type CreateMode = { kind: 'file' | 'folder'; parentId: number | null } | null;
type RenameMode = { kind: 'file' | 'folder'; id: number; value: string } | null;

interface MoveTarget {
  label: string;
  id: number | null;
  isRoot?: boolean;
  current: boolean;
}

function languageForName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'py' ? 'python' : ext === 'c' ? 'c' : 'cpp';
}

export function FileExplorerSidebar({
  files,
  folders,
  activeFileId,
  projectName,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
  onMoveFile,
  onMoveFolder,
}: FileExplorerSidebarProps) {
  const [creating, setCreating] = useState<CreateMode>(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<RenameMode>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const expandedSeededRef = useRef(false);

  // Folders load asynchronously after first render — expand them all once when
  // they arrive, then leave future toggles to the user.
  useEffect(() => {
    if (expandedSeededRef.current || folders.length === 0) return;
    expandedSeededRef.current = true;
    setExpanded(new Set(folders.map((f) => f.id)));
  }, [folders]);

  const byParent = (() => {
    const folderMap = new Map<number | null, Folder[]>();
    for (const f of folders) {
      const key = f.parent_id ?? null;
      const list = folderMap.get(key) ?? [];
      list.push(f);
      folderMap.set(key, list);
    }
    for (const list of folderMap.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return folderMap;
  })();

  const filesByFolder = (() => {
    const map = new Map<number | null, File[]>();
    for (const f of files) {
      const key = f.folder_id ?? null;
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.filename.localeCompare(b.filename));
    return map;
  })();

  const folderById = new Map(folders.map((f) => [f.id, f]));

  const pathOf = (folder: Folder): string => {
    const parts: string[] = [];
    let cur: Folder | undefined = folder;
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parent_id ? folderById.get(cur.parent_id) : undefined;
    }
    return parts.join('/');
  };

  /** Folders a node could move into, excluding itself and (for folders) its subtree. */
  const moveTargets = (kind: 'file' | 'folder', node: File | Folder): MoveTarget[] => {
    const targets: MoveTarget[] = [{ label: 'Project root', id: null, isRoot: true, current: false }];
    const blocked = new Set<number>();

    if (kind === 'folder') {
      const walk = (id: number) => {
        blocked.add(id);
        for (const child of byParent.get(id) ?? []) walk(child.id);
      };
      walk(node.id);
    }

    const currentParent = kind === 'file' ? (node as File).folder_id ?? null : (node as Folder).parent_id ?? null;

    const push = (parentId: number | null) => {
      for (const f of byParent.get(parentId) ?? []) {
        if (blocked.has(f.id)) continue;
        targets.push({ label: pathOf(f), id: f.id, current: f.id === currentParent });
        push(f.id);
      }
    };
    push(null);

    targets[0].current = currentParent === null;
    return targets;
  };

  const toggleFolder = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = (kind: 'file' | 'folder', parentId: number | null) => {
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    setCreating({ kind, parentId });
    setNewName('');
    setRenaming(null);
  };

  const submitCreate = () => {
    if (!creating) return;
    const name = newName.trim();
    if (name) {
      if (creating.kind === 'file') {
        onCreateFile(name, languageForName(name), creating.parentId);
      } else {
        onCreateFolder(name, creating.parentId);
      }
    }
    setCreating(null);
  };

  const submitRename = (kind: 'file' | 'folder', node: File | Folder) => {
    const name = renameValue.trim();
    if (name && name !== (kind === 'file' ? (node as File).filename : (node as Folder).name)) {
      if (kind === 'file') onRenameFile(node as File, name);
      else onRenameFolder(node as Folder, name);
    }
    setRenaming(null);
  };

  const renderFile = (file: File, depth: number) => {
    const active = file.id === activeFileId;
    const renamingNow = renaming?.kind === 'file' && renaming.id === file.id;

    if (renamingNow) {
      return (
        <li key={file.id}>
          <div
            className="mx-1 flex items-center gap-1.5 rounded-md border border-primary/50 bg-panel p-1.5"
            style={{ marginLeft: `${depth * 14 + 8}px` }}
          >
            <Icon name="pencil" size={13} className="text-primary" />
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename('file', file);
                if (e.key === 'Escape') setRenaming(null);
              }}
              onBlur={() => submitRename('file', file)}
              className="w-full bg-transparent text-[13px] text-ink focus:outline-none"
            />
          </div>
        </li>
      );
    }

    const moveHeading: MenuItem = {
      key: 'move-head',
      label: 'Move to…',
      icon: 'folder',
      onSelect: () => {},
    };
    const moveItems: MenuItem[] = moveTargets('file', file).map((t) => ({
      key: `move-file-${t.id ?? 'root'}`,
      label: t.label,
      icon: 'folder',
      disabled: t.current,
      onSelect: () => onMoveFile(file, t.id),
    }));

    return (
      <li key={file.id}>
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
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
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
              onSelect: () => setRenaming({ kind: 'file', id: file.id, value: file.filename }),
            },
            moveHeading,
            ...moveItems,
            {
              key: 'delete',
              label: 'Delete',
              icon: 'trash',
              danger: true,
              onSelect: () => onDeleteFile(file),
            },
          ]}
        />
      </li>
    );
  };

  const renderFolder = (folder: Folder, depth: number) => {
    const renamingNow = renaming?.kind === 'folder' && renaming.id === folder.id;
    const childFolders = byParent.get(folder.id) ?? [];
    const childFiles = filesByFolder.get(folder.id) ?? [];
    const open = expanded.has(folder.id);

    if (renamingNow) {
      return (
        <li key={folder.id}>
          <div
            className="mx-1 flex items-center gap-1.5 rounded-md border border-primary/50 bg-panel p-1.5"
            style={{ marginLeft: `${depth * 14 + 8}px` }}
          >
            <Icon name="pencil" size={13} className="text-primary" />
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename('folder', folder);
                if (e.key === 'Escape') setRenaming(null);
              }}
              onBlur={() => submitRename('folder', folder)}
              className="w-full bg-transparent text-[13px] text-ink focus:outline-none"
            />
          </div>
          {open && (
            <ul className="flex flex-col gap-0.5">
              {childFolders.map((c) => renderFolder(c, depth + 1))}
              {childFiles.map((f) => renderFile(f, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    const moveHeading: MenuItem = {
      key: 'move-head',
      label: 'Move to…',
      icon: 'folder',
      onSelect: () => {},
    };
    const moveItems: MenuItem[] = moveTargets('folder', folder).map((t) => ({
      key: `move-folder-${t.id ?? 'root'}`,
      label: t.label,
      icon: 'folder',
      disabled: t.current,
      onSelect: () => onMoveFolder(folder, t.id),
    }));

    return (
      <li key={folder.id}>
        <div
          className="group flex w-full items-center gap-1 rounded-md py-1 pr-1 text-[13px] transition-colors hover:bg-raised"
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
        >
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-faint transition-colors hover:text-ink"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <Icon name={open ? 'chevronDown' : 'chevronRight'} size={13} />
          </button>
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-mute hover:text-ink"
          >
            <Icon name="folder" size={15} className="shrink-0 text-primary" />
            <span className="truncate font-medium">{folder.name}</span>
          </button>
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint transition-colors hover:text-ink"
                aria-label={`Options for ${folder.name}`}
              >
                <Icon name="moreV" size={14} />
              </button>
            }
            items={[
              { key: 'new-file', label: 'New file', icon: 'filePlus', onSelect: () => startCreate('file', folder.id) },
              { key: 'new-folder', label: 'New subfolder', icon: 'folderPlus', onSelect: () => startCreate('folder', folder.id) },
              {
                key: 'rename',
                label: 'Rename',
                icon: 'pencil',
                onSelect: () => setRenaming({ kind: 'folder', id: folder.id, value: folder.name }),
              },
              moveHeading,
              ...moveItems,
              {
                key: 'delete',
                label: 'Delete',
                icon: 'trash',
                danger: true,
                onSelect: () => onDeleteFolder(folder),
              },
            ]}
          />
        </div>

        {open && (
          <ul className="flex flex-col gap-0.5">
            {creating?.parentId === folder.id && (
              <li>
                <CreateRow
                  kind={creating.kind}
                  value={newName}
                  onChange={setNewName}
                  onSubmit={submitCreate}
                  onCancel={() => setCreating(null)}
                  depth={depth + 1}
                />
              </li>
            )}
            {childFolders.map((c) => renderFolder(c, depth + 1))}
            {childFiles.map((f) => renderFile(f, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const rootFolders = byParent.get(null) ?? [];
  const rootFiles = filesByFolder.get(null) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon name="folder" size={14} className="shrink-0 text-primary" />
          <span className="truncate text-[13px] font-semibold text-ink" title={projectName}>
            {projectName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => startCreate('file', null)}
            className="rounded-md p-1 text-faint transition-colors hover:bg-raised hover:text-ink"
            aria-label="New file"
            title="New file"
          >
            <Icon name="filePlus" size={16} />
          </button>
          <button
            onClick={() => startCreate('folder', null)}
            className="rounded-md p-1 text-faint transition-colors hover:bg-raised hover:text-ink"
            aria-label="New folder"
            title="New folder"
          >
            <Icon name="folderPlus" size={16} />
          </button>
        </div>
      </div>

      {files.length === 0 && folders.length === 0 && !creating ? (
        <EmptyState
          compact
          icon="folder"
          title="No files yet"
          message="Create your first file or folder to start coding."
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <ul className="flex flex-col gap-0.5">
            {creating?.parentId === null && (
              <li>
                <CreateRow
                  kind={creating.kind}
                  value={newName}
                  onChange={setNewName}
                  onSubmit={submitCreate}
                  onCancel={() => setCreating(null)}
                  depth={0}
                />
              </li>
            )}
            {rootFolders.map((f) => renderFolder(f, 0))}
            {rootFiles.map((f) => renderFile(f, 0))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CreateRow({
  kind,
  value,
  onChange,
  onSubmit,
  onCancel,
  depth,
}: {
  kind: 'file' | 'folder';
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  depth: number;
}) {
  return (
    <div
      className="mx-1 flex items-center gap-1.5 rounded-md border border-primary/50 bg-panel p-1.5 focus-within:ring-2 focus-within:ring-primary/20"
      style={{ marginLeft: `${depth * 14 + 8}px` }}
    >
      <Icon name={kind === 'folder' ? 'folderPlus' : 'filePlus'} size={14} className="text-primary" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={onSubmit}
        placeholder={kind === 'folder' ? 'new-folder' : 'main.cpp'}
        className="w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
      />
    </div>
  );
}