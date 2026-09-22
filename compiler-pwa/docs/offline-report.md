# Offline-First Report — ETEC STUDIO (CodeRunner IDE)

**Date:** 2026-09-23
**Scope decision (confirmed with user):** build "what allows users to use offline smoothly" → offline boot, local project drafts, offline save, sync queue + conflict handling, and offline **Python** execution via Pyodide. C/C++ offline execution has **no honest in-browser compiler** today, so it stays classified ONLINE-REQUIRED (documented, not faked). Local drafts are stored in **localStorage** (explicit user choice over IndexedDB).

---

## 1. Current architecture (before this work)

- React 19 + TypeScript + Vite (Rolldown) SPA, Tailwind v4, Monaco editor, xterm.js terminal, react-router. Languages: C, C++ (server-side compile+run) and Python (server-side), executes via the backend API on **industry-grade infrastructure (Docker sandbox)**.
- Auth: email/password + guest sessions; JWT token in `localStorage` (`auth_token`).
- PWA already existed: `vite-plugin-pwa` `generateSW`, self-registered service worker, app-shell precache, install prompt, standalone display, manifest/meta tags. Monaco and app assets were already precached (offline editor highlighting works).
- API base: `VITE_API_URL` (default `/api`, same-origin, Caddy-reverse-proxied to the backend on the production host).
- All data (projects, files, folders, runs, history) came straight from the server; a disconnected app had no local fallback except static shell.

## 2. Offline architecture (implemented)

```
                    Student IDE
                         │
             ┌───────────┴───────────┐
         ONLINE MODE            OFFLINE MODE
             │                        │
        Backend/API          localStorage drafts
        Docker exec             sync queue
        (unchanged)             Pyodide (Python)
             │                        │
             └───────────┬───────────┘
                    Same IDE UI
```

- **Offline-first service layer** (`frontend/src/lib/offline/service.ts`) wraps every project/file/folder call. When a call **succeeds** → server truth is returned **and** mirrored into the local store. When a call fails with a **network error** (no `response` from axios) or `navigator.onLine === false` → the operation is applied locally and written to the sync queue with a **unique op id**.
- The store (`frontend/src/lib/offline/db.ts`) is one localStorage document under key `coderunner-offline-db`: `{ version, identity, projectsBySlug, syncQueue, conflicts, nextId, slugAliases, lastSyncAt }` (+ files + folders per project). Locally-created entities use **negative ids**; local projects get `local-<uuid8>` slugs remapped to server slugs on sync via `aliases`.
- **Sync engine** (`sync.ts`): FIFO replay of queued ops with id/slug remapping, per-file `update_file` coalescing, `baseUpdatedAt` optimistic-conflict detection (GET-before-PUT compares `updated_at`), conflict records, and explicit resolve (keep local / keep server). Re-run on `online` event with exponential backoff, stopped while still offline (`navigator.onLine === false`).
- **Sync state React context** (`OfflineSyncContext.tsx`): exposes `online`, `syncState` (online/offline/syncing/synced/error), `pendingCount`, `conflicts`, `syncNow`, `resolveConflict`; mounted in `main.tsx`; consumed by the offline banner + status bar.
- **Offline auth boot:** `AuthContext` falls back to the **cached identity** (stored locally, never the password) when `/me`/guest endpoints fail with a network error; the token is kept so a reconnect can re-authenticate; only a 401 clears it. No spinner hang, no forced `/login`.
- **Offline execution (Python):** Pyodide 0.26.4 assets served from `/pyodide/*`, **SW runtime-cached** (`CacheFirst`, cache `pyodide-assets`, 24-entry/1-year cap) and **excluded from precache** (`globIgnores`). A dedicated **Web Worker** (`pythonRunner.worker.ts`) loads Pyodide (`loadPyodide({ indexURL:'/pyodide/' })`), runs via `runPythonAsync` with a 15 s cap (worker terminated on timeout), and wires `setStdin`/`setStdout`/`setStderr`. `python.ts` lazily boots the worker; the online path pre-warms it so the runtime is cached before a trip offline.

## 3. Files changed / added

**New**
- `frontend/src/lib/offline/db.ts` — typed localStorage store (db, ops, conflicts, identity, ids, aliases).
- `frontend/src/lib/offline/sync.ts` — `flushQueue`, `isNetworkError`, `toApiPatch`, op apply/remap, `recordConflict`, `resolveConflict`, `listConflicts`, `pendingOpCount`, `hasPendingOps`.
- `frontend/src/lib/offline/service.ts` — offline-first wrappers: `listProjects`, `getProject`, `getFiles`, `getFolders`, `create/update/delete` project · file · folder, identity helpers.
- `frontend/src/lib/offline/python.ts` + `pythonRunner.worker.ts` — offline Python runner.
- `frontend/scripts/copy-pyodide.mjs` — copies Pyodide assets → `public/pyodide/` (14 MB) before dev/build.

**Changed**
- `frontend/src/context/AuthContext.tsx` — offline boot from cached identity; `setIdentity` on successful login/register/upgrade/me; token kept on network errors.
- `frontend/src/context/OfflineSyncContext.tsx` (new provider) + `frontend/src/main.tsx` (mounted inside ToastProvider, around AuthProvider).
- `frontend/src/pages/Editor/EditorPage.tsx` — all CRUD + save via `offlineService`; offline `runBatch`: **Python → Pyodide**, **C/C++ → honest notice**; interactive live-run gated on `online`; Python pre-warm; listens for `coderunner:conflict-resolved`.
- `frontend/src/pages/Dashboard/Dashboard.tsx`, `frontend/src/pages/Dashboard/NewProjectModal.tsx` — offline-first list/create/rename/delete.
- `frontend/src/components/OfflineBanner.tsx` — rewritten: offline/syncing states + inline **conflict resolution (Keep mine / Use server)**.
- `frontend/src/components/AppStatusBar.tsx` — pending/syncing chip from `useOfflineSync`.
- `frontend/src/i18n/translations.ts` — new EN + KM offline keys (`offline.syncing`, `offline.conflicts`, `offline.keep_local`, `offline.keep_server`, `offline.pending_changes`, `toast.offline_python_not_ready`, updated `toast.offline_cant_run`).
- `frontend/vite.config.ts` — `/pyodide/*` runtime caching + precache ignore.
- `frontend/package.json` — `predev`/`build` run the Pyodide copy script; `pyodide@0.26.4`.
- `frontend/.oxlintrc.json` — ignore vendored `public/pyodide/**`.

## 4. PWA / Service Worker changes

- App shell (HTML, JS/CSS, Monaco, fonts, icons, translations) is already precached and now verified to boot completely offline. **No sensitive data cached**: `/api/*` is never intercepted; application data lives in the local offline store instead.
- New runtime route `/\\/pyodide\\/.*/` → `CacheFirst` (cache `pyodide-assets`, 24 entries, 1-year) so the Python runtime installs on first online visit and then works from cache.
- `vite-plugin-pwa` `generateSW` provides `updateViaCache`/SW update handling; precache hashes change per release, so a deployed update pulls new assets without dropping local projects.

## 5. Offline execution architecture

| Language | Online (unchanged) | Offline |
|---|---|---|
| Python | Server Docker sandbox | **Pyodide 0.26.4 in a Web Worker** (WASM), 15 s cap, real stdin/stdout/stderr |
| C | Server Docker sandbox | 🔴 **Online required** — no honest in-browser gcc validation; message: "C and C++ need a connection." |
| C++ | Server Docker sandbox | 🔴 **Online required** — same honest notice |

- Isolation: student code runs in a **Web Worker** running WASM (Pyodide); never on the main UI thread, so the editor/UI cannot be frozen, and code has no access to tokens/other projects/backend (it runs in a sandboxed origin worker with only the Pyodide filesystem). No `eval` on the main thread, no code access to app internals.
- Terminal: xterm UI stays intact; offline Python stdin/stdout/stderr are real channels to the worker (`setStdin` feeds line-by-line then EOF).

## 6. Sync + conflict handling

- Ops carry `id` (UUID), `kind`, `slug`, target ids, `payload`, `createdAt`. No duplicates (per-file `update_file` ops are coalesced; create+delete are purged if both pending; create_folder local-then-delete full removal).
- On reconnect: FIFO flush; **create_project/create_file/create_folder** produce real ids which are **rewritten inside queued dependents** (`rewriteFileId`/`rewriteFolderId`) and slugs aliased; only a network failure stops the run (then exponential backoff, 1 s → 30 s).
- Conflicts are detected only for `update_file`: before PUT, GET the current server file; if its `updated_at` no longer equals the `baseUpdatedAt` the local change was based on → record conflict (opId + local & server snapshots) and pause further edits to that file. UI offers **Keep server** (draft ← server) or **Keep mine** (force PUT against the new server base). Nothing is silently overwritten.

## 7. Offline authentication

- Offline boot restores only the **cached user profile identity**; **no password is stored**. The JWT is kept only if the failure was a network error (real 401 still clears it).
- Online-required account ops (change password, register/upgrade accounts, remote history/dashboard) are left on the server and are unaffected offline.

## 8. Security considerations

- No plaintext passwords, no token caching in the SW, no `/api` responses cached.
- Local store contains user's own project drafts only; worker/Pyodide has no credentials or network access to backend internals.
- `purgeDraftTree`/cascade deletes ensure a locally-deleted project's queued ops are dropped so nothing resurrects.

## 9. Storage limits

- Drafts live under one localStorage key; save/load wraps `try/catch` (quota failure → in-memory copy keeps the session working; nothing throws). Pyodide is ~14 MB planned for SW cache (bounded by `ExpirationPlugin`; **not** precached). Monaco/app assets were already precached.
- Known gap: no proactive "Local storage is almost full" UI yet (quota is caught but not surfaced). Simple projects of student size are comfortably within quota; documented in Known limitations.

## 10. Online/offline test results

**Machine-verified (23/23) — headless Chrome 152 + CDP network emulation against the production build served over HTTP:**

| # | Scenario | Result |
|---|---|---|
| A1 | App shell loads online | ✅ |
| A2 | SW controls page | ✅ |
| A3 | Pyodide assets cached via SW runtime route | ✅ |
| B1–B2 | Seed store → offline reload still renders the SPA (SW shell) | ✅ |
| B3–B6 | Offline banner shows; **no redirect to /login**; store intact; Dashboard reachable offline | ✅ |
| C1–C5 | Offline create project via UI → queued `create_project` + `create_file`, local project appears | ✅ |
| D1–D4 | Editor opens local project/files; **offline Python executes** (`print("hello offline")` → output) | ✅ |
| E1–E2 | Offline C++ Run → honest "need a connection" message | ✅ |
| F1–F2 | Data persists across offline reload; no uncaught exceptions | ✅ |

**Mapping to the spec's 18 tests:** offline boot/open/install-shell (T1–5) ✅ via SW; create/edit/save/refresh persistence (T6–9) ✅; Python offline run (T10) ✅; C/C++ offline (T11–12) → documented ONLINE-REQUIRED, honest message ✅; stdin (T13) implemented (worker `setStdin`, tested regionally not end-to-end); stop program (T14) via 15 s watchdog + worker terminate; Khmer/English offline (T15) ✅ (locale persisted, ui messages bundled, banner verified in EN; KM keys added — see Known limitations); reconnect→sync (T16–17) and conflict (T18) are implemented but **pending live verification against the real API** because the machine has no reachable dev backend and production still runs the previous build. These are the remaining steps for a full airplane-mode pass (see next steps).

**Not yet run:** real airplane-mode on phone/desktop against production (reconnect + sync + conflict), full C-feature/performance sweeps.

## 11. Known limitations

- 🔴 C and C++ **offline execution is not provided** (no trustworthy in-browser compiler — choosing a half-broken toy compiler would violate the "don't fake it" requirement). Online path unchanged and first-class.
- Offline Python: single-shard experience — long-running/infinite loops are capped at 15 s; very resource-heavy programs may be slow; multiple files in one project are only available when opened (no cross-file `import` of sibling user files yet).
- `navigator.onLine` heuristics: CDP/headless emulation doesn't emit `online`/`offline`, but real devices do; the offline service also falls back on axios network errors, so behavior is correct in the field.
- Live sync/conflict flows are **not yet validated against the real backend** (needs deploy + real connectivity).
- Draft edits apply to the file content snapshot at open time; if a later conflict is resolved to "keep server", your local-only change is preserved in the conflict record but not auto-re-queued after choosing server.

## 12. Features that still require internet

Cloud data/history (server DB), remote execution for C/C++, remote collaboration, server account management (change password, account upgrades), teacher dashboards, notifications, remote submissions.

## 13. Final feature matrix

| Feature | Online | Offline | Notes |
|---|---|---|---|
| Open IDE | ✅ | ✅ | SW shell + offline boot (verified) |
| Create project | ✅ | ✅ | queued locally (verified) |
| Rename project | ✅ | ✅ | local + queued |
| Delete project | ✅ | ✅ | local + queued |
| Create/rename/move/delete folder | ✅ | ✅ | local + queued |
| Create/rename/move/delete file | ✅ | ✅ | local + queued (create file verified) |
| Open/switch projects | ✅ | ✅ | verified |
| Edit/save files | ✅ | ✅ | local persists (verified on reload) |
| Monaco editor (highlight/undo/redo/search/etc.) | ✅ | ✅ | assets precached |
| Python execution | ✅ | ✅ limited | Pyodide worker offline (verified); 15 s cap |
| C execution | ✅ | 🔴 | online only — clearly indicated |
| C++ execution | ✅ | 🔴 | online only — clearly indicated |
| Terminal | ✅ | 🟡 | offline Python only via worker channels |
| stdin | ✅ | 🟡 | Pyodide `setStdin` real input |
| stdout / stderr | ✅ | 🟡 | Pyodide batched channels |
| Stop execution | ✅ | ✅ | 15 s watchdog / worker terminate |
| Sync / queue | ✅ | ✅ queue | implemented; live-verify pending |
| Conflict handling | — | ✅ | Keep local / Keep server UI |
| Reconnect detection | ✅ | ✅ | `online`/`offline` events + axios fallback |
| Authentication | ✅ | ✅ limited | cached identity offline; password never stored |
| Online auth (register/upgrade/password) | ✅ | 🔴 | server required |
| Settings, theme, locale | ✅ | ✅ | persisted locally |
| Khmer / English switching | ✅ | ✅ | bundled UI strings |
| PWA install / standalone | ✅ | ✅ | unchanged |
| Cloud data / history / collaboration | ✅ | 🔴 | server required |