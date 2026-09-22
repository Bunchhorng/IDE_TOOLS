import { loadDb, saveDb, nextLocalId, resolveSlug, makeOpId, type OfflineDb, type OfflineProject, type PendingOp } from './db';
import { isNetworkError, toApiPatch } from './sync';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import { folderService } from '../../services/folderService';
import type { ApiResponse, User, Project, File, Folder, PaginatedResponse } from '../../types';

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function setIdentity(user: User): void {
  withDb((db) => ({
    db: { ...db, identity: { user, syncedAt: new Date().toISOString() } },
    result: undefined,
  }));
}

export function getIdentity(): { user: User } | null {
  const db = loadDb();
  return db.identity ? { user: db.identity.user } : null;
}

export function clearIdentity(): void {
  withDb((db) => ({ db: { ...db, identity: null }, result: undefined }));
}

function withDb<T>(fn: (db: OfflineDb) => { db: OfflineDb; result: T }): T {
  const db = loadDb();
  const next = fn(db);
  saveDb(next.db);
  return next.result;
}

function ensureDraft(db: OfflineDb, slug: string, project: Project): OfflineProject {
  const key = resolveSlug(db, slug);
  if (!db.projects[key]) {
    db.projects[key] = {
      slug: key,
      project,
      files: [],
      folders: [],
      pendingDelete: false,
    };
  }
  return db.projects[key];
}

function purgeOps(db: OfflineDb, pred: (op: PendingOp) => boolean): void {
  db.queue = db.queue.filter((o) => !pred(o));
}

function findFileDraft(db: OfflineDb, id: number): { key: string; draft: OfflineProject; idx: number } | null {
  for (const [key, draft] of Object.entries(db.projects)) {
    const idx = draft.files.findIndex((f) => f.id === id);
    if (idx >= 0) return { key, draft, idx };
  }
  return null;
}

function findFolderDraft(db: OfflineDb, id: number): { key: string; draft: OfflineProject; idx: number } | null {
  for (const [key, draft] of Object.entries(db.projects)) {
    const idx = draft.folders.findIndex((f) => f.id === id);
    if (idx >= 0) return { key, draft, idx };
  }
  return null;
}

function applyFolderCascade(db: OfflineDb, rootId: number): void {
  const removed = new Set<number>();
  const collect = (id: number) => {
    removed.add(id);
    for (const draft of Object.values(db.projects)) {
      for (const f of draft.folders) if (f.parent_id === id) collect(f.id);
    }
  };
  collect(rootId);
  for (const draft of Object.values(db.projects)) {
    const under = (f: File) => f.folder_id !== null && removed.has(f.folder_id);
    const fileIds = new Set(draft.files.filter(under).map((f) => f.id));
    purgeOps(
      db,
      (o) =>
        (o.kind === 'create_folder' && removed.has(o.localId)) ||
        (o.kind === 'delete_folder' && removed.has(o.folderId)) ||
        (o.kind === 'update_folder' && removed.has(o.folderId)) ||
        (o.kind === 'create_file' && fileIds.has(o.localId)) ||
        (o.kind === 'delete_file' && fileIds.has(o.fileId)) ||
        (o.kind === 'update_file' && fileIds.has(o.fileId)),
    );
    draft.folders = draft.folders.filter((f) => !removed.has(f.id));
    draft.files = draft.files.filter((f) => !under(f));
  }
}

function purgestaleProjectOps(db: OfflineDb, key: string): void {
  purgeOps(
    db,
    (o) =>
      (o.kind === 'delete_project' && o.slug === key) ||
      (o.kind === 'update_project' && o.slug === key),
  );
}

function purgeDraftTree(db: OfflineDb, key: string): void {
  delete db.projects[key];
  for (const [old, s] of Object.entries(db.aliases)) if (s === key) delete db.aliases[old];
  purgeOps(
    db,
    (o) =>
      (o.kind === 'create_project' && o.slug === key) ||
      (o.kind === 'update_project' && o.slug === key) ||
      (o.kind === 'create_file' && o.slug === key) ||
      (o.kind === 'update_file' && o.slug === key) ||
      (o.kind === 'delete_file' && o.slug === key) ||
      (o.kind === 'create_folder' && o.slug === key) ||
      (o.kind === 'delete_folder' && o.folderId < 0) ||
      (o.kind === 'update_folder' && o.folderId < 0),
  );
}

function listProjectsLocal(): ApiResponse<PaginatedResponse<Project>> {
  const db = loadDb();
  const projects = Object.values(db.projects)
    .filter((d) => !d.pendingDelete)
    .map((d) => d.project)
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
  return {
    success: true,
    message: '',
    data: {
      data: projects,
      current_page: 1,
      last_page: 1,
      per_page: 100,
      total: projects.length,
    },
  };
}

function getProjectLocal(slug: string): ApiResponse<Project> {
  const db = loadDb();
  const key = resolveSlug(db, slug);
  const draft = db.projects[key];
  if (!draft) throw new Error(`project not found: ${slug}`);
  return { success: true, message: '', data: draft.project };
}

function getFilesLocal(slug: string): ApiResponse<File[]> {
  const db = loadDb();
  const key = resolveSlug(db, slug);
  const draft = db.projects[key];
  if (!draft) throw new Error(`project not found: ${slug}`);
  return { success: true, message: '', data: draft.files };
}

function getFoldersLocal(slug: string): ApiResponse<Folder[]> {
  const db = loadDb();
  const key = resolveSlug(db, slug);
  const draft = db.projects[key];
  if (!draft) throw new Error(`project not found: ${slug}`);
  return { success: true, message: '', data: draft.folders };
}

export const offlineService = {
  async listProjects(page = 1): Promise<ApiResponse<PaginatedResponse<Project>>> {
    try {
      const resp = await projectService.getAll(page);
      withDb((db) => {
        for (const p of resp.data.data) ensureDraft(db, p.slug, p);
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return listProjectsLocal();
      throw err;
    }
  },

  async getProject(slug: string): Promise<ApiResponse<Project>> {
    try {
      const resp = await projectService.getBySlug(slug);
      withDb((db) => {
        ensureDraft(db, slug, resp.data);
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return getProjectLocal(slug);
      throw err;
    }
  },

  async getFiles(slug: string): Promise<ApiResponse<File[]>> {
    try {
      const resp = await fileService.getByProject(slug);
      withDb((db) => {
        const key = resolveSlug(db, slug);
        const draft = db.projects[key];
        if (draft && !draft.pendingDelete) draft.files = resp.data;
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return getFilesLocal(slug);
      throw err;
    }
  },

  async getFolders(slug: string): Promise<ApiResponse<Folder[]>> {
    try {
      const resp = await folderService.getByProject(slug);
      withDb((db) => {
        const key = resolveSlug(db, slug);
        const draft = db.projects[key];
        if (draft && !draft.pendingDelete) draft.folders = resp.data;
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return getFoldersLocal(slug);
      throw err;
    }
  },

  async createProject(payload: { name: string; description?: string }): Promise<ApiResponse<Project>> {
    try {
      const resp = await projectService.create(payload);
      withDb((db) => {
        ensureDraft(db, resp.data.slug, resp.data);
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return createProjectLocal(payload.name, payload.description ?? null);
      throw err;
    }
  },

  async updateProject(slug: string, patch: { name?: string; description?: string | null }): Promise<ApiResponse<Project>> {
    const db0 = loadDb();
    const key = resolveSlug(db0, slug);
    const createdOp = db0.queue.find((o) => o.kind === 'create_project' && o.slug === key);
    if (createdOp && createdOp.kind === 'create_project') {
      return withDb<ApiResponse<Project>>((db) => {
        const draft = db.projects[key];
        if (!draft) throw new Error(`project not found: ${slug}`);
        createdOp.payload = { ...createdOp.payload, ...patch };
        draft.project = {
          ...draft.project,
          name: patch.name ?? draft.project.name,
          description: patch.description !== undefined ? patch.description : draft.project.description,
        };
        return { db, result: { success: true, message: '', data: draft.project } };
      });
    }
    try {
      const resp = await projectService.update(key, toApiPatch(patch));
      withDb((db) => {
        const draft = db.projects[resolveSlug(db, key)];
        if (draft) draft.project = { ...draft.project, ...resp.data };
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) {
        return withDb<ApiResponse<Project>>((db) => {
          const draft = db.projects[resolveSlug(db, key)];
          if (!draft) throw new Error(`project not found: ${slug}`);
          draft.project = {
            ...draft.project,
            name: patch.name ?? draft.project.name,
            description: patch.description !== undefined ? patch.description : draft.project.description,
          };
          purgestaleProjectOps(db, key);
          db.queue.push({
            id: makeOpId(),
            kind: 'update_project',
            createdAt: new Date().toISOString(),
            slug: key,
            payload: { ...patch },
          });
          return { db, result: { success: true, message: '', data: draft.project } };
        });
      }
      throw err;
    }
  },

  async deleteProject(slug: string): Promise<ApiResponse<null>> {
    return withDb((db) => {
      const key = resolveSlug(db, slug);
      purgestaleProjectOps(db, key);
      const createdOp = db.queue.find((o) => o.kind === 'create_project' && o.slug === key);
      if (createdOp && createdOp.kind === 'create_project') {
        db.queue = db.queue.filter((o) => o !== createdOp);
        purgeDraftTree(db, key);
        return { db, result: { success: true, message: '', data: null } };
      }
      if (isOffline()) {
        const draft = db.projects[key];
        if (draft) draft.pendingDelete = true;
        db.queue.push({
          id: makeOpId(),
          kind: 'delete_project',
          createdAt: new Date().toISOString(),
          slug: key,
        });
        return { db, result: { success: true, message: '', data: null } };
      }
      saveDb(db);
      void projectService
        .delete(key)
        .then(() => {
          withDb((inner) => {
            purgeDraftTree(inner, key);
            return { db: inner, result: undefined };
          });
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            withDb((inner) => {
              const draft = inner.projects[resolveSlug(inner, key)];
              if (draft) draft.pendingDelete = true;
              inner.queue.push({
                id: makeOpId(),
                kind: 'delete_project',
                createdAt: new Date().toISOString(),
                slug: key,
              });
              return { db: inner, result: undefined };
            });
          }
        });
      return { db, result: { success: true, message: '', data: null } };
    });
  },

  async createFile(
    slug: string,
    data: { filename: string; language: string; content?: string; folder_id?: number | null },
  ): Promise<ApiResponse<File>> {
    try {
      const resp = await fileService.create(slug, data);
      withDb((db) => {
        const key = resolveSlug(db, slug);
        const draft = db.projects[key];
        if (draft) draft.files = draft.files.filter((f) => f.id !== resp.data.id).concat([resp.data]);
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return createFileLocal(slug, data);
      throw err;
    }
  },

  async updateFile(
    id: number,
    data: { content?: string; language?: string; filename?: string; folder_id?: number | null },
  ): Promise<ApiResponse<File>> {
    try {
      const resp = await fileService.update(id, data);
      withDb((db) => {
        purgeOps(db, (o) => o.kind === 'update_file' && o.fileId === id);
        const hit = findFileDraft(db, id);
        if (hit) hit.draft.files[hit.idx] = { ...hit.draft.files[hit.idx], ...resp.data };
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return updateFileLocal(id, data, null);
      throw err;
    }
  },

  async deleteFile(id: number): Promise<ApiResponse<null>> {
    try {
      const resp = await fileService.delete(id);
      withDb((db) => {
        purgeOps(db, (o) => (o.kind === 'update_file' || o.kind === 'delete_file') && o.fileId === id);
        const hit = findFileDraft(db, id);
        if (hit) hit.draft.files.splice(hit.idx, 1);
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return deleteFileLocal(id);
      throw err;
    }
  },

  async createFolder(
    slug: string,
    data: { name: string; parent_id?: number | null },
  ): Promise<ApiResponse<Folder>> {
    try {
      const resp = await folderService.create(slug, data);
      withDb((db) => {
        const key = resolveSlug(db, slug);
        const draft = db.projects[key];
        if (draft) draft.folders = draft.folders.filter((f) => f.id !== resp.data.id).concat([resp.data]);
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return createFolderLocal(slug, data);
      throw err;
    }
  },

  async updateFolder(id: number, data: { name?: string; parent_id?: number | null }): Promise<ApiResponse<Folder>> {
    try {
      const resp = await folderService.update(id, data);
      withDb((db) => {
        purgeOps(db, (o) => o.kind === 'update_folder' && o.folderId === id);
        const hit = findFolderDraft(db, id);
        if (hit) hit.draft.folders[hit.idx] = { ...hit.draft.folders[hit.idx], ...resp.data };
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return updateFolderLocal(id, data);
      throw err;
    }
  },

  async deleteFolder(id: number): Promise<ApiResponse<null>> {
    try {
      const resp = await folderService.delete(id);
      withDb((db) => {
        applyFolderCascade(db, id);
        purgeOps(db, (o) => o.kind === 'delete_folder' && o.folderId === id);
        return { db, result: undefined };
      });
      return resp;
    } catch (err) {
      if (isNetworkError(err)) return deleteFolderLocal(id);
      throw err;
    }
  },
};

function createProjectLocal(name: string, description: string | null): ApiResponse<Project> {
  return withDb((db) => {
    const now = new Date().toISOString();
    const id = nextLocalId(db);
    const slug = `local-${crypto.randomUUID().slice(0, 8)}`;
    const project: Project = {
      id,
      slug,
      user_id: db.identity?.user.id ?? 0,
      name,
      description,
      created_at: now,
      updated_at: now,
    };
    db.projects[slug] = { slug, project, files: [], folders: [], pendingDelete: false };
    db.queue.push({
      id: makeOpId(),
      kind: 'create_project',
      createdAt: now,
      slug,
      payload: { name, description },
    });
    return { db, result: { success: true, message: '', data: project } };
  });
}

function createFileLocal(
  slug: string,
  data: { filename: string; language: string; content?: string; folder_id?: number | null },
): ApiResponse<File> {
  return withDb((db) => {
    const key = resolveSlug(db, slug);
    const draft = db.projects[key];
    if (!draft) throw new Error(`project not found: ${slug}`);
    const now = new Date().toISOString();
    const id = nextLocalId(db);
    const file: File = {
      id,
      project_id: draft.project.id,
      folder_id: data.folder_id ?? null,
      filename: data.filename,
      language: data.language,
      content: data.content ?? '',
      created_at: now,
      updated_at: now,
    };
    draft.files.push(file);
    db.queue.push({
      id: makeOpId(),
      kind: 'create_file',
      createdAt: now,
      slug: key,
      localId: id,
      payload: {
        filename: data.filename,
        language: data.language,
        content: data.content ?? '',
        folder_id: data.folder_id ?? null,
      },
    });
    return { db, result: { success: true, message: '', data: file } };
  });
}

function updateFileLocal(
  id: number,
  data: { content?: string; language?: string; filename?: string; folder_id?: number | null },
  _base: string | null,
): ApiResponse<File> {
  return withDb((db) => {
    const hit = findFileDraft(db, id);
    if (!hit) throw new Error(`file not found: ${id}`);
    const prev = hit.draft.files[hit.idx];
    hit.draft.files[hit.idx] = { ...prev, ...data };
    purgeOps(db, (o) => o.kind === 'update_file' && o.fileId === id);
    db.queue.push({
      id: makeOpId(),
      kind: 'update_file',
      createdAt: new Date().toISOString(),
      fileId: id,
      slug: hit.draft.slug,
      payload: {
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
        ...(data.filename !== undefined ? { filename: data.filename } : {}),
        ...(data.folder_id !== undefined ? { folder_id: data.folder_id } : {}),
        baseUpdatedAt: prev.updated_at,
      },
    });
    return { db, result: { success: true, message: '', data: hit.draft.files[hit.idx] } };
  });
}

function deleteFileLocal(id: number): ApiResponse<null> {
  return withDb((db) => {
    const hit = findFileDraft(db, id);
    const createdOp = db.queue.find((o) => o.kind === 'create_file' && o.localId === id);
    purgeOps(
      db,
      (o) =>
        (o.kind === 'create_file' && o.localId === id) ||
        (o.kind === 'update_file' && o.fileId === id) ||
        (o.kind === 'delete_file' && o.fileId === id),
    );
    if (createdOp && createdOp.kind === 'create_file') {
      if (hit) hit.draft.files.splice(hit.idx, 1);
      return { db, result: { success: true, message: '', data: null } };
    }
    db.queue.push({
      id: makeOpId(),
      kind: 'delete_file',
      createdAt: new Date().toISOString(),
      fileId: id,
      slug: hit?.draft.slug ?? '',
    });
    if (hit) hit.draft.files.splice(hit.idx, 1);
    return { db, result: { success: true, message: '', data: null } };
  });
}

function createFolderLocal(
  slug: string,
  data: { name: string; parent_id?: number | null },
): ApiResponse<Folder> {
  return withDb((db) => {
    const key = resolveSlug(db, slug);
    const draft = db.projects[key];
    if (!draft) throw new Error(`project not found: ${slug}`);
    const now = new Date().toISOString();
    const id = nextLocalId(db);
    const folder: Folder = {
      id,
      project_id: draft.project.id,
      parent_id: data.parent_id ?? null,
      name: data.name,
      created_at: now,
      updated_at: now,
    };
    draft.folders.push(folder);
    db.queue.push({
      id: makeOpId(),
      kind: 'create_folder',
      createdAt: now,
      slug: key,
      localId: id,
      payload: { name: data.name, parent_id: data.parent_id ?? null },
    });
    return { db, result: { success: true, message: '', data: folder } };
  });
}

function updateFolderLocal(id: number, data: { name?: string; parent_id?: number | null }): ApiResponse<Folder> {
  return withDb((db) => {
    const hit = findFolderDraft(db, id);
    if (!hit) throw new Error(`folder not found: ${id}`);
    hit.draft.folders[hit.idx] = { ...hit.draft.folders[hit.idx], ...data };
    purgeOps(db, (o) => o.kind === 'update_folder' && o.folderId === id);
    db.queue.push({
      id: makeOpId(),
      kind: 'update_folder',
      createdAt: new Date().toISOString(),
      slug: hit.draft.slug,
      folderId: id,
      payload: { ...data },
    });
    return { db, result: { success: true, message: '', data: hit.draft.folders[hit.idx] } };
  });
}

function deleteFolderLocal(id: number): ApiResponse<null> {
  return withDb((db) => {
    const createdOp = db.queue.find((o) => o.kind === 'create_folder' && o.localId === id);
    purgeOps(
      db,
      (o) =>
        (o.kind === 'create_folder' && o.localId === id) ||
        (o.kind === 'update_folder' && o.folderId === id) ||
        (o.kind === 'delete_folder' && o.folderId === id),
    );
    if (createdOp && createdOp.kind === 'create_folder') {
      applyFolderCascade(db, id);
      return { db, result: { success: true, message: '', data: null } };
    }
    const hit = findFolderDraft(db, id);
    db.queue.push({
      id: makeOpId(),
      kind: 'delete_folder',
      createdAt: new Date().toISOString(),
      slug: hit?.draft.slug ?? '',
      folderId: id,
    });
    applyFolderCascade(db, id);
    return { db, result: { success: true, message: '', data: null } };
  });
}