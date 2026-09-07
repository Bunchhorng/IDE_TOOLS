# Frontend — CodeRunner PWA

Mobile-first single-page app for CodeRunner. Write, save, compile, and run
**C / C++ / Python** in the browser with a Monaco editor, and install it as an
offline-capable PWA.

Source root: `compiler-pwa/frontend/`

## Stack

| Piece | Choice |
| --- | --- |
| Framework | React 19 |
| Language | TypeScript (~6.0), strict `tsc -b` build |
| Build tool | Vite 8 (+ `@vitejs/plugin-react`) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`, no config file, tokens in `src/index.css`) |
| Routing | React Router 7 (`BrowserRouter`) |
| Editor | Monaco via `@monaco-editor/react` |
| HTTP | Axios (single configured instance) |
| PWA | `vite-plugin-pwa` (Workbox `generateSW`, auto-update) |
| Lint | `oxlint` |

## Scripts

```bash
npm run dev       # Vite dev server on :5173, proxies /api -> http://nginx:80
npm run build     # tsc -b && vite build  (typecheck + production build)
npm run lint      # oxlint
npm run preview   # serve the built app locally
```

> The dev server is meant to run inside the compose network (`docker compose up
> frontend`). Its `/api` proxy targets `http://nginx:80`; outside Docker keep
> the browser on `http://localhost:80`.

## Structure

```
src/
  main.tsx               # mount + top-level providers
  App.tsx                # <AppRouter/>
  router/AppRouter.tsx   # all routes, protected/guest wrappers
  pages/                 # route-level screens
    Home/ Landing
    Login/ Register/     # guest-only
    Dashboard/           # project list + NewProjectModal
    Editor/              # the IDE
    History/             # past executions
    Settings/            # editor preferences
  components/
    Editor/              # EditorTopBar, EditorTabs, CodeEditor, StatusBar
    FileExplorer/        # FileExplorerSidebar
    Terminal/            # TerminalPanel (output + input + run stats)
    ui/                  # Button, Card, Modal, BottomSheet, Dropdown, Toggle…
    TopNav.tsx           # public/app nav with mobile slide-in drawer
    LanguageSelector/    # reusable language dropdown
  context/               # Auth, Theme, Preferences, Toast
  hooks/                 # useClickOutside, useLocalStorage, useOnline
  services/              # axios wrappers per resource
  lib/                   # cn, format, languages map, code templates
  types/                 # shared domain types
```

## Routing

| Route | Guard | Layout |
| --- | --- | --- |
| `/` | public | `TopNav` + Home |
| `/login`, `/register` | guest-only | standalone |
| `/dashboard` | auth | `TopNav` + `OfflineBanner` |
| `/history` | auth | `TopNav` + `OfflineBanner` |
| `/settings` | auth | `TopNav` + `OfflineBanner` |
| `/editor/:projectId` | auth | `OfflineBanner`, full-height IDE |
| `*` | — | redirect to `/` |

Guards live in `router/AppRouter.tsx`. While `AuthContext` is still loading,
both guards render `LoadingScreen`.

## State & contexts

- **`AuthContext`** — current user, token, `register/login/logout`, guest
  session provisioning. Token stored in `localStorage['auth_token']`.
- **`ThemeContext`** — toggles `.dark` on `<html>`; persists in localStorage.
- **`PreferencesContext`** — editor prefs persisted as `coderunner-prefs`:
  `fontSize, tabSize, wordWrap, minimap, fontLigatures, autoSave, defaultLanguage`.
- **`ToastContext`** — global toast stack. Positioning is mobile-aware so toasts
  clear the editor's bottom nav (see `ToastContext.tsx`).

Domain types (`src/types/index.ts`): `User`, `Project`, `File`, `Language`,
`Execution`, `ExecutionStatus`, request/response envelopes.

## API layer

`src/services/api.ts` exports a single Axios instance:

- baseURL = `VITE_API_URL || '/api'`
- request interceptor: attaches `Authorization: Bearer <token>` from localStorage.
- response interceptor: a `401` **on non-auth endpoints** means the session
  expired — it clears the token and reloads to re-provision a guest session.
  Auth endpoints (`/auth/login|register|guest|upgrade`) are **excluded**, so a
  failed login surfaces the error toast instead of a page reload.

Resource wrappers: `authService`, `projectService`, `fileService`,
`languageService`, `executionService`.

## The editor page

`pages/Editor/EditorPage.tsx` is the largest screen. Layout is a
desktop ↔ mobile split at the `lg` (1024px) breakpoint:

**Desktop (`lg`+)** — file explorer sidebar (collapsible) | editor column:
`EditorTabs` → Monaco → terminal panel → `StatusBar`.

**Mobile (`< lg`)** — bottom nav with **Code / Output / More** tabs and a run
**FAB**. The terminal panel renders directly **under the code editor** on the
Code tab, so output is visible without switching tabs. The Output tab is a
full-screen terminal, and More opens a bottom sheet.

### Key behavior (all in `EditorPage.tsx`)

- **Dirty tracking** — `dirty` compares live content/language against the last
  saved snapshot; save status shows in the top bar.
- **No silent data loss** — selecting another file or creating a file flushes a
  `{ silent: true }` save of the current file first.
- **Auto-save** — when the preference is on, saves debounce 1.5 s after typing.
- **Shortcuts** — `Ctrl/Cmd+S` save, `Ctrl/Cmd+Enter` run.
- **Run flow** — `POST /api/execute`, then poll `GET /api/executions/{id}` until
  a terminal status; the FAB/top-bar button shows a running spinner. On mobile,
  running keeps the user on the Code tab so the output below updates in place.
- **More sheet** — language selection, Save, dark/light toggle, Download file,
  Share file (Web Share API with clipboard fallback).
- **Share** — top bar (desktop) and More sheet (mobile); uses `navigator.share`
  when available, otherwise copies a shareable link and toasts.

### Top bar contents by breakpoint

| Control | `< lg` (phone/tablet) | `lg+` (desktop) |
| --- | --- | --- |
| Back to dashboard | yes | yes |
| Project name + save status | yes | yes |
| File explorer toggle | — | yes |
| Language selector | More sheet only | StatusBar |
| Save | More sheet only | top bar + `Ctrl+S` |
| Download | More sheet only | top bar |
| Share | More sheet only | top bar |
| Run | top bar | top bar |

### Editor (`components/Editor/CodeEditor.tsx`)

Monaco options from `PreferencesContext` (font size, tab size, word wrap,
ligatures). The minimap is forced off below `lg` to save phone width. Syntax
highlight follows the file's language (`python` / `c` / `cpp`).

## Styling

Tailwind v4 with class-based dark mode (`@custom-variant dark`). Semantic
runtime tokens are defined in `src/index.css`:

- Surfaces: `page`, `panel`, `raised`, `editor`
- Borders: `edge`, `edge-strong`
- Text: `ink`, `mute`, `faint`
- Accent: `primary`, `primary-hover`, plus `warning`, `success`, `info`, `error`

`src/lib/cn.ts` is the `clsx`/`tailwind-merge`-style class joiner used across
components. Base styles apply focus rings, tap-highlight removal, and custom
scrollbars.

## PWA

Configured in `vite.config.ts` via `VitePWA`:

- `registerType: 'autoUpdate'` — the service worker updates silently.
- Manifest with icons (`public/icons/*.png`), standalone display, `start_url: /`.
- Workbox precaches app shell assets (`**/*.{js,css,html,ico,png,svg,woff2}`)
  for offline access; live API calls still require a connection (surfaced by
  `OfflineBanner` / `useOnline`).

## Adding or changing a language (frontend)

Languages come from `GET /api/languages` at runtime; the UI renders whatever is
active. No frontend rebuild is needed to support a new backend language beyond
its icon mapping in `src/components/LanguageIcon.tsx` and the starter template
in `src/lib/templates.ts`.