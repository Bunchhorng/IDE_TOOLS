import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { Dropdown, type MenuItem } from '../ui/Dropdown';
import { EmptyState } from '../ui/EmptyState';
import { LanguageIcon } from '../LanguageIcon';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BottomSheet } from '../ui/BottomSheet';
import { iconForFile } from '../../lib/languages';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
type SheetMode =
  | { kind: 'file' | 'folder'; mode: 'create'; parentId: number | null }
  | { kind: 'file' | 'folder'; mode: 'rename'; node: File | Folder }
  | { kind: 'file' | 'folder'; mode: 'move'; node: File | Folder }
  | null;

interface MoveTarget {
  label: string;
  id: number | null;
  isRoot?: boolean;
  current: boolean;
}

const FILE_LANGS = [
  { slug: 'c', label: 'C' },
  { slug: 'cpp', label: 'C++' },
  { slug: 'python', label: 'Python' },
] as const;

type FileLang = (typeof FILE_LANGS)[number]['slug'];

const FILE_EXT: Record<FileLang, string> = { c: 'c', cpp: 'cpp', python: 'py' };
const KNOWN_EXT = /\.(c|cpp|cc|cxx|py|pyw)$/i;

/** Append the extension for a language when a filename lacks one. */
function withExtension(name: string, lang: FileLang): string {
  return KNOWN_EXT.test(name) ? name : `${name}.${FILE_EXT[lang]}`;
}

