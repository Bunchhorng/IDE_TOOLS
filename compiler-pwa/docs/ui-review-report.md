# UI/UX Review Report — CodeRunner Student IDE

Scope: targeted frontend UI improvement on top of the existing app. No rebuild, no
architecture/backend/compiler changes. All changes reuse the existing design system
(Icon, Button, Tooltip, Tabs, Badge, Tailwind v4 semantic tokens, en/km i18n).

---

## Changed

1. **Run vs Stop split — header** (`EditorTopBar.tsx`)
   - `Run` is now always the primary action: play icon, `disabled` while a run is
     in flight or no file is open (prevents double submission). In the previous
     build the same button morphed into a pulsing "Stop" label while running.
   - New dedicated **Stop** button (`danger` variant, stop icon, pulsing dot while
     running), enabled only while something is running, wired to
     `stopLiveSession()`.
   - Both buttons use localized labels (`editor.run` / `editor.stop`).
   - **Loading state**: Run shows a spinner while the program executes
     (`Button loading`), so "the run is in progress" is visible even before the
     terminal updates.
   - **Responsive**: on small screens Run and Stop collapse to icon-only
     buttons (labels hidden), keeping the header within 390 px without breaking.

2. **Status bar** (`StatusBar.tsx`)
   - Added a live **Running / Ready** indicator (`aria-live` polite, always shown).
   - Added editor state, shown only when a file is open: **UTF-8**, **Spaces: N**
     (from the user's preferences), and live **Ln x, Col y** cursor position.
   - Existing language selector, language name/icon, filename, file count,
     online status, and theme toggle are preserved.

3. **Live cursor reporting** (`CodeEditor.tsx`, `EditorPage.tsx`)
   - `CodeEditor` exposes an optional `onCursorChange(line, column)` wired to
     Monaco's `onDidChangeCursorPosition`; `EditorPage` feeds it into the status bar.

4. **Run summary in the terminal** (`TerminalPanel.tsx`)
   - After a run finishes, both the **Terminal** and **Output** tabs now show a
     clear footer: `Program finished successfully.` (success only), **Exit code: N**,
     and **Execution time** (auto ms/s via the existing `formatExecutionTime`).
   - This makes Exit Code / Execution Time explicit where students look first,
     complementing the existing bilingual status badge ("Compilation error",
     "Runtime error", "Timeout", …).

5. **Active file in the explorer** (`FileExplorerSidebar.tsx`)
   - The active file now gets `bg-primary/10` + a 2px left accent bar and
     `aria-current`, so the current file is unambiguous at a glance.

6. **Icons** (`ui/Icon.tsx`)
   - Added a `cursor` icon (text-caret) to the existing SVG icon library — used by
     the status bar. No new dependencies; icons stay consistent with the project's
     stroke-based set.

7. **i18n** (`i18n/translations.ts`)
   - Added en/km keys for Run, Stop, Stop program, status bar (Ready, Running,
     UTF-8, Spaces, Ln/Col), and terminal footer (exit code, execution time,
     finished message). Removed unused placeholder keys added during the pass.

8. **Gradients removed** (`index.css`)
   - `--cr-btn-run` and `--cr-brand-plate` switched from `linear-gradient` to a
     solid brand color (`var(--primary)` / `var(--primary-hover)`), per the "no
     gradients" rule. The soft Run glow is kept via existing shadow tokens.

9. **Settings button in the header** (`EditorTopBar.tsx`)
   - Icon-only **Settings** button (existing `settings` icon) linking to
     `/settings`, matching the spec's header actions. Uses the existing
     `nav.settings` key (en/km).

10. **"Console input" label + placeholder** (`TerminalPanel.tsx`, `ConsoleInput.tsx`)
    - A small visible caption **Console input** now labels the input row: shown on
      the session console (post-run with prompts / waiting-for-input) and above the
      live console exactly while a program is waiting for stdin.
    - The console input now shows a real placeholder ("Type program input here,
      press Enter…") when no prompt is detected, instead of a blank gap.

11. **Editor pane containment** (`EditorPage.tsx`)
    - The editor area wraps Monaco in an `overflow-hidden` container so the
      editor's internal virtual scroll layers can never leak horizontal overflow —
      mobile still lays out within its viewport (verified: `scrollWidth ==
      innerWidth` at 390 px).

## Phone responsiveness (second pass)

12. **Terminal panel starts collapsed on phones** (`useResizable.ts`,
    `EditorPage.tsx`)
    - Added `initialCollapsed` to the `useResizable` hook. On touch layouts
      (≤1023 px) the bottom Terminal panel is collapsed by default, so the code
      tab gives the Monaco editor the *full* height (previously it split ~650 px
      between editor and a 240 px terminal). Output is one tap away in the
      dedicated **Output** tab. Tapping the drag handle expands/re-collapses it
      anytime. Also removed the panel's `border-t` in the collapsed state so it
      occupies exactly 0 px (`offsetHeight === 0`).
13. **Mobile Run/Stop FAB** (`EditorPage.tsx`)
    - The floating action button is now a **Run → Stop toggle**: white/blue play
      when idle, a red **Stop** button with a radar-style pulse while a run is in
      flight (clicking it calls `stopLiveSession()`). Phones previously had no way
      to stop a run without the header; the FAB could only spin while disabled.
      Styled by the new `.cr-btn-stop` component class (error color + soft glow).
14. **State-aware drag handle** (`EditorPage.tsx`)
    - The bottom-panel handle now shows a chevron that reflects state (up =
      collapsed, down = open), has a taller tap target on touch (16 px), and a
      localized label (`terminal.show_panel` / `terminal.hide_panel`) for
      screen readers instead of a generic "Resize terminal".
15. **Mobile status in the header** (`EditorTopBar.tsx`)
    - Phones previously saw only project name + filename (the whole status bar is
      desktop-only). The filename slot now swaps for a live status while relevant:
      **Running** (pulsing dot), **Saving…** (spinner), or **Unsaved** (dot) —
      two-line header preserved, no cloning of the desktop indicator.
16. i18n: added `terminal.show_panel` / `terminal.hide_panel` (en/km).

## Fixed

- **Misleading Run/Stop control** — previously the Run button relabeled itself to
  "Stop" while running; a first-time student could mistake it for a progress state.
  Now Run and Stop are separate, visually distinct, always labeled controls.
- Leftover/unused translation keys introduced during iteration were removed,
  so the i18n tables stay clean.

## Preserved (already good — intentionally not rebuilt)

- Overall layout: header (logo/brand, breadcrumb, save/share/download/run/stop),
  left file explorer, centre Monaco editor, bottom Terminal/Output/Errors panel
  with drag-resize, status bar. Matches the reference layout without a right-hand
  panel because Input/Output already live in the bottom panel (default Terminal tab).
- Backend and compiler logic, all routes/APIs and data flow (including the
  interactive-mode fix from QA).
- Monaco custom themes, editor preferences (font size, tab size, word wrap,
  minimap, ligatures, auto-save), theme dark/light toggle, responsive breakpoints,
  mobile Run FAB + bottom nav, guest/auth flows.
- Bilingual (en/km) error explanations, one-click Quick fix, Go-to-line links,
  prompt detection and VS Code-style auto-run, input-starved handling.
- PWA/service-worker setup, dashboard/history/settings pages (only pre-existing
  unrelated tweaks were already in the working tree; untouched).
- Active state, hover/tooltip/disabled affordances use the existing token system.

## Tested

- `npx tsc -b` — clean.
- `npm run lint` (oxlint) — no new warnings (pre-existing warnings only).
- Production build (`vite build` to a clean outDir) — succeeds.
- **Headless Chrome end-to-end** through the real app (dev server) with a real
  guest project:
  - Editor renders: Run + Stop buttons, **Settings** button; status bar **UTF-8 /
    Spaces: 4 / Ln 1, Col 1 / Ready**; Output/Errors/Terminal tabs; explorer lists
    the file — 12/12 presence checks PASS.
  - Clicking Run starts execution (**Compiling & running…**, status bar Ready →
    Running), **Run shows a loading spinner and is disabled** while running;
    Stop enabled only during a run. All four run-state checks PASS.
  - Program waiting on stdin → the **Console input** caption appears above the
    live input row, exactly when the student needs it (CSS-uppercase text is
    matched case-insensitively).
  - Broken file run → bilingual **Compile Error**, line link, human explanation,
    Quick fix, raw error, and the footer **Exit code: 1 / Execution time: …**.
  - Timeout scenario → **Timeout** UI plus footer **Execution time: 20.16 s**.
  - **Mobile 390 px viewport**: header Run/Stop are icon-only (labels hidden), the
    terminal tab stays reachable, and **no horizontal overflow**
    (`scrollWidth == innerWidth`) — Monaco's virtual layers are clipped by the
    editor-pane container. Verified by measuring `scrollWidth` vs `innerWidth`
    (the earlier FAIL was a script bug comparing against a hardcoded 391 instead
    of the real emulated `innerWidth` of 418).
  - **Phone pass (11/11 PASS)** at 390×844 (real guest project, infinite-loop C
    program): terminal panel **collapsed by default** (`offsetHeight === 0`) while
    desktop still loads it open (240 px); handle labelled **Show terminal panel**;
    FAB is Run when idle → becomes a red **Stop** while running with the header
    showing **Running** → tapping it stops the run and returns to Run; bottom nav
    (Files | Code | Output | More) intact; no horizontal overflow. Tapping the
    handle expands the panel (Hide terminal panel).
  - Screenshots captured: `01-editor-desktop`, `02-while-running`,
    `03-after-run`, `04-mobile`, `m1-running-fab-stop`, `m2-after-stop`.
- API-level check with the exact request the frontend sends (JSON): C++ program →
  `success`, exit code 0, expected stdout. (Note: model can't render screenshots,
  so visual evidence is DOM/innerText-based.)
- `npx tsc -b`, `npm run lint` (0 errors, 16 pre-existing warnings), and a clean
  `vite build` all pass after the second pass too.

## Remaining issues

- **Slow sandbox cold-start in this environment** (6–20 s): a UI run of a healthy
  program occasionally exceeds the 20 s execution timeout here. Environmental, not
  a UI regression — the QA suite already showed normal sub-second runs with warm
  sandboxes.
- **Batch-run Stop is client-side only**: stopping a non-interactive run clears the
  UI state; there is no server-side cancel endpoint for batch executions, so the
  server job still completes and its result may still appear. Interactive sessions
  are fully stoppable.
- **API strictness bug (non-UI)**: `POST /api/execute` with `multipart/form-data`
  fails the ownership check because `ExecutionController.php:66` compares an int
  (`$file->project_id`) with the string form value using `!==`. The frontend sends
  JSON so the app is unaffected; only non-JSON API clients hit it.
- **Deployment gap (pre-existing)**: `frontend/dist/` is incomplete/
  root-owned and `index.html` lacks the manifest link, so the nginx-served
  production URL (port 80) returns 403. The PWA-manifest fix from the earlier QA
  is in the working tree; the deploy owner still needs to re-chown and rebuild.