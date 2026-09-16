You are a senior software engineer, QA engineer, debugging specialist, and code-review expert.

Your task is to perform a COMPLETE BUG, LOGIC, FUNCTIONALITY, SECURITY, PERFORMANCE, AND UI AUDIT of my existing programming IDE.

This IDE is designed for students to write and run:

* C
* C++
* Python

Your job is NOT just to inspect the code.

You must:

1. Inspect the existing project.
2. Find bugs.
3. Find logic errors.
4. Find edge cases.
5. Find incorrect behavior.
6. Find broken functionality.
7. Find UI/UX problems.
8. Find compiler/interpreter execution problems.
9. Find input/output problems.
10. Find process-management problems.
11. Find security problems.
12. Find performance problems.
13. Fix the problems you find.
14. Test the fixes.
15. Check for regressions.
16. Report exactly what was changed.

# IMPORTANT RULES

1. DO NOT rebuild the project from scratch.
2. DO NOT rewrite working code unnecessarily.
3. DO NOT change the project architecture unless there is a strong technical reason.
4. DO NOT remove existing features.
5. DO NOT change existing APIs unless required to fix a bug.
6. DO NOT change compiler/execution behavior unnecessarily.
7. DO NOT replace existing libraries without a clear reason.
8. DO NOT install unnecessary dependencies.
9. Preserve existing functionality.
10. First inspect, then analyze, then plan, then modify.
11. Make small, controlled changes.
12. Test every important change.
13. Never claim that something works without testing it.
14. Do not hide errors.
15. Do not silently ignore failed tests.
16. Do not modify unrelated files.
17. Do not use gradients in the UI.
18. Keep the IDE simple and suitable for students.

# PHASE 1 — PROJECT DISCOVERY

Before changing anything, inspect the project structure.

Identify:

* Frontend
* Backend
* API
* Database if present
* Code execution service
* Compiler service
* Python execution service
* Terminal/process management
* File management
* Editor
* Input system
* Output system
* Error handling
* UI components
* State management
* Configuration
* Environment variables
* Docker configuration if present
* Build configuration
* Testing configuration

Determine the technology stack.

For example:

* React
* Vue
* Node.js
* Laravel
* Python
* Express
* Vite
* Monaco Editor
* CodeMirror
* Docker
* GCC
* G++
* Python

Do not assume the stack.

Inspect the actual project.

# PHASE 2 — TRACE THE APPLICATION

Trace the complete flow.

For example:

User
↓
IDE UI
↓
Editor
↓
Run button
↓
Frontend state
↓
API request
↓
Backend
↓
Compiler / Interpreter
↓
Process
↓
stdin
↓
stdout / stderr
↓
Backend response
↓
Frontend
↓
Output panel

Understand the actual implementation before modifying it.

Identify where failures can occur.

# PHASE 3 — CODE REVIEW

Inspect the important source files for:

* Syntax errors
* Type errors
* Runtime errors
* Incorrect imports
* Undefined variables
* Incorrect state updates
* Incorrect conditions
* Incorrect loops
* Incorrect async/await
* Missing error handling
* Race conditions
* Memory leaks
* Event listener leaks
* Incorrect cleanup
* Stale state
* Incorrect API responses
* Incorrect HTTP status handling
* Incorrect JSON handling
* Null/undefined problems
* Incorrect default values
* Incorrect error states
* Incorrect loading states

Pay special attention to code involving:

* Run
* Stop
* Compile
* Execute
* Input
* Output
* File management
* Language selection
* Editor state
* Process management

# PHASE 4 — LOGIC AUDIT

Check all important application logic.

Look for:

* Conditions that can never be true
* Conditions that can never be false
* Incorrect if/else logic
* Incorrect state transitions
* Incorrect loading state
* Run button enabled when it should be disabled
* Stop button enabled when nothing is running
* Program remains "running" after completion
* Output from an old execution appearing in a new execution
* Old errors remaining after a successful run
* Incorrect language selected
* Wrong compiler used
* Wrong file extension
* Incorrect filename
* Incorrect working directory
* Incorrect exit code
* Incorrect timeout handling

Check state transitions:

IDLE
→ RUNNING
→ SUCCESS

IDLE
→ RUNNING
→ COMPILE ERROR

IDLE
→ RUNNING
→ RUNTIME ERROR

IDLE
→ RUNNING
→ TIMEOUT

IDLE
→ RUNNING
→ STOPPED

Make sure every state is handled correctly.

# PHASE 5 — C TESTING

Test C execution using GCC.

Verify:

* Compilation
* Execution
* stdin
* stdout
* stderr
* exit code
* compilation errors
* runtime errors
* warnings
* timeout
* stop process

Test:

### Basic

Hello World

### Input

scanf()
fgets()
getchar()

### Logic

if
if-else
switch
loops

### Data

arrays
strings
struct
pointers

### Functions

normal functions
parameters
return values
recursion

### Files

fopen()
fread()
fwrite()
fprintf()
fscanf()
fclose()

Check that file access behaves correctly within the IDE's execution environment.

# PHASE 6 — C++ TESTING

Test C++ execution using G++.

Verify:

* Compilation
* Execution
* stdin
* stdout
* stderr
* exit code
* compilation errors
* runtime errors
* warnings
* timeout
* process termination

Test:

* Variables
* Conditions
* Loops
* Functions
* Arrays
* Strings
* Classes
* Objects
* Constructors
* Inheritance
* Pointers
* References
* STL vector
* map
* set
* recursion
* file handling

Also test modern C++ syntax supported by the existing compiler configuration.

# PHASE 7 — PYTHON TESTING

Test Python execution.

Verify:

* Python version
* Script execution
* stdin
* stdout
* stderr
* exit code
* syntax errors
* runtime errors
* exceptions
* timeout
* process termination

Test:

* Variables
* Input
* Conditions
* Loops
* Functions
* Lists
* Tuples
* Sets
* Dictionaries
* Classes
* Exceptions
* File handling
* JSON
* Recursion

# PHASE 8 — INPUT/OUTPUT AUDIT

This is extremely important.

Test:

### Input

Single value:

10

Multiple values:

10 20 30

Multiple lines:

10
20
30

String:

Bunchhorng

String with spaces:

Bunchhorng Student

Empty input.

Very large input.

Special characters.

Unicode.

Khmer text.

### Output

Check:

* stdout
* stderr
* newlines
* spaces
* tabs
* Unicode
* large output
* empty output

Make sure stdout and stderr are not accidentally mixed unless the application intentionally does so.

# PHASE 9 — COMPILER ERROR TESTING

Create intentionally broken programs.

C:

```c
#include <stdio.h>

int main() {
    printf("Hello")
    return 0;
}
```

C++:

```cpp
#include <iostream>

int main() {
    std::cout << "Hello"
    return 0;
}
```

Python:

```python
if True
    print("Hello")
```

Verify:

* Compilation/interpreter error is captured.
* Error is displayed.
* Application does not crash.
* Application does not freeze.
* Run state returns to a usable state.
* Previous output is handled correctly.

# PHASE 10 — RUNTIME ERROR TESTING

Test:

* Division by zero
* Invalid memory access where applicable
* Invalid input
* Missing file
* Invalid file path
* Exceptions
* Null values
* Out-of-range access

The IDE must display the runtime error instead of crashing itself.

# PHASE 11 — INFINITE LOOP TESTING

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
* Stop button works.
* Process is actually terminated.
* CPU is released.
* No zombie process remains.
* IDE remains responsive.
* User can run another program afterward.

# PHASE 12 — MULTIPLE EXECUTION TESTING

Test:

1. Run program.
2. Immediately click Run again.
3. Stop program.
4. Run again.
5. Change language.
6. Run again.
7. Change file while running.
8. Run different file.
9. Run after an error.
10. Run after timeout.

Check for:

* Duplicate processes
* Duplicate output
* Race conditions
* Incorrect state
* Stale results
* Wrong language
* Wrong source file
* UI freezing

# PHASE 13 — FILE MANAGEMENT AUDIT

Test:

* Create file
* Open file
* Edit file
* Save file
* Rename file
* Delete file
* Switch files
* Empty file
* Large file
* Duplicate filename
* Unsupported extension
* Missing file

Check whether editor state and execution state remain synchronized.

# PHASE 14 — API AUDIT

Inspect every API used by the IDE.

Check:

* HTTP method
* URL
* Request body
* Headers
* Authentication if applicable
* Response format
* Status codes
* Error responses
* Timeout
* Network failure
* Server unavailable
* Invalid response

Test:

* 200
* 400
* 401
* 403
* 404
* 422
* 429
* 500
* timeout
* connection failure

The frontend should handle failures gracefully.

# PHASE 15 — SECURITY AUDIT

Because this IDE executes user code, treat the execution system as untrusted.

Check whether submitted code can:

* Consume unlimited CPU
* Consume unlimited memory
* Produce unlimited output
* Run forever
* Access unintended files
* Access environment secrets
* Access sensitive configuration
* Escape the intended execution directory
* Execute dangerous system commands
* Spawn unlimited child processes

Check:

* Timeout
* Memory limits
* Output limits
* Process limits
* Isolation
* Permission restrictions
* Temporary directory handling
* Cleanup

Do not execute destructive commands during testing.

# PHASE 16 — RESOURCE CLEANUP

Check whether processes and temporary resources are cleaned up.

After every execution verify:

* Process terminated
* Child processes terminated
* Temporary files cleaned
* Ports released if used
* Memory released
* Event listeners cleaned
* Timers cleared
* No zombie processes

Run the IDE repeatedly to detect resource leaks.

# PHASE 17 — FRONTEND STATE AUDIT

Check React/Vue/etc. state management.

Look for:

* State updates during render
* Infinite render loops
* Incorrect dependency arrays
* Stale state
* Incorrect async state
* State not reset
* State reset too early
* Race conditions
* Unnecessary re-renders
* Memory leaks

Check:

* editor state
* language state
* input state
* output state
* error state
* loading state
* running state
* selected file state

# PHASE 18 — UI/UX BUG AUDIT

Check:

* Broken layouts
* Overflow
* Incorrect scrolling
* Hidden buttons
* Incorrect disabled states
* Incorrect loading indicators
* Missing error messages
* Missing empty states
* Incorrect colors
* Poor contrast
* Inconsistent spacing
* Broken responsive layout
* Incorrect icons
* Text clipping

The UI should clearly communicate:

READY
RUNNING
SUCCESS
ERROR
STOPPED
TIMEOUT

Do not use gradients.

# PHASE 19 — PERFORMANCE AUDIT

Look for:

* Slow rendering
* Excessive API requests
* Unnecessary re-renders
* Large output causing browser slowdown
* Large input causing browser slowdown
* Large files causing editor slowdown
* Memory leaks
* Processes that remain alive

Test with:

* Small program
* Medium program
* Large program
* Large input
* Large output
* Repeated execution

# PHASE 20 — EDGE CASES

Test unusual but realistic cases.

Examples:

* Empty source code
* Empty input
* File with only whitespace
* Very long line
* Very large file
* Unicode filename
* Spaces in filename
* Multiple dots in filename
* Invalid extension
* Missing compiler
* Missing Python
* Compiler unavailable
* Backend unavailable
* Network disconnected
* User clicks Run repeatedly
* User clicks Stop repeatedly
* Stop when nothing is running
* Run after Stop
* Run after compilation error
* Run after runtime error
* Run after timeout

# PHASE 21 — FIXING STRATEGY

When you find a bug:

1. Reproduce it.
2. Identify the root cause.
3. Identify the affected files.
4. Determine the smallest safe fix.
5. Implement the fix.
6. Build the project.
7. Reproduce the original test.
8. Confirm the bug is fixed.
9. Run related regression tests.

Do not fix only the visible symptom if the underlying logic is incorrect.

Prefer root-cause fixes.

# PHASE 22 — REGRESSION TESTING

After all fixes, repeat the important functionality.

At minimum test:

C:

* Compile
* Run
* Input
* Output
* Compile error
* Runtime error
* Stop
* Timeout

C++:

* Compile
* Run
* Input
* Output
* Compile error
* Runtime error
* Stop
* Timeout

Python:

* Run
* Input
* Output
* Syntax error
* Runtime error
* Stop
* Timeout

Also test:

* File switching
* Language switching
* UI state
* API failures
* Repeated execution

# PHASE 23 — DO NOT STOP AT THE FIRST BUG

Finding one bug does NOT mean the audit is complete.

Continue inspecting the rest of the application.

Look for related bugs caused by the same underlying issue.

For example:

If Run/Stop state is incorrect, inspect:

* frontend state
* API request
* backend process
* process cleanup
* timeout
* output handling
* error handling

Fix the complete flow where necessary.

# PHASE 24 — FINAL CODE REVIEW

After all fixes:

Review the changed code again.

Check for:

* New bugs
* Unused imports
* Dead code
* Duplicate code
* Debugging logs
* Temporary code
* Incorrect comments
* Hardcoded values
* Security problems
* Race conditions
* Error-handling problems

Keep the final changes clean.

# PHASE 25 — FINAL REPORT

At the end, provide a detailed report.

## Project Status

Overall:
PASS / PARTIAL / FAIL

## Bugs Found

For every bug:

* Bug:
* Severity:
* File:
* Root cause:
* Fix:
* Test:
* Result:

Severity:

* CRITICAL
* HIGH
* MEDIUM
* LOW

## Logic Problems

List:

* Incorrect logic
* State problems
* Race conditions
* Edge cases
* Incorrect assumptions

## C Test Results

| Test          | Result    |
| ------------- | --------- |
| Compile       | PASS/FAIL |
| Run           | PASS/FAIL |
| Input         | PASS/FAIL |
| Output        | PASS/FAIL |
| Compile Error | PASS/FAIL |
| Runtime Error | PASS/FAIL |
| Stop          | PASS/FAIL |
| Timeout       | PASS/FAIL |

## C++ Test Results

Use the same structure.

## Python Test Results

Use the same structure.

## Security Results

Report:

* CPU protection
* Memory protection
* Output protection
* Timeout
* Process cleanup
* File isolation
* Environment protection

## UI Results

Report:

* Layout
* Editor
* File explorer
* Run/Stop
* Input
* Output
* Errors
* Responsive behavior

## Files Changed

List every modified file and explain why it was modified.

## Files Not Changed

Mention important files that were inspected but intentionally left unchanged.

## Remaining Problems

List anything that still needs attention.

## Final Recommendation

State whether the IDE is:

* Ready for further development
* Requires additional fixes
* Not ready for student use

Do not hide failures.

Do not claim tests passed unless they were actually executed.

The most important principle is:

**Inspect → Reproduce → Find Root Cause → Fix → Test → Regression Test → Report**

Do not simply make the IDE "look better."

Make sure the IDE actually works correctly and reliably for students using C, C++, and Python.
