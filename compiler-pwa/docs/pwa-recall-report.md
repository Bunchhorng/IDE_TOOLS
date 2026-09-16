# Phase-26 — PWA Recall & Offline-Execution Honesty

Scope: the compiler-pwa **frontend already ships as a PWA** (manifest, service
worker, icons, install flow, offline shell — built in an earlier phase via
`vite-plugin-pwa`). **No rebuild, no redesign, no framework change.** This phase
re-verified the whole PWA stack end-to-end and closed exactly one genuine
behaviour gap that the Phase-25 spec names explicitly: the interaction between
**offline** and the **Run** button.

Nothing else was touched — no compiler logic, no backend API, no DB, no
language handling, no editor internals.

## What exists and was verified (PASS — nothing duplicated)

| Area | Verification |
|---|---|
| Manifest | plugin-generated each build; `name`/`short_name`/`description`/`start_url:/`/`scope:/`/`lang`; `display: standalone`; theme+background `#0b1120`; icons 192+512 + 512 `maskable` |
| Icons | real PNGs (`file`): 180, 192x192, 512x512 + `maskable`; `apple-touch-icon` wired; `index.html` `link rel="manifest"` + `includeAssets` icons glob |
| Service worker | `registerType: 'autoUpdate'`; `globPatterns` precaches shell only (15 entries, ~821 KiB); **no runtime caching API-wide** |
| **API excluded** | `grep -c '/api' sw.js` = **0**; no `runtimeCaching`/registerRoute for `/api`; **login/auth/students/execution results are never cached or faked** |
| Secure context | nginx serves TLS (443) + certs; SW/manifest only registered on HTTPS-or-localhost (protected by secure-context rule; no fake claim) |
| Standalone | `display: standalone` + native install; iOS `apple-mobile-web-app-capable` + standalone `matchMedia`; safe-area-inset-top on sticky nav + safe-area bottom bar on mobile editor; PWA hides after install |

## The Issue addressed (Phase-25 spec, "Do not fake offline")

Clicking **Run** while offline previously fired a doomed API request; the UI
caught the raw Chrome `Network Error` and rendered a generic "Couldn't run"
terminal message. Requirement: instead of a fake success **or** a vague network
error, the terminal must state plainly that execution requires a connection.

**Fix** (`frontend/src/pages/Editor/EditorPage.tsx`): a gate at the top of
`handleRun`, before any request is fired —

```
if (typeof navigator !== 'undefined' && !navigator.onLine) {
  setIsRunning(false);
  const msg = t('toast.offline_cant_run');
  setExecution({ ...status:'system_error', stderr: msg, … });
  toast.error(msg);
  return;
}
```

`navigator.onLine` is the same truth source the existing `OfflineBanner` and
`useOnline` hook rely on, so the message is perfectly consistent with the
banner the student already sees. No request is fired → no fake result can
appear. The message is delivered through the **existing** `system_error`
execution shape (already how the UI renders backend failures), so no new
rendering path, and — importantly — code/drafts editing keeps working offline
exactly as before (only Run/Stop are gated, since Stop maps to a pending Run).

New i18n key pair (en + Khmer): `toast.offline_cant_run`.

## Files Changed

```
frontend/src/pages/Editor/EditorPage.tsx   +30  (offline gate in handleRun)
frontend/src/i18n/translations.ts          +2   (toast.offline_cant_run en+km)
```

## Testing — actually run this phase

- `npx tsc -b` → exit 0 (no type errors)
- `npx oxlint src` → only pre-existing React-idiom warnings (setState-in-effect,
  ref-in-render); no new errors
- `npx vite build` → full production build (temp outDir, repo `dist` untouched);
  PWA plugin re-emitted `sw.js` + `workbox-*.js` + `manifest.webmanifest`;
  **15 precache entries, 0 references to `/api`** (grep-verified)
- Manifest/icon checks above (PASS)
- `git status` sweep: exactly the two intended files changed (+32, no leftover
  test artifacts, no `.phpunit.result.cache` regressions)

## Remaining (honest)

- Native **install prompt** behaviour on a real Android phone over LAN+self-signed
  TLS was not re-tested this phase (needs physical device + UI-review already
  covered it). Standalone + install flow are exercised via the same
  `beforeinstallprompt`/`standalone` tooling previously validated.
- iOS home-screen: `apple-mobile-web-app-capable`/theme/title present; the
  actual A2HS tap on a real iPhone was verified in the earlier UI-review phase,
  not re-run here.
- Offline **editing** works (shell is cached); **execution** honestly refuses —
  exactly the Phase-25 contract.
