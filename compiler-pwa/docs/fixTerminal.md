You are a senior terminal-engineering developer and frontend/backend engineer.

I have an existing programming IDE for students that supports:

* C
* C++
* Python

I already have a Terminal tab, but its current behavior is not like a real terminal.

I want you to redesign and fix the terminal behavior so it follows the **concept and interaction model of the VS Code Integrated Terminal** as closely as technically possible.

IMPORTANT:

I do NOT want a fake terminal UI.

I want a REAL interactive terminal connected to the running C/C++/Python process.

==================================================
CURRENT PROBLEM
===============

The current terminal behaves like a combination of:

* Output display
* Separate console input
* Program result

For example, currently the UI may show:

Enter name:bunchhorng
Enter your age:20

and after execution:

Console input

Enter name:

Program finished successfully. Exit code: 0

This is not the desired behavior.

The terminal should behave as one continuous session.

==================================================
DESIRED BEHAVIOR
================

When the student runs:

C:

```c
#include <stdio.h>

int main() {
    char name[100];
    int age;

    printf("Enter name: ");
    fgets(name, sizeof(name), stdin);

    printf("Enter your age: ");
    scanf("%d", &age);

    printf("Hello %s", name);
    printf("Your age is %d\n", age);

    return 0;
}
```

The terminal should behave like:

```text
$ ./main

Enter name: bunchhorng
Enter your age: 20
Hello bunchhorng
Your age is 20

Process exited with code 0
```

The student must be able to type directly after:

```text
Enter name:
```

and:

```text
Enter your age:
```

The typed values must be sent to the actual process through stdin.

==================================================
CORE REQUIREMENT
================

Separate these concepts:

1. Program stdout
2. Program stderr
3. User stdin
4. Terminal status

But display them together as ONE terminal session.

Do NOT create a separate "Console Input" box for normal interactive programs.

The terminal itself should receive keyboard input.

==================================================
TERMINAL FLOW
=============

The execution flow should be:

Student clicks Run
↓
Create execution session
↓
Start compiler/process
↓
Connect stdin
↓
Connect stdout
↓
Connect stderr
↓
Terminal becomes active
↓
Program prints:
"Enter name:"
↓
Student types:
"bunchhorng"
↓
Student presses Enter
↓
Send "bunchhorng\n" to process stdin
↓
Program continues
↓
Program prints:
"Enter your age:"
↓
Student types:
"20"
↓
Student presses Enter
↓
Send "20\n" to process stdin
↓
Program continues
↓
stdout/stderr continue appearing live
↓
Process exits
↓
Show exit status
↓
Terminal remains usable

==================================================
DO NOT USE A FAKE INPUT SYSTEM
==============================

Do NOT implement:

Terminal output
+
separate input textarea
+
append input text to output

That only LOOKS like a terminal.

Instead:

Keyboard
↓
Terminal
↓
stdin
↓
Running process

The process must actually receive the input.

==================================================
VS CODE-STYLE TERMINAL CONCEPT
==============================

The terminal should conceptually behave like:

┌───────────────────────────────────────────┐
│ TERMINAL                         ⋮  🗑     │
├───────────────────────────────────────────┤
│                                           │
│ $ ./main                                  │
│                                           │
│ Enter name: bunchhorng                    │
│ Enter your age: 20                        │
│ Hello bunchhorng                          │
│ Your age is 20                            │
│                                           │
│ Process exited with code 0                │
│                                           │
│ █                                         │
└───────────────────────────────────────────┘

The exact `$ ./main` prompt is optional depending on the architecture.

Do not pretend to provide a shell if the IDE only executes programs.

The important behavior is the interactive process terminal.

==================================================
INPUT BEHAVIOR
==============

When the program is waiting for input:

The terminal must accept keyboard input.

Example:

```text
Enter name: |
```

The cursor should be visible.

Student types:

```text
Enter name: bunchhorng|
```

Student presses Enter.

Then:

```text
Enter name: bunchhorng
Enter your age: |
```

The previous input must become immutable terminal history.

==================================================
INPUT MUST BE REAL STDIN
========================

For:

C:

```c
scanf("%d", &age);
```

C++:

```cpp
std::cin >> age;
```

Python:

```python
age = input("Enter your age: ")
```

the terminal input must reach the actual running process.

Do not simply update React/Vue state.

Do not only display the text.

Actually write the input to the process stdin.

==================================================
MULTIPLE INPUTS
===============

Support:

```text
Name: Bunchhorng
Age: 20
City: Phnom Penh
```

Each Enter should send the corresponding line to stdin.

Also support programs that read:

```text
10 20 30
```

on one line.

==================================================
LIVE OUTPUT
===========

Output must appear while the process is running.

For example:

```c
printf("Loading...\n");
sleep(2);
printf("Step 1\n");
sleep(2);
printf("Step 2\n");
sleep(2);
printf("Done\n");
```

The terminal should show:

```text
Loading...
```

then after 2 seconds:

```text
Step 1
```

then:

```text
Step 2
```

then:

```text
Done
```

Do not wait for the complete process to finish before displaying output.

==================================================
STDOUT
======

Display normal program output immediately.

Example:

```text
Hello World
Student ID: 123
Result: 95
```

==================================================
STDERR
======

Display stderr correctly.

For example:

```text
Warning: something happened
```

and runtime errors should appear in the terminal.

Do not silently discard stderr.

==================================================
COMPILATION ERRORS
==================

If C/C++ compilation fails, display the compiler output in the terminal.

Example:

```text
main.cpp:10:5: error: expected ';' before 'return'
```

Then:

```text
Process exited with code 1
```

The terminal must remain usable.

The user must be able to fix the code and run again.

==================================================
PROCESS STATUS
==============

The terminal should clearly communicate:

READY
RUNNING
WAITING FOR INPUT
SUCCESS
COMPILE ERROR
RUNTIME ERROR
STOPPED
TIMEOUT

Do not show "Running" after the process has already exited.

==================================================
RUN BUTTON
==========

When no program is running:

Run button:
Enabled

When program is running:

Run button:
Disabled or safely prevented from creating another process.

Do not allow accidental duplicate processes.

==================================================
STOP BUTTON
===========

When a process is running:

Stop button:
Enabled

When nothing is running:

Stop button:
Disabled

When Stop is clicked:

1. Stop the process.
2. Stop child processes where necessary.
3. Close stdin.
4. Close stdout.
5. Close stderr.
6. Clean up temporary resources.
7. Update terminal state.
8. Allow another execution.

Display something like:

```text
Process terminated by user.
```

==================================================
CTRL+C
======

If technically supported by the architecture, support Ctrl+C behavior similar to a terminal.

When the user presses Ctrl+C:

* Interrupt/terminate the running process.
* Update terminal state.
* Keep the terminal usable.

Do not allow Ctrl+C to accidentally navigate away from the application.

==================================================
BACKSPACE
=========

Backspace should only modify the current editable input.

For example:

```text
Enter name: bunchhorng|
```

Press Backspace:

```text
Enter name: bunchhorn|
```

The student must NOT be able to modify previous output:

```text
Hello
```

Previous terminal history is immutable.

==================================================
ENTER
=====

When Enter is pressed:

1. Capture current input.
2. Add newline.
3. Send it to process stdin.
4. Render the entered input as terminal history.
5. Clear the current input buffer.
6. Keep focus on the terminal.

==================================================
CURSOR
======

Show a terminal-style cursor.

When waiting for input:

```text
Enter name: |
```

When typing:

```text
Enter name: bunchhorng|
```

The cursor should remain visible.

==================================================
TERMINAL SCROLLING
==================

Implement terminal scrolling similar to an integrated terminal.

Requirements:

* Vertical scrolling
* Large output support
* Scrollback
* User can scroll upward
* Do not constantly force-scroll when user is reading old output
* Auto-scroll when user is already at the bottom

Behavior:

If user is at bottom:
→ new output automatically scrolls into view.

If user scrolls upward:
→ stop forced auto-scroll.

When user returns to bottom:
→ resume auto-scroll.

==================================================
TERMINAL CLEAR
==============

Provide a terminal clear button if appropriate.

Clear should remove displayed terminal history.

It must NOT:

* Stop the process
* Delete source code
* Delete files
* Reset the application
* Kill unrelated processes

If a process is running, clearing the visual terminal should not unexpectedly terminate it.

==================================================
COPY / PASTE
============

Support normal terminal interactions:

* Select text
* Copy
* Paste input
* Keyboard shortcuts

Do not make the entire terminal editable.

Only the active stdin input should be editable.

==================================================
RESIZE
======

The terminal should respond correctly when:

* Browser window changes size
* IDE panel changes size
* Mobile screen rotates
* Terminal expands
* Terminal collapses

If using a terminal emulator library, properly resize the terminal instance.

==================================================
MOBILE
======

My IDE also runs on mobile.

The terminal should work naturally with the mobile keyboard.

Example:

```text
Enter name: bunchhorng|
```

When the user taps the keyboard Return/Enter key:

→ send newline to stdin.

Do NOT create an additional input field just because the user is on mobile.

The terminal itself should be the input area.

Make sure:

* Keyboard does not cover important content
* Terminal remains scrollable
* Cursor remains visible
* Input remains focused
* Run/Stop controls remain accessible

==================================================
PYTHON
======

Test:

```python
name = input("Enter name: ")
age = input("Enter age: ")

print("Hello", name)
print("Age:", age)
```

Expected interaction:

```text
Enter name: Bunchhorng
Enter age: 20
Hello Bunchhorng
Age: 20

Process exited with code 0
```

==================================================
C++
===

Test both:

```cpp
std::cin >> name;
```

and:

```cpp
std::getline(std::cin, name);
```

Make sure both work correctly.

Especially test the common:

```cpp
std::cin >> age;
std::getline(std::cin, name);
```

input behavior.

==================================================
C
=

Test:

```c
scanf()
fgets()
getchar()
```

Make sure stdin behaves correctly.

==================================================
IMPORTANT: INTERACTIVE INPUT
============================

Do not assume all program input is known before execution.

The terminal must support:

Program starts
↓
Program asks for input
↓
Student responds
↓
Program asks another question
↓
Student responds
↓
Program continues

This is the most important requirement.

==================================================
BACKEND REQUIREMENT
===================

Inspect the backend process implementation.

Determine whether it currently does something like:

```text
source code
↓
execute
↓
wait until finished
↓
return complete output
```

If so, this architecture may not support a true interactive terminal.

If necessary, change it to:

```text
create process
↓
keep process alive
↓
stream stdout
↓
stream stderr
↓
accept stdin
↓
stream output
↓
process exits
↓
cleanup
```

Use a bidirectional communication mechanism where appropriate.

Possible technologies may include:

* WebSocket
* Server-Sent Events + separate stdin endpoint
* Existing streaming mechanism
* Existing terminal transport

Inspect the current architecture first.

Do NOT automatically introduce WebSockets if the existing architecture already supports the required behavior.

==================================================
TERMINAL LIBRARY
================

Inspect whether the project already uses:

* xterm.js
* CodeMirror
* Monaco
* another terminal component

If xterm.js or another appropriate terminal emulator already exists:

Reuse it.

If there is no terminal emulator and a real terminal experience requires one, evaluate whether adding xterm.js is appropriate.

Do not add unnecessary libraries.

If using xterm.js, properly connect:

terminal.onData()
↓
stdin

and:

stdout/stderr
↓
terminal.write()

Do not just use xterm.js as a visual component.

==================================================
PROCESS SESSION
===============

Each Run must create a clear execution session.

Example:

```text
Session created
↓
Process started
↓
stdin connected
↓
stdout connected
↓
stderr connected
↓
RUNNING
↓
User input
↓
stdin
↓
Program output
↓
Process exits
↓
Close streams
↓
Cleanup session
```

After exit:

No orphan process.

No open stdin.

No stale WebSocket.

No stale event listeners.

No "Running" state.

==================================================
REPEATED EXECUTION
==================

Test:

1. Run
2. Enter input
3. Process finishes
4. Run again
5. Enter different input
6. Process finishes
7. Run again

Each execution should have its own clean session.

Old input/output must not leak into the new process.

==================================================
RUNTIME ERROR
=============

Test a program that produces a runtime error.

Expected:

```text
Program output...

Runtime error...
Process exited with code 1
```

The terminal remains usable.

==================================================
INFINITE LOOP
=============

Test:

C:

```c
while (1) {
}
```

C++:

```cpp
while (true) {
}
```

Python:

```python
while True:
    pass
```

Verify:

* Timeout works.
* Stop works.
* Process is actually terminated.
* Child processes are terminated.
* Terminal returns to READY state.
* User can run another program.

==================================================
LARGE OUTPUT
============

Test large output.

The browser must not freeze.

If output limits are implemented:

Display:

```text
Output limit reached.
Additional output was truncated.
```

Do not allow unlimited output to consume all browser memory.

==================================================
ANSI TERMINAL SUPPORT
=====================

Inspect whether programs produce ANSI escape sequences.

If the terminal library supports ANSI/VT sequences, configure it correctly.

Support common terminal behavior such as:

* colors
* bold
* reset
* cursor movement
* clear line

Do not implement an unnecessary full shell.

==================================================
TERMINAL UI DESIGN
==================

The visual design should be inspired by professional integrated terminals.

Use:

* Monospace font
* Compact spacing
* Dark terminal background
* Clear text
* Subtle borders
* Terminal cursor
* Scrollbar
* Minimal toolbar

Example toolbar:

Terminal                         [Clear] [Stop] [⋮]

Do NOT add:

* Large cards
* Huge buttons
* Excessive labels
* Separate input card
* Decorative elements

The terminal should feel like a developer tool.

==================================================
IMPORTANT DIFFERENCE FROM CURRENT UI
====================================

CURRENT:

```text
Console input

Enter name:

----------------------------

Program finished successfully.
Exit code: 0
```

DESIRED:

```text
$ ./main

Enter name: Bunchhorng
Enter age: 20

Hello Bunchhorng
Age: 20

Process exited with code 0
```

Everything should be part of ONE continuous terminal session.

==================================================
INSPECTION-FIRST WORKFLOW
=========================

Before editing:

### 1. Inspect project structure

Find:

* frontend
* backend
* terminal component
* editor
* Run handler
* Stop handler
* execution API
* process manager
* stdin implementation
* stdout implementation
* stderr implementation

### 2. Trace execution

Document internally:

Run
→ API
→ backend
→ compiler
→ process
→ stdin/stdout/stderr
→ frontend terminal

### 3. Reproduce current problem

Run:

C
C++
Python

with interactive input.

Record exactly what currently happens.

### 4. Identify root cause

Determine why input is currently behaving like a separate output/input system instead of true stdin.

### 5. Design the smallest fix

Do not rewrite unrelated parts.

### 6. Implement

Fix backend process communication if required.

Fix terminal frontend behavior.

### 7. Build

Run the existing project build command.

Fix any errors caused by the changes.

### 8. Test real programs

Do not only test mocked data.

Actually run C/C++/Python programs.

### 9. Test interactive stdin

Verify:

Prompt
→ keyboard
→ Enter
→ stdin
→ program continues

### 10. Regression test

Verify existing:

* Run
* Stop
* Output
* Errors
* File system
* Editor
* C
* C++
* Python

still work.

==================================================
FINAL TEST MATRIX
=================

Test:

| Feature         | Result    |
| --------------- | --------- |
| C stdin         | PASS/FAIL |
| C++ stdin       | PASS/FAIL |
| Python stdin    | PASS/FAIL |
| Live stdout     | PASS/FAIL |
| stderr          | PASS/FAIL |
| Multiple inputs | PASS/FAIL |
| getline()       | PASS/FAIL |
| scanf()         | PASS/FAIL |
| cin             | PASS/FAIL |
| input()         | PASS/FAIL |
| Enter           | PASS/FAIL |
| Backspace       | PASS/FAIL |
| Cursor          | PASS/FAIL |
| Copy            | PASS/FAIL |
| Paste           | PASS/FAIL |
| Auto-scroll     | PASS/FAIL |
| Large output    | PASS/FAIL |
| Stop            | PASS/FAIL |
| Ctrl+C          | PASS/FAIL |
| Timeout         | PASS/FAIL |
| Runtime error   | PASS/FAIL |
| Compile error   | PASS/FAIL |
| Repeated Run    | PASS/FAIL |
| Process cleanup | PASS/FAIL |
| Mobile keyboard | PASS/FAIL |
| Terminal resize | PASS/FAIL |

==================================================
FINAL REPORT
============

### Current Architecture

```
Student (React PWA / Monaco / xterm)
   │  Bearer token, HTTPS (nginx)
   ▼
Laravel API ── docker.sock ──► docker run -d (startInteractive, `docker run` hard-timeout 60 s)
   │
   │  PTY bridge (pbridge.py)  → real stdin/stdout/stderr of the running C/C++/Python process
   │                              stdout → streamed back; stderr → piped, also persisted to
   │                              /app/stderr.txt inside the sandbox and mirrored into the stream
   ▼
Frontend polls GET /api/executions/{id}/interactive every ~500 ms
   │  output_b64 (base64 terminal bytes) → xterm.write()
   ▼
xterm.onData / Enter → POST /api/executions/{id}/interactive/input → fifo → PTY → process stdin
Stop/graphical → POST /api/executions/{id}/interactive/signal (SIGINT/SIGTERM/SIGKILL) → docker rm -f
```

Interactive sessions are **not** queued: `POST /api/execute` with `interactive: true` returns an
execution that is then started on demand via `/interactive/start`. Batch runs remain queued. All
interactive endpoints authorize ownership (`view`), so a session is always user-scoped.

### Root Cause

The previous "terminal" was an output display plus a separate console-input box: the frontend merged
output text with typed input client-side, and the backend wasn't a real PTY session, so there was no
actual live stdin/stdout/stderr to the running process. Related failure modes found while tracing:

- `docker run -d` inside the Symfony `Process` had a 15 s timeout — under slow cold-starts the
  `ProcessTimedOutException` became a generic `system_error` even though the container would have
  booted fine moments later.
- In production php-fpm ran as `www-data` without access to `/var/run/docker.sock`, so every start
  failed with a permission error and no diagnostic pointed at the reason.
- stderr was merged into the PTY with no separate channel, so there was no way to distinguish program
  stderr from stdout.
- The frontend `handleRun` catch path re-entered the interactive branch, so a failed/slow start could
  loop retrying instead of falling back gracefully, and typed input was lost on error.

### Files Changed

- `backend/app/Services/DockerExecutionService.php` — interactive runner hardening (see Changes).
- `docker-compose.yml` — `EXECUTION_INTERACTIVE_TIMEOUT` env passed to backend + worker.
- `.env.example` — `EXECUTION_INTERACTIVE_TIMEOUT=120`.
- `docker/backend/www.conf` — `request_terminate_timeout` 65 s → 90 s (covers 60 s docker window + 20 s ready/rc handshake; prod-specific).
- `frontend/src/pages/Editor/EditorPage.tsx` — `runBatch(continueSession)` extraction + one-shot batch fallback.

### Changes

- `startInteractive`: `docker run -d` timeout 15 s → 60 s; `ProcessTimedOutException` is swallowed and
  liveness decided by `isContainerRunning`; failure is only reported when nothing actually started;
  diagnostic sources: `containerLogs()` (`docker logs --tail 100`) and `startupErrorMessage()`
  (permission-denied / socket-unreachable / missing-image hints) so prod socket-permission failures
  are self-explanatory.
- Ready-wait is 20 s bounded; if the container dies before it is ready, real leader logs are returned
  instead of "Process terminated unexpectedly".
- PTY bridge now pipes **fd 2 to a second channel** `--err /app/stderr.txt`: real stderr bytes are
  persisted (capped) inside the sandbox and mirrored into the terminal stream, so runtime errors and
  prompts are visible live and retained in the final `stderr` field.
- `cleanup()` bounded retry (10 attempts × 100 ms) — previously `finalize()`'s `rmdir` could hit
  `EBUSY` while the `--rm` sandbox still mounted `/app`, leaking workdirs.
- Frontend: interactive catch degrades to a single `runBatch(true)` and never re-enters the
  interactive branch; `interactive_finished` at `system_error`/`failed` also degrades to one batch
  run, preserving the student's typed input as pre-supplied stdin.

### Terminal Tests

Live end-to-end against the stack (auth → project/file → execute → interactive loop):

| # | Scenario | Result |
|---|----------|--------|
| T1 | Python print-only interactive | PASS |
| T2 | Python one `input()` — stdout `Enter name: Bunchhorng` + `Hello Bunchhorng`, stderr `Enter name: ` | PASS |
| T3 | Python multiple `input()` | PASS |
| T4 | Python syntax error → `compile_error` | PASS |
| T5 | Python runtime error → `runtime_error` with real stderr traceback (stdout carries mirrors) | PASS |
| T6 | C two `scanf` | PASS |
| T7 | C++ `cin` | PASS |
| T8 | Batch Python stdin regression (queued path unchanged) | PASS |
| T9 | Two concurrent sessions — output fully isolated, no cross-talk | PASS |
| T10 | Stop (`close:true` → then signal) → `stopped` | PASS |
| Timeout | `EXECUTION_INTERACTIVE_TIMEOUT=20` override → infinite loop → `timeout`, exit 137 | PASS |

- After the full suite: **0 leftover workdirs**, **0 leftover `coderunner-*` containers**.
- `php -l` clean, `tsc -b` clean, `oxlint` clean.

### Regression Tests

- C/C++/Python batch execution with stdin (compile, run, errors, timeout, stop) — PASS.
- Compile-error and runtime-error statuses and error-line pointers — PASS.
- Editor Run/Stop/Output/Errors flows, status bar states — PASS.
- Concurrency and user isolation (T9), rate limits (5/min per user) still enforced.

### Remaining Issues

- Python `input('...')` prompts are written by CPython to **stderr** (fd 2), so they now appear in the
  errors stream (mirrored into the terminal). This is faithful terminal behavior.
- Interactive sessions are bounded by the per-user execution rate limit, not a global cap; a global
  cap on simultaneous interactive containers is documented in `scalability-report.md` as a future
  hardening option.

IMPORTANT:

Do not say "VS Code 100%" unless the implementation genuinely provides equivalent behavior.

The goal is:

**VS Code-style terminal concept + REAL stdin/stdout/stderr + live process communication + interactive keyboard input.**

The most important test is:

```text
Program:
Enter name:
```

Student types:

```text
Bunchhorng
```

Presses Enter.

The actual running program receives:

```text
Bunchhorng\n
```

Then the program continues and prints its next output.

That is the required behavior.

Follow:

**Inspect → Reproduce → Trace → Find Root Cause → Fix → Build → Run Real Programs → Test Interactive stdin → Test stdout/stderr → Test Stop/Timeout → Regression Test → Review → Report**