/** Swap a known extension when switching the selected language. */
function swapExtension(name: string, lang: FileLang): string {
  const base = name.replace(KNOWN_EXT, '');
  return base.trim() ? `${base}.${FILE_EXT[lang]}` : name;
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
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const [creating, setCreating] = useState<CreateMode>(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<RenameMode>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [sheetName, setSheetName] = useState('');
  const [sheetLang, setSheetLang] = useState<FileLang>('cpp');
  const [menuSheet, setMenuSheet] = useState<{ kind: 'file' | 'folder'; node: File | Folder } | null>(null);
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
    if (isMobile) {
      setSheetName('');
      setSheetLang('cpp');
      setSheet({ kind, mode: 'create', parentId });
      setCreating(null);
      setRenaming(null);
    } else {
      setCreating({ kind, parentId });
      setNewName('');
      setRenaming(null);
    }
  };

  const startRename = (kind: 'file' | 'folder', node: File | Folder) => {
    if (isMobile) {
      setSheetName(kind === 'file' ? (node as File).filename : (node as Folder).name);
      setSheet({ kind, mode: 'rename', node });
      setCreating(null);
      setRenaming(null);
    } else {
      setRenaming({ kind, id: node.id, value: kind === 'file' ? (node as File).filename : (node as Folder).name });
    }
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

  const clearSheet = () => {
    setSheet(null);
    setSheetName('');
  };

  const submitSheet = () => {
    if (!sheet || sheet.mode === 'move') return;
    const name = sheetName.trim();
    if (!name) return;
    if (sheet.mode === 'create') {
      if (sheet.kind === 'file') {
        onCreateFile(withExtension(name, sheetLang), sheetLang, sheet.parentId);
      } else {
        onCreateFolder(name, sheet.parentId);
      }
    } else {
      const node = sheet.node;
      const current = sheet.kind === 'file' ? (node as File).filename : (node as Folder).name;
      if (name !== current) {
        if (sheet.kind === 'file') onRenameFile(node as File, name);
        else onRenameFolder(node as Folder, name);
      }
    }
    clearSheet();
  };

  /** Context-menu actions for any file/folder row. */
  const buildMenuItems = (kind: 'file' | 'folder', node: File | Folder): MenuItem[] => {
    const items: MenuItem[] =
      kind === 'folder'
        ? [
            { key: 'new-file', label: 'New file', icon: 'filePlus', onSelect: () => startCreate('file', (node as Folder).id) },
            {
              key: 'new-folder',
              label: 'New subfolder',
              icon: 'folderPlus',
              onSelect: () => startCreate('folder', (node as Folder).id),
            },
          ]
        : [];

    items.push({ key: 'rename', label: 'Rename', icon: 'pencil', onSelect: () => startRename(kind, node) });

    if (isMobile) {
      items.push({ key: 'move', label: 'Move to…', icon: 'folder', onSelect: () => setSheet({ kind, mode: 'move', node }) });
    } else {
      items.push({ key: 'move-head', label: 'Move to…', icon: 'folder', onSelect: () => {} });
      for (const t of moveTargets(kind, node)) {
        items.push({
          key: `move-${kind}-${t.id ?? 'root'}`,
          label: t.label,
          icon: 'folder',
          disabled: t.current,
          onSelect: () => {
            if (kind === 'file') onMoveFile(node as File, t.id);
            else onMoveFolder(node as Folder, t.id);
          },
        });
      }
    }

    items.push({
      key: 'delete',
      label: 'Delete',
      icon: 'trash',
      danger: true,
      onSelect: () => {
        if (kind === 'file') onDeleteFile(node as File);
        else onDeleteFolder(node as Folder);
      },
    });

    return items;
  };

  /** Context-menu trigger: bottom sheet on phones, anchored popup on desktop. */
  const rowMenu = (kind: 'file' | 'folder', node: File | Folder, label: string) =>
    isMobile ? (
      <button
        type="button"
        aria-label={`Options for ${label}`}
        onClick={() => setMenuSheet({ kind, node })}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:text-ink active:bg-raised lg:h-6 lg:w-6"
      >
        <Icon name="moreV" size={17} />
      </button>
    ) : (
      <Dropdown
        align="right"
        trigger={
          <button
            type="button"
            aria-label={`Options for ${label}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:text-ink active:bg-raised lg:h-6 lg:w-6"
          >
            <Icon name="moreV" size={14} />
          </button>
        }
        items={buildMenuItems(kind, node)}
      />
    );

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

    return (
      <li key={file.id}>
        <div
          className="group flex w-full items-center gap-1 rounded-md pr-1 transition-colors hover:bg-raised"
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
        >
          <button
            type="button"
            onClick={() => onSelectFile(file)}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-left text-[13px] transition-colors lg:py-1.5',
              active ? 'font-medium text-ink' : 'text-mute hover:text-ink',
            )}
          >
            <LanguageIcon lang={iconForFile(file.filename)} size="sm" />
            <span className="min-w-0 flex-1 truncate">{file.filename}</span>
          </button>
          {rowMenu('file', file, file.filename)}
        </div>
      </li>
    );
  };

  const renderFolder = (folder: Folder, depth: number) => {
    const renamingNow = renaming?.kind === 'folder' && renaming.id === folder.id;
    const childFolders = byParent.get(folder.id) ?? [];
    const childFiles = filesByFolder.get(folder.id) ?? [];
    // On phones everything stays visible: folders are always expanded and the
    // collapse chevrons are hidden so no file ever hides behind a folder.
    const open = isMobile || expanded.has(folder.id);

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

    return (
      <li key={folder.id}>
        <div
          className="group flex w-full items-center gap-1 rounded-md py-1.5 pr-1 text-[13px] transition-colors hover:bg-raised lg:py-1"
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
        >
          {!isMobile && (
            <button
              type="button"
              onClick={() => toggleFolder(folder.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center text-faint transition-colors hover:text-ink"
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              <Icon name={open ? 'chevronDown' : 'chevronRight'} size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left text-mute hover:text-ink"
          >
            <Icon name="folder" size={isMobile ? 16 : 15} className="shrink-0 text-primary" />
            <span className="truncate font-medium">{folder.name}</span>
          </button>
          {rowMenu('folder', folder, folder.name)}
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

  const moveSheet = sheet?.mode === 'move' ? sheet : null;
  const moveTargetList = moveSheet ? moveTargets(moveSheet.kind, moveSheet.node) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon name="folder" size={13} className="shrink-0 text-primary" />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">Explorer</span>
          <span className="rounded-full bg-mute/10 px-1.5 py-px text-[10px] font-semibold text-mute">
            {folders.length + files.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => startCreate('file', null)}
            className="rounded-md p-2 text-faint transition-colors hover:bg-raised hover:text-ink active:bg-raised lg:p-1"
            aria-label="New file"
            title="New file"
          >
            <Icon name="filePlus" size={17} />
          </button>
          <button
            onClick={() => startCreate('folder', null)}
            className="rounded-md p-2 text-faint transition-colors hover:bg-raised hover:text-ink active:bg-raised lg:p-1"
            aria-label="New folder"
            title="New folder"
          >
            <Icon name="folderPlus" size={17} />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 border-b border-edge px-3 pb-2.5">
        <span className="truncate text-[13px] font-semibold text-ink" title={projectName}>
          {projectName}
        </span>
      </div>

      {files.length === 0 && folders.length === 0 && !creating ? (
        <EmptyState
          compact
          icon="folder"
          title="No files yet"
          message="Create your first file or folder to start coding."
          action={
            isMobile ? (
              <Button size="sm" variant="primary" onClick={() => startCreate('file', null)}>
                New file
              </Button>
            ) : undefined
          }
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

      {/* ---------- Mobile sheets ---------- */}

      <BottomSheet
        open={isMobile && sheet?.kind === 'file' && sheet.mode === 'create'}
        onClose={clearSheet}
        title="New file"
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submitSheet(); }}>
          <Input
            label="File name"
            placeholder="main.cpp"
            autoFocus
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
          />
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Language</span>
            <div className="grid grid-cols-3 gap-2">
              {FILE_LANGS.map((l) => (
                <button
                  key={l.slug}
                  type="button"
                  onClick={() => {
                    setSheetLang(l.slug);
                    setSheetName((n) => swapExtension(n, l.slug));
                  }}
                  className={cn(
                    'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors',
                    sheetLang === l.slug
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-edge bg-raised/60 text-mute hover:bg-raised hover:text-ink',
                  )}
                >
                  <LanguageIcon lang={l.slug} size="sm" />
                  {l.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-faint">Extension updates automatically. You can change it later in the editor.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="lg" fullWidth onClick={clearSheet}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={!sheetName.trim()}>
              Create
            </Button>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet
        open={isMobile && sheet?.kind === 'folder' && sheet.mode === 'create'}
        onClose={clearSheet}
        title="New folder"
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submitSheet(); }}>
          <Input
            label="Folder name"
            placeholder="src"
            autoFocus
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="lg" fullWidth onClick={clearSheet}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={!sheetName.trim()}>
              Create
            </Button>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet
        open={isMobile && sheet?.mode === 'rename'}
        onClose={clearSheet}
        title={sheet?.kind === 'file' ? 'Rename file' : 'Rename folder'}
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submitSheet(); }}>
          <Input
            label="New name"
            autoFocus
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="lg" fullWidth onClick={clearSheet}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={!sheetName.trim()}>
              Rename
            </Button>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet
        open={isMobile && moveSheet !== null}
        onClose={clearSheet}
        title={moveSheet?.kind === 'file' ? 'Move file' : 'Move folder'}
      >
        <div className="flex flex-col gap-1.5">
          {moveTargetList.map((t) => (
            <button
              key={`${t.id ?? 'root'}`}
              type="button"
              disabled={t.current}
              onClick={() => {
                if (!moveSheet) return;
                if (moveSheet.kind === 'file') onMoveFile(moveSheet.node as File, t.id);
                else onMoveFolder(moveSheet.node as Folder, t.id);
                clearSheet();
              }}
              className={cn(
                'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                t.current ? 'cursor-default bg-primary/5 text-ink' : 'text-mute hover:bg-raised hover:text-ink',
              )}
            >
              <Icon name={t.isRoot ? 'home' : 'folder'} size={17} className={t.current ? 'text-primary' : 'text-faint'} />
              <span className="truncate">{t.label}</span>
              {t.current && <Icon name="check" size={16} className="ml-auto text-primary" />}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={clearSheet}>
            Cancel
          </Button>
        </div>
      </BottomSheet>

      {/* Mobile ⋮ menu — every action visible at once, no scrolling. */}
      <BottomSheet
        open={isMobile && menuSheet !== null}
        onClose={() => setMenuSheet(null)}
        title={menuSheet ? (menuSheet.kind === 'folder' ? (menuSheet.node as Folder).name : (menuSheet.node as File).filename) : ''}
      >
        <div className="flex flex-col gap-1">
          {menuSheet &&
            buildMenuItems(menuSheet.kind, menuSheet.node).map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setMenuSheet(null);
                  item.onSelect?.();
                }}
                className={cn(
                  'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                  item.danger ? 'text-error hover:bg-error/10' : 'text-ink hover:bg-raised',
                  item.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {item.icon && <Icon name={item.icon} size={18} className={item.danger ? 'text-error' : 'text-mute'} />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            ))}
        </div>
      </BottomSheet>
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