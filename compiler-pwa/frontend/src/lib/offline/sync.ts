import { loadDb, saveDb, resolveSlug, makeOpId, type OfflineDb, type PendingOp, type ConflictRecord } from './db';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import { folderService } from '../../services/folderService';

export interface FlushSummary {
  completed: number;
  failed: number;
  conflicts: number;
  done: boolean;
}

export function isNetworkError(err: unknown): boolean {
  const e = err as { response?: unknown };
  return !e.response;
}

export function toApiPatch(p: { name?: string; description?: string | null }): { name?: string; description?: string } {
  const out: { name?: string; description?: string } = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.description !== undefined && p.description != null) out.description = p.description;
  return out;
}

async function expectOk<T>(p: Promise<{ success: boolean; message: string; data: T }>): Promise<T> {
  const r = await p;
  return r.data;
}

function draftKey(db: OfflineDb, slug: string): string {
  return resolveSlug(db, slug);
}

async function mirrorProject(db: OfflineDb, realSlug: string, queue: PendingOp[]): Promise<void> {
  const project = db.projects[realSlug];
  if (!project || project.pendingDelete) return;
  const busy = queue.some((o) => 'slug' in o && draftKey(db, o.slug) === realSlug);
  if (busy) return;
  try {
    const p = await expectOk(projectService.getBySlug(realSlug));
    const files = await expectOk(fileService.getByProject(realSlug));
    const folders = await expectOk(folderService.getByProject(realSlug));
    project.project = p;
    project.files = files;
    project.folders = folders;
  } catch {
    // transient — the draft stays as-is
  }
}

export async function flushQueue(): Promise<FlushSummary> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { completed: 0, failed: 0, conflicts: 0, done: false };
  }

  const db = loadDb();
  const ops = [...db.queue];
  const remaining: PendingOp[] = [];
  const touched = new Set<string>();
  let completed = 0;
  let failed = 0;
  let conflicts = 0;

  for (const op of ops) {
    try {
      await applyOp(db, op);
      completed += 1;
    } catch (err) {
      if (isNetworkError(err)) {
        remaining.push(...ops.slice(ops.indexOf(op)));
        break;
      }
      remaining.push(op);
      failed += 1;
    }
    saveDb(db);
  }

  db.queue = remaining;
  db.lastSyncAt = new Date().toISOString();
  saveDb(db);

  for (const slug of touched) {
    await mirrorProject(db, slug, remaining);
  }
  db.lastSyncAt = new Date().toISOString();
  saveDb(db);

  const done = remaining.length === 0;
  return { completed, failed, conflicts, done };
}

async function applyOp(db: OfflineDb, op: PendingOp): Promise<void> {
  switch (op.kind) {
    case 'create_project': {
      const pk = op.slug;
      const draft = db.projects[pk];
      if (!draft) return;
      const created = await expectOk(
        projectService.create({ name: op.payload.name, description: op.payload.description ?? undefined }),
      );
      const next: typeof draft = {
        ...draft,
        slug: created.slug,
        project: created,
        files: draft.files.map((f) => ({ ...f, project_id: created.id })),
        folders: draft.folders.map((f) => ({ ...f, project_id: created.id })),
      };
      db.projects[created.slug] = next;
      delete db.projects[pk];
      db.aliases[pk] = created.slug;
      for (const o of db.queue) {
        if ('slug' in o && o.slug === pk) o.slug = created.slug;
      }
      return;
    }
    case 'update_project': {
      const key = draftKey(db, op.slug);
      const draft = db.projects[key];
      if (!draft) return;
      const updated = await expectOk(projectService.update(op.slug, toApiPatch(op.payload)));
      draft.project = { ...draft.project, ...updated };
      draft.pendingDelete = false;
      return;
    }
    case 'delete_project': {
      await expectOk(projectService.delete(op.slug));
      delete db.projects[op.slug];
      for (const [old, s] of Object.entries(db.aliases)) {
        if (s === op.slug) delete db.aliases[old];
      }
      return;
    }
    case 'create_file': {
      const key = draftKey(db, op.slug);
      const draft = db.projects[key];
      if (!draft) return;
      const created = await expectOk(fileService.create(op.slug, op.payload));
      rewriteFileId(db, op.localId, created.id, key);
      const idx = draft.files.findIndex((f) => f.id === op.localId);
      if (idx >= 0) draft.files[idx] = created;
      else draft.files.push(created);
      return;
    }
    case 'update_file': {
      const f = await expectOk(fileService.getById(op.fileId));
      const base = op.payload.baseUpdatedAt;
      if (
        base !== null &&
        base !== f.updated_at &&
        (op.payload.content !== undefined || op.payload.language !== undefined)
      ) {
        recordConflict(db, op, f);
        return;
      }
      const rest = {
        ...(op.payload.content !== undefined ? { content: op.payload.content } : {}),
        ...(op.payload.language !== undefined ? { language: op.payload.language } : {}),
        ...(op.payload.filename !== undefined ? { filename: op.payload.filename } : {}),
        ...(op.payload.folder_id !== undefined ? { folder_id: op.payload.folder_id } : {}),
      };
      const updated = await expectOk(fileService.update(op.fileId, rest));
      const key = draftKey(db, op.slug);
      const draft = db.projects[key];
      if (draft) {
        const idx = draft.files.findIndex((x) => x.id === op.fileId);
        if (idx >= 0) draft.files[idx] = { ...draft.files[idx], ...updated };
      }
      return;
    }
    case 'delete_file': {
      await expectOk(fileService.delete(op.fileId));
      for (const draft of Object.values(db.projects)) {
        draft.files = draft.files.filter((f) => f.id !== op.fileId);
      }
      return;
    }
    case 'create_folder': {
      const key = draftKey(db, op.slug);
      const draft = db.projects[key];
      if (!draft) return;
      const created = await expectOk(folderService.create(op.slug, op.payload));
      rewriteFolderId(db, op.localId, created.id, key);
      const idx = draft.folders.findIndex((x) => x.id === op.localId);
      if (idx >= 0) draft.folders[idx] = created;
      else draft.folders.push(created);
      return;
    }
    case 'update_folder': {
      const { folderId, payload } = op;
      const updated = await expectOk(folderService.update(folderId, payload));
      for (const draft of Object.values(db.projects)) {
        const idx = draft.folders.findIndex((x) => x.id === folderId);
        if (idx >= 0) draft.folders[idx] = { ...draft.folders[idx], ...updated };
      }
      return;
    }
    case 'delete_folder': {
      await expectOk(folderService.delete(op.folderId));
      for (const draft of Object.values(db.projects)) {
        draft.folders = draft.folders.filter((f) => f.id !== op.folderId && f.parent_id !== op.folderId);
        draft.files = draft.files.filter((x) => x.folder_id !== op.folderId);
      }
      return;
    }
  }
}

