import type { User, Project, File, Folder } from '../../types';

export type PendingOp =
  | {
      id: string;
      kind: 'create_project';
      createdAt: string;
      slug: string;
      payload: { name: string; description: string | null };
    }
  | {
      id: string;
      kind: 'update_project';
      createdAt: string;
      slug: string;
      payload: { name?: string; description?: string | null };
    }
  | { id: string; kind: 'delete_project'; createdAt: string; slug: string }
  | {
      id: string;
      kind: 'create_file';
      createdAt: string;
      slug: string;
      localId: number;
      payload: {
        filename: string;
        language: string;
        content: string;
        folder_id: number | null;
      };
    }
  | {
      id: string;
      kind: 'update_file';
      createdAt: string;
      fileId: number;
      slug: string;
      payload: {
        content?: string;
        language?: string;
        filename?: string;
        folder_id?: number | null;
        baseUpdatedAt: string | null;
      };
    }
  | { id: string; kind: 'delete_file'; createdAt: string; fileId: number; slug: string }
  | {
      id: string;
      kind: 'create_folder';
      createdAt: string;
      slug: string;
      localId: number;
      payload: { name: string; parent_id: number | null };
    }
  | {
      id: string;
      kind: 'update_folder';
      createdAt: string;
      slug: string;
      folderId: number;
      payload: { name?: string; parent_id?: number | null };
    }
  | { id: string; kind: 'delete_folder'; createdAt: string; slug: string; folderId: number };

export interface ConflictRecord {
  opId: string;
  fileId: number;
  slug: string;
  filename: string;
  local: { content: string; language: string; updatedAt: string | null };
  server: { content: string; language: string; updatedAt: string | null };
  createdAt: string;
}

export interface OfflineProject {
  slug: string;
  project: Project;
  files: File[];
  folders: Folder[];
  pendingDelete: boolean;
}

export interface LocalIdentity {
  user: User;
  syncedAt: string;
}

export interface OfflineDb {
  version: 1;
  identity: LocalIdentity | null;
  projects: Record<string, OfflineProject>;
  queue: PendingOp[];
  conflicts: Record<string, ConflictRecord>;
  nextId: number;
  aliases: Record<string, string>;
  lastSyncAt: string | null;
}

const KEY = 'coderunner-offline-db';

export function emptyDb(): OfflineDb {
  return {
    version: 1,
    identity: null,
    projects: {},
    queue: [],
    conflicts: {},
    nextId: 1,
    aliases: {},
    lastSyncAt: null,
  };
}

export function loadDb(): OfflineDb {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as Partial<OfflineDb>;
    const base = emptyDb();
    return {
      ...base,
      ...parsed,
      projects: parsed.projects ?? {},
      queue: parsed.queue ?? [],
      conflicts: parsed.conflicts ?? {},
      aliases: parsed.aliases ?? {},
      nextId: parsed.nextId && parsed.nextId > 0 ? parsed.nextId : 1,
      version: 1,
    };
  } catch {
    return emptyDb();
  }
}

export function saveDb(db: OfflineDb): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // storage full or unavailable — the in-memory copy still serves the tab
  }
}

export function withDb<T>(fn: (db: OfflineDb) => { db: OfflineDb; result: T }): T {
  const db = loadDb();
  const next = fn(db);
  saveDb(next.db);
  return next.result;
}

export function nextLocalId(db: OfflineDb): number {
  const id = -db.nextId;
  db.nextId += 1;
  return id;
}

export function resolveSlug(db: OfflineDb, slug: string): string {
  if (db.projects[slug]) return slug;
  return db.aliases[slug] ?? slug;
}

export function makeOpId(): string {
  return crypto.randomUUID();
}