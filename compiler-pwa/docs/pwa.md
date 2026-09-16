You are a senior frontend/PWA engineer.

I already have a fully working programming IDE website.

I DO NOT want you to rebuild my website.

I only want you to convert the existing website into a proper **installable PWA (Progressive Web App)** so students can install it on their:

* Android phone
* iPhone/iPad
* Windows
* macOS
* Linux

After installation, students should be able to launch the IDE from their device's:

* Home screen
* Desktop
* App launcher

The existing website must continue working exactly as it does now.

# VERY IMPORTANT

DO NOT:

* Rebuild the website.
* Redesign the entire UI.
* Replace the frontend framework.
* Replace the code editor.
* Change C execution.
* Change C++ execution.
* Change Python execution.
* Change backend APIs.
* Change database logic.
* Remove existing features.
* Add unnecessary dependencies.
* Break the existing website.

Only add the necessary PWA functionality.

# STEP 1 — INSPECT FIRST

Before making any changes, inspect the existing project.

Determine:

* Frontend framework
* Build tool
* package.json
* Existing public/assets directory
* Existing favicon
* Existing application name
* Existing routing
* Existing HTTPS/deployment setup
* Whether a manifest already exists
* Whether a service worker already exists
* Whether PWA support already exists

Search for:

* manifest.json
* manifest.webmanifest
* service-worker.js
* sw.js
* vite-plugin-pwa
* workbox
* navigator.serviceWorker
* registerSW

If PWA support already exists, improve it instead of creating another implementation.

# STEP 2 — ADD WEB APP MANIFEST

Create or update the PWA manifest.

Use the existing website's actual name and branding.

Include appropriate:

* name
* short_name
* description
* start_url
* scope
* display
* theme_color
* background_color
* icons

The application should launch in standalone mode when installed.

Use:

display: "standalone"

Do not invent a new application name if the website already has one.

# STEP 3 — APP ICONS

Inspect the existing website assets.

Reuse the existing logo/icon if available.

Provide appropriate PWA icons, especially:

* 192×192
* 512×512

Also configure appropriate Apple touch icons if needed.

Make sure the icons are actually accessible from the deployed website.

Do not use placeholder icons.

# STEP 4 — SERVICE WORKER

Add a service worker using the project's existing technology.

The service worker should make the website installable and provide appropriate caching for the application shell.

Cache static resources such as:

* HTML
* CSS
* JavaScript
* Images
* Fonts
* Other required static assets

DO NOT blindly cache dynamic API requests.

Especially DO NOT cache:

* Login responses
* Authentication data
* Student data
* Compiler responses
* Program execution results
* Dynamic API responses

unless there is a specific safe reason.

# STEP 5 — PRESERVE ONLINE FUNCTIONALITY

The IDE currently executes:

C
C++
Python

If execution requires a backend/server, keep that behavior unchanged.

When the student is online:

Website/PWA
↓
Existing API
↓
Existing backend
↓
Compiler/interpreter
↓
Result

Do not attempt to move compilation into the service worker.

Do not fake offline execution.

# STEP 6 — OFFLINE BEHAVIOR

When the student loses internet access:

The installed application should still be able to open its cached application shell where technically possible.

However, if code execution requires the backend, clearly show:

"You're offline. Code execution requires an internet connection."

Do not show a fake successful result.

The existing IDE should remain usable for editing code if its architecture supports it.

# STEP 7 — INSTALLATION

Make the website installable using the browser's normal PWA installation mechanism.

Students should be able to use:

Android Chrome:
"Add to Home screen" / "Install app"

iPhone/iPad Safari:
"Add to Home Screen"

Desktop browsers:
"Install" / "Install app"

Do not create a fake installation button that does not actually install the PWA.

If the browser supports a native install prompt, optionally provide a small:

"Install IDE"

button.

The button should only appear when installation is actually available.

# STEP 8 — INSTALL PROMPT

If the browser exposes:

beforeinstallprompt

handle it properly.

Show an unobtrusive install option such as:

┌─────────────────────────────────┐
│ Install IDE                     │
│ Install this IDE on your device│
│                                 │
│ [Install] [Not now]             │
└─────────────────────────────────┘

Requirements:

* Do not show it every time the student visits.
* Allow the student to dismiss it.
* Do not force installation.
* Do not interfere with normal IDE usage.
* Hide the install option after successful installation.

# STEP 9 — DETECT INSTALLED STATE

Detect when the application is already installed where supported.

For example:

display-mode: standalone

If already installed:

* Do not show the install prompt.
* Continue normally.

# STEP 10 — MOBILE EXPERIENCE

Do not redesign the existing IDE.

Only ensure the existing website remains usable when launched as a PWA.

Check:

* Header
* Editor
* File explorer
* Run button
* Stop button
* Input
* Output
* Scrolling
* Keyboard
* Touch interaction

Do not change the existing layout unless there is an actual PWA/mobile problem.

# STEP 11 — IOS SUPPORT

Make the existing website compatible with iOS/iPadOS home-screen installation as far as the platform supports.

Check:

* Apple touch icon
* viewport
* standalone behavior
* safe-area handling
* status-bar configuration

Do not claim that every PWA API behaves identically on iOS and Android.

# STEP 12 — HTTPS

Check the deployment.

PWA service workers generally require a secure context.

Verify that the production website uses:

HTTPS

If the site is already HTTPS, do not change the deployment unnecessarily.

Do not attempt to make production service-worker functionality depend on HTTP.

# STEP 13 — SERVICE WORKER UPDATE

Make sure future website updates can reach students.

When a new version of the website is deployed:

* Update the service worker/cache correctly.
* Do not leave students permanently stuck on an old version.
* Do not automatically reload while the student may have unsaved code.

If an update is available, an optional message can say:

"New version available. Refresh to update."

# STEP 14 — CACHE STRATEGY

Use a sensible caching strategy.

Static assets:
Cache appropriately.

Application shell:
Cache appropriately.

API:
Do not blindly cache.

Compiler/execution:
Do not cache execution results.

Authentication:
Do not cache sensitive responses.

The goal is:

**Installable + reliable + safe**

not:

**Cache everything.**

# STEP 15 — DO NOT BREAK THE IDE

After adding PWA support, verify that these still work:

* Login if present
* File explorer
* Create file
* Open file
* Edit file
* Save file
* C
* C++
* Python
* Run
* Stop
* Program input
* Program output
* Compilation errors
* Runtime errors
* API requests

# STEP 16 — TEST INSTALLATION

Test the production build.

Verify:

1. Website loads normally.
2. Manifest loads.
3. Icons load.
4. Service worker registers.
5. Service worker activates.
6. Browser recognizes the site as installable where supported.
7. Install works where supported.
8. Installed app opens correctly.
9. App icon appears correctly.
10. App opens in standalone mode.
11. Existing IDE functionality still works.
12. API requests still work.
13. C execution still works.
14. C++ execution still works.
15. Python execution still works.

# STEP 17 — TEST DIFFERENT DEVICES

If testing environments are available, test:

### Android

Chrome → Install/Add to Home Screen → Launch IDE

### iPhone/iPad

Safari → Add to Home Screen → Launch IDE

### Windows

Chrome/Edge → Install App → Launch IDE

### macOS

Supported browser → Install App → Launch IDE

Do not claim a platform was tested if an actual test environment was not available.

# STEP 18 — FINAL INSPECTION

Before finishing, inspect all changed files.

Make sure:

* No unnecessary files changed.
* No existing functionality was removed.
* No compiler logic was changed.
* No API logic was changed unnecessarily.
* No authentication data is cached.
* No unnecessary dependencies were installed.
* No duplicate manifest exists.
* No duplicate service worker exists.
* No debugging code remains.

# FINAL REPORT

At the end, report:

## PWA Added

* Manifest: PASS/FAIL
* Icons: PASS/FAIL
* Service Worker: PASS/FAIL
* Installability: PASS/FAIL
* Standalone mode: PASS/FAIL
* Offline shell: PASS/FAIL
* Install prompt: PASS/FAIL
* Update handling: PASS/FAIL

## Existing IDE

* C: PASS/FAIL
* C++: PASS/FAIL
* Python: PASS/FAIL
* Editor: PASS/FAIL
* Input: PASS/FAIL
* Output: PASS/FAIL
* Run: PASS/FAIL
* Stop: PASS/FAIL
* API: PASS/FAIL

## Files Changed

List every changed file and explain why.

## Testing

Tell me exactly what was actually tested.

## Remaining Issues

List anything that could not be tested or fixed.

IMPORTANT:

The main goal is simple:

**I already have a website. Make that existing website installable to students' home screens like an app, without breaking the existing IDE.**

Do not turn this task into a complete redesign or rewrite.