function rewriteFileId(db: OfflineDb, localId: number, newId: number, key: string): void {
  for (const o of db.queue) {
    if ((o.kind === 'update_file' || o.kind === 'delete_file') && o.fileId === localId) {
      const sameProject =
        'slug' in o && draftKey(db, o.slug) === key;
      if (sameProject) o.fileId = newId;
    }
  }
}

function rewriteFolderId(db: OfflineDb, localId: number, newId: number, key: string): void {
  for (const o of db.queue) {
    if ((o.kind === 'update_folder' || o.kind === 'delete_folder') && o.folderId === localId) {
      const opKey = 'slug' in o ? o.slug : '';
      if (opKey === key) o.folderId = newId;
    }
  }
}

function recordConflict(
  db: OfflineDb,
  op: Extract<PendingOp, { kind: 'update_file' }>,
  server: { content: string; language: string; updated_at: string },
): void {
  const key = draftKey(db, op.slug);
  const draft = db.projects[key];
  const local =
    draft?.files.find((x) => x.id === op.fileId) ?? {
      content: op.payload.content ?? '',
      language: op.payload.language ?? 'python',
    };
  const record: ConflictRecord = {
    opId: op.id,
    fileId: op.fileId,
    slug: key,
    filename:
      draft?.files.find((x) => x.id === op.fileId)?.filename ?? op.payload.filename ?? `#${op.fileId}`,
    local: {
      content: op.payload.content ?? local.content,
      language: op.payload.language ?? local.language,
      updatedAt: null,
    },
    server: { content: server.content, language: server.language, updatedAt: server.updated_at },
    createdAt: op.createdAt,
  };
  db.conflicts[op.id] = record;
}

export async function resolveConflict(fileId: number, choice: 'local' | 'server'): Promise<void> {
  const db = loadDb();
  const entry = Object.values(db.conflicts).find((c) => c.fileId === fileId);
  if (!entry) return;
  delete db.conflicts[entry.opId];
  const key = draftKey(db, entry.slug);
  const draft = db.projects[key];
  if (choice === 'server') {
    if (draft) {
      const idx = draft.files.findIndex((x) => x.id === fileId);
      if (idx >= 0) {
        const prev = draft.files[idx];
        draft.files[idx] = {
          ...prev,
          content: entry.server.content,
          language: entry.server.language,
          updated_at: entry.server.updatedAt ?? prev.updated_at,
        };
      }
    }
  } else {
    db.queue.push({
      id: makeOpId(),
      kind: 'update_file',
      createdAt: new Date().toISOString(),
      fileId,
      slug: draft?.slug ?? entry.slug,
      payload: {
        content: entry.local.content,
        language: entry.local.language,
        baseUpdatedAt: entry.server.updatedAt,
      },
    });
  }
  saveDb(db);
}

export function listConflicts(): ConflictRecord[] {
  const db = loadDb();
  return Object.values(db.conflicts);
}

export function hasPendingOps(): boolean {
  const db = loadDb();
  return db.queue.length > 0;
}

export function pendingOpCount(): number {
  return loadDb().queue.length;
}