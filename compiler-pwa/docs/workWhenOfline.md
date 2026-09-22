You are a senior PWA Engineer, Offline-First Architect, Frontend Engineer, Backend Engineer, and Developer Tools Engineer.

I am building a web-based Student Programming IDE.

Supported languages:
- C
- C++
- Python

The IDE currently works online.

I want you to transform it into a TRUE OFFLINE-FIRST PWA.

==================================================
MAIN REQUIREMENT
==================================================

When a student loses internet access, the IDE should continue working as much as technically possible.

The student should be able to open the installed application and continue working without internet.

The offline experience should feel as close as possible to the online experience.

IMPORTANT:

Do NOT create a fake offline mode.

Do NOT simply show cached pages.

The application must actually provide useful functionality while offline.

==================================================
1. INSPECT THE CURRENT APPLICATION FIRST
==================================================

Before changing anything, inspect the entire project.

Check:

- React/Vite architecture
- Routing
- Components
- State management
- API calls
- Authentication
- Code editor
- File management
- Terminal
- Compiler/execution architecture
- WebSocket/SSE
- IndexedDB/localStorage
- Service Worker
- PWA configuration
- Manifest
- Cache strategy
- Backend dependency
- Project storage
- User settings
- Language translation
- Online/offline detection

Understand exactly which features currently require the backend.

DO NOT modify the architecture blindly.

First create a short report:

ONLINE-ONLY FEATURES
OFFLINE-CAPABLE FEATURES
FEATURES THAT REQUIRE LOCAL IMPLEMENTATION

==================================================
2. TRUE OFFLINE-FIRST ARCHITECTURE
==================================================

Design the application using an offline-first architecture.

Concept:

                 ┌─────────────────────┐
                 │     Student IDE     │
                 └──────────┬──────────┘
                            │
                  ┌─────────▼─────────┐
                  │ Offline-first App │
                  └─────────┬─────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
          ONLINE MODE              OFFLINE MODE
                │                       │
          Backend/API              Local Storage
          Database                 IndexedDB
          WebSocket                Local Files
          Cloud                    Local Execution
                │                       │
                └───────────┬───────────┘
                            │
                       Same IDE UI

The user should not lose their work simply because the network disappears.

==================================================
3. PWA INSTALLATION
==================================================

Make the IDE a proper Progressive Web App.

Check:

- manifest.json / web app manifest
- Service Worker
- icons
- app name
- short name
- theme color
- display mode
- start URL
- scope
- screenshots if appropriate
- installability
- standalone mode

The student should be able to:

1. Open the IDE online.
2. Install it.
3. Disconnect internet.
4. Open the installed IDE.
5. Continue working.

Verify this on supported desktop and mobile browsers.

==================================================
4. SERVICE WORKER
==================================================

Implement a reliable Service Worker.

Cache the application shell:

- HTML
- JavaScript
- CSS
- fonts
- icons
- required editor assets
- required Monaco/editor assets
- translation files
- static configuration

The application shell must load without internet.

Avoid caching sensitive/private API responses incorrectly.

Do NOT cache authentication tokens or sensitive data as normal static assets.

==================================================
5. OFFLINE APP STARTUP
==================================================

When the user opens the IDE without internet:

The application should load normally.

Do NOT show:

"Network error"
"Failed to fetch"
"Cannot connect to server"

as the main application experience.

Instead show a small status indicator:

Offline

or:

Offline Mode

The student should still be able to enter the IDE.

==================================================
6. OFFLINE PROJECT MANAGEMENT
==================================================

Students must be able to work with projects while offline.

Implement local project storage using IndexedDB or another appropriate persistent browser storage mechanism.

Students should be able to:

- Create project
- Rename project
- Delete project
- Create folder
- Rename folder
- Delete folder
- Create file
- Rename file
- Delete file
- Open file
- Edit file
- Save file
- Duplicate file
- Search files
- Switch projects

Do NOT use localStorage for large source files if IndexedDB is more appropriate.

Use IndexedDB for structured/project data.

==================================================
7. OFFLINE CODE EDITOR
==================================================

The code editor must work completely offline.

Support:

- C syntax highlighting
- C++ syntax highlighting
- Python syntax highlighting
- autocomplete where locally available
- brackets
- indentation
- code formatting where locally available
- undo/redo
- search
- replace
- keyboard shortcuts
- tabs
- multiple files

Editor assets must be available from the installed PWA cache.

The editor must NOT attempt to download editor resources every time the user opens a file.

==================================================
8. OFFLINE SAVE
==================================================

When the student edits code offline:

Automatically persist changes locally.

For example:

Student types code
      ↓
Editor state
      ↓
IndexedDB
      ↓
Persisted locally

If the browser closes unexpectedly:

The project should still exist when the IDE is reopened.

Implement safe saving/debouncing.

Do not write to IndexedDB on every single keystroke if that creates unnecessary performance problems.

==================================================
9. OFFLINE C / C++ / PYTHON EXECUTION
==================================================

THIS IS THE MOST IMPORTANT PART.

The current online architecture may send code to the backend:

Frontend
   ↓
API
   ↓
Server
   ↓
Compiler
   ↓
Execution
   ↓
Result

That will NOT work offline.

For true offline execution, determine what local execution architecture is technically possible.

Possible technologies may include:

- WebAssembly
- WebAssembly-based compilers/interpreters
- WASI
- Pyodide
- Web Workers
- browser-based execution runtimes
- locally packaged language runtimes

Do NOT choose a technology blindly.

Inspect the current project and determine the best practical architecture.

==================================================
10. C OFFLINE EXECUTION
==================================================

The student should be able to compile/run C code offline if technically supported.

Test:

```c
#include <stdio.h>

int main() {
    printf("Hello World\n");
    return 0;
}



Also test:

variables
if/else
loops
functions
arrays
strings
structs
pointers
dynamic memory
multiple files if supported
stdin
stdout
stderr
compilation errors
runtime errors

If some C functionality cannot be supported in browser-based offline execution, clearly document it.

Do NOT pretend unsupported functionality works.

==================================================
11. C++ OFFLINE EXECUTION

Support offline C++ execution as far as technically possible.

Test:

variables
conditions
loops
functions
arrays
strings
vectors
classes
objects
inheritance
templates
STL
exceptions
file operations if supported
stdin
stdout
stderr
compilation errors
runtime errors

Also test different C++ standards if the chosen compiler supports them.

For example:

C++11
C++14
C++17
C++20

Only expose standards that actually work.

==================================================
12. PYTHON OFFLINE EXECUTION

Python must run locally if technically supported.

Test:

name = input("Enter name: ")
print("Hello", name)

Also test:

variables
conditions
loops
lists
tuples
sets
dictionaries
functions
classes
exceptions
modules
JSON
file operations if supported
Unicode
Khmer text
stdin
stdout
stderr

Also test:

long-running programs
infinite loops
memory usage

Use a Web Worker or appropriate isolation mechanism where possible so Python execution does not freeze the UI.

==================================================
13. IMPORTANT: BROWSER SECURITY

Do NOT execute arbitrary student code directly on the main browser UI thread.

The code execution system must not freeze the entire IDE.

Use an appropriate isolated execution mechanism such as:

Web Worker
+
WASM/WASI/runtime

where technically appropriate.

Student code must not be able to access:

application secrets
authentication tokens
other projects
other users' data
backend credentials
browser private data
application internals
==================================================
14. OFFLINE TERMINAL

The terminal must continue working offline as much as technically possible.

Students should be able to:

Run programs
Enter stdin
See stdout
See stderr
Stop execution
Clear terminal
Run again

Example:

Program:

name = input("Name: ")
age = input("Age: ")

print(name)
print(age)

Terminal:

Name: Bunchhorng
Age: 20

Bunchhorng
20

Do NOT fake terminal input.

stdin must be connected to the actual local execution runtime.

==================================================
15. OFFLINE FILE SYSTEM

Determine what file-system functionality is available in the browser.

If the application uses a virtual project filesystem:

Store it in IndexedDB.

Example:

MyProject/
├── main.c
├── utils.c
├── utils.h
└── README.md

The project should remain available offline.

If the browser supports File System Access API and it is appropriate, evaluate whether it should be supported.

Do not make the application depend on browser-specific APIs unless there is a safe fallback.

==================================================
16. ONLINE ↔ OFFLINE SYNCHRONIZATION

When the user is online:

         Local Project
              ↓
          Sync Queue
              ↓
            API
              ↓
          Server DB

When the user goes offline:

         Local Project
              ↓
          IndexedDB
              ↓
        Work Normally

When internet returns:

         IndexedDB
              ↓
         Sync Queue
              ↓
            API
              ↓
         Server DB

Implement reliable synchronization.

==================================================
17. OFFLINE SYNC QUEUE

When offline, store pending operations.

Examples:

CREATE_PROJECT
CREATE_FILE
UPDATE_FILE
DELETE_FILE
RENAME_FILE
UPDATE_SETTINGS

Each operation should have a unique ID.

Example:

{
id,
type,
projectId,
fileId,
payload,
createdAt,
status
}

When internet returns:

Process pending operations safely.

Do not duplicate operations.

==================================================
18. CONFLICT HANDLING

Handle the situation where:

Device A changes file
Device B/server changes same file
Device A reconnects

Do NOT silently overwrite data.

Detect conflicts.

Possible UI:

"File changed on another device."

Options:

Keep Local Version
Keep Server Version
Compare Versions
Merge

Use the simplest reliable conflict strategy appropriate for the existing application.

==================================================
19. NETWORK RECONNECTION

Detect:

ONLINE
OFFLINE
RECONNECTING
SYNCING
SYNCED
SYNC ERROR

Example UI:

● Online

● Offline

⟳ Syncing...

✓ Synced

⚠ Sync failed

Do not continuously spam the server while offline.

Use exponential backoff where appropriate.

==================================================
20. OFFLINE AUTHENTICATION

Inspect the current authentication system.

Determine how users should access the IDE offline.

If offline authentication is possible:

securely store only the minimum necessary local authentication information
never store plaintext passwords
never expose authentication tokens unnecessarily
protect local user data

Do not weaken authentication just to make offline mode work.

If certain account operations require the server, clearly indicate that.

For example:

Offline:
✓ Open existing projects
✓ Edit code
✓ Run code
✓ Save files

Online required:

Change password
Server-side account changes
Cloud synchronization
Remote collaboration
==================================================
21. OFFLINE UI

Create a clean offline indicator.

Do NOT use annoying popups every time the network changes.

Use a small status indicator.

Example:

[● Online]

or

[● Offline]

When synchronization is happening:

[↻ Syncing]

When synchronization finishes:

[✓ Synced]

==================================================
22. OFFLINE ERROR HANDLING

If an API request occurs while offline:

Do NOT simply show:

"Failed to fetch"

Instead handle it intelligently.

For example:

"You're offline. Your changes are saved locally and will sync when you're back online."

==================================================
23. OFFLINE SETTINGS

Settings that can work locally should remain available offline.

Examples:

Theme
Language
Editor font size
Editor settings
Terminal settings
Tab settings
Formatting settings

Persist them locally.

==================================================
24. KHMER + ENGLISH OFFLINE

The English and Khmer translation files must be available offline.

Language switching must work without internet.

Translate IDE UI only.

Do NOT translate:

Source code
Variable names
Function names
File names
Compiler output
Runtime output
User stdin
Programming keywords

Example:

UI:
"Run Program" → "ដំណើរការកម្មវិធី"

But:

print("Hello")

must remain unchanged.

==================================================
25. OFFLINE CACHE STRATEGY

Design proper caching.

Cache-first may be appropriate for:

Static assets
Editor assets
Icons
Fonts
Translation files

Network-first may be appropriate for:

Server data
User account information
Synchronization

Do NOT blindly use cache-first for private dynamic API responses.

==================================================
26. CACHE VERSIONING

Implement cache versioning.

When a new version of the IDE is deployed:

Old assets should not permanently remain active.

Handle:

Service Worker update
Cache migration
Old cache deletion
New asset installation

Avoid breaking the currently running application during updates.

==================================================
27. OFFLINE STORAGE LIMITS

Inspect browser storage limits.

Do not allow unlimited local project storage.

Handle:

Storage quota
Large projects
Large files
Large terminal output
Large execution logs

If storage is nearly full:

Show:

"Local storage is almost full."

Provide appropriate cleanup options.

Never silently delete student source code.

==================================================
28. PWA UPDATE BEHAVIOR

If the user has the IDE installed:

Version 1
↓
User works offline
↓
Version 2 released
↓
Internet returns
↓
PWA detects update
↓
Downloads new assets
↓
User is informed
↓
Update safely applied

Do not destroy local projects during updates.

==================================================
29. OFFLINE PERFORMANCE

The offline IDE should be fast.

Avoid:

Loading unnecessary assets
Huge JavaScript bundles
Loading all projects at startup
Rendering thousands of files
Repeated IndexedDB queries
Excessive React re-renders

Load data on demand.

==================================================
30. TEST OFFLINE MODE

Test these scenarios:

TEST 1
Open IDE online.

TEST 2
Install PWA.

TEST 3
Disconnect internet.

TEST 4
Close browser.

TEST 5
Open installed PWA again.

Expected:
IDE opens successfully.

TEST 6
Create project offline.

Expected:
Project is saved locally.

TEST 7
Create files offline.

Expected:
Files persist.

TEST 8
Edit files offline.

Expected:
Changes persist.

TEST 9
Refresh page offline.

Expected:
Changes remain.

TEST 10
Run Python offline.

Expected:
Program executes locally if supported.

TEST 11
Run C offline.

Expected:
Program executes locally if supported.

TEST 12
Run C++ offline.

Expected:
Program executes locally if supported.

TEST 13
Provide stdin offline.

Expected:
Actual program receives input.

TEST 14
Stop program offline.

Expected:
Execution stops.

TEST 15
Switch Khmer/English offline.

Expected:
Language changes.

TEST 16
Reconnect internet.

Expected:
Application detects connection.

TEST 17
Synchronize local changes.

Expected:
Changes sync correctly.

TEST 18
Create conflicting changes.

Expected:
Conflict is detected and handled.

==================================================
31. AIRPLANE MODE TEST

Perform a real airplane/offline test.

Procedure:

Open IDE online.
Install PWA.
Ensure required assets are cached.
Turn off network completely.
Restart browser.
Open installed IDE.
Create project.
Create C file.
Create C++ file.
Create Python file.
Edit files.
Save files.
Run programs using local execution.
Test stdin.
Test stdout.
Test stderr.
Stop programs.
Close browser.
Reopen IDE.
Verify all projects still exist.
Reconnect network.
Verify synchronization.
==================================================
32. MULTIPLE OFFLINE USERS

Consider a classroom situation.

100 students install the IDE.

The internet goes down.

All students should still be able to:

Open the IDE
Edit projects
Save files
Run locally supported programs
Use the terminal
Continue learning

The server should NOT be required for basic local programming functionality.

==================================================
33. IMPORTANT ARCHITECTURE LIMITATION

Do NOT claim:

"Everything works offline"

unless every feature has actually been tested offline.

Some features may inherently require a server.

Examples:

Cloud synchronization
Server-side account management
Teacher dashboards
Remote collaboration
Server-hosted execution
Cloud database
Notifications
Remote submissions

Clearly classify every feature:

🟢 FULLY OFFLINE
🟡 OFFLINE WITH LIMITATIONS
🔴 ONLINE REQUIRED

==================================================
34. DO NOT BREAK ONLINE MODE

After implementing offline support, online mode must continue working.

Verify:

ONLINE
↓
Cloud sync
↓
Server API
↓
Remote features

and:

OFFLINE
↓
Local storage
↓
Local execution
↓
Local project management

Both modes must work.

==================================================
35. SECURITY

Offline functionality must not create security vulnerabilities.

Pay special attention to:

IndexedDB data
authentication tokens
cached API responses
service worker cache
local project data
WebAssembly execution
Web Worker communication
cross-project access
malicious source code
local storage exposure

Never store plaintext passwords.

Never cache sensitive server responses without a clear security reason.

==================================================
36. DO NOT REWRITE EVERYTHING

Preserve the existing application where possible.

Do not replace the entire application just to add offline functionality.

Make incremental architectural improvements.

Preserve:

Existing UI
Existing editor
Existing projects
Existing online execution
Existing authentication
Existing API
Existing C/C++/Python functionality

unless changes are required for offline support.

==================================================
37. FINAL FEATURE MATRIX

At the end create a table:

Feature	Online	Offline	Notes
Open IDE	✓	✓
Create project	✓	✓
Edit files	✓	✓
Save files	✓	✓
C execution	✓	✓/Limited
C++ execution	✓	✓/Limited
Python execution	✓	✓/Limited
Terminal	✓	✓/Limited
stdin	✓	✓/Limited
stdout	✓	✓/Limited
stderr	✓	✓/Limited
Sync	✓	Queue
Authentication	✓	✓/Limited
Teacher features	✓	✓/Limited
Cloud data	✓	✗
Settings	✓	✓
Khmer/English	✓	✓
PWA	✓	✓

Fill this table based on REAL testing.

==================================================
38. FINAL REPORT

At the end report:

Current architecture
Offline architecture
Files changed
PWA changes
Service Worker changes
IndexedDB/local storage changes
Offline execution architecture
C offline support
C++ offline support
Python offline support
Terminal offline support
stdin implementation
Sync implementation
Conflict handling
Authentication behavior
Security considerations
Storage limits
Online/offline test results
Known limitations
Features that still require internet

IMPORTANT:

Do NOT fake offline functionality.

Do NOT simply cache the website and call it offline.

The final goal is:

                INTERNET
                   │
         ┌─────────┴─────────┐
         │                   │
      ONLINE              OFFLINE
         │                   │
    Backend/API        IndexedDB
    Cloud DB           Local Files
    Remote Run         Local Run
    Sync               Local State
         │                   │
         └─────────┬─────────┘
                   │
              SAME IDE UI

A student should be able to lose internet and continue programming locally without losing their work.

Inspect first.
Design the offline architecture.
Implement it.
Test it with real network disconnection.
Then report exactly what works and what does not.
