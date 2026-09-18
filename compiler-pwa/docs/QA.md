You are a senior QA engineer, software engineer, security tester, and debugging specialist.

I have an existing web-based programming IDE for students.

The IDE supports:

- C
- C++
- Python
- Code editor
- File management
- Terminal
- Program input/stdin
- Program output/stdout
- Error/stderr
- Run
- Stop
- Compile
- Runtime execution
- PWA installation
- Mobile responsive UI
- English / Khmer language
- Desktop and mobile
- Save files
- Open files
- Create files
- Delete files
- Rename files

Your job is to perform a COMPLETE inspection and testing of the IDE.

Do NOT assume the IDE works correctly.

Do NOT only inspect the UI.

Test the actual application and find real bugs.

==================================================
IMPORTANT RULE
==================================================

Follow this workflow:

INSPECT
→ UNDERSTAND ARCHITECTURE
→ CREATE TEST PLAN
→ REPRODUCE BUGS
→ TEST FUNCTIONALITY
→ TEST C
→ TEST C++
→ TEST PYTHON
→ TEST TERMINAL
→ TEST STDIN
→ TEST STDOUT
→ TEST STDERR
→ TEST FILE SYSTEM
→ TEST EDITOR
→ TEST MOBILE
→ TEST PWA
→ TEST ENGLISH/KHMER
→ TEST ERROR CASES
→ TEST SECURITY
→ TEST PERFORMANCE
→ FIX BUGS
→ REGRESSION TEST
→ FINAL REPORT

Do not skip steps.

==================================================
1. INSPECT THE PROJECT FIRST
==================================================

Before modifying anything, inspect the entire project.

Identify:

Frontend:
- Framework
- Components
- Pages
- Routes
- State management
- API services
- Editor
- Terminal
- PWA implementation
- i18n

Backend:
- Framework
- Routes
- Controllers
- Services
- Process execution
- Compiler
- Runtime
- File handling
- Authentication
- Database if present

Also identify:

- Run flow
- Stop flow
- Compile flow
- stdin flow
- stdout flow
- stderr flow
- WebSocket/SSE/streaming if used
- Temporary files
- Process cleanup

Do not make changes before understanding the architecture.

==================================================
2. CREATE A TEST BASELINE
==================================================

Run the existing application.

Record:

- Build status
- Frontend console errors
- Backend errors
- Network errors
- Runtime errors
- Warnings
- Failed API requests

Check:

npm run build

and the project's appropriate backend build/test commands.

If the project already has tests:

Run them first.

Do not modify tests just to make them pass.

==================================================
3. CODE EDITOR TEST
==================================================

Test the editor thoroughly.

Test:

- Open file
- Edit file
- Type
- Delete
- Backspace
- Enter
- Copy
- Paste
- Cut
- Undo
- Redo
- Select text
- Select all
- Find
- Replace if supported
- Keyboard shortcuts
- Cursor movement
- Line numbers
- Syntax highlighting
- Auto indentation
- Brackets
- Quotes
- Long lines
- Large files

Test files:

main.c
main.cpp
main.py

Verify the editor does not corrupt source code.

==================================================
4. FILE MANAGEMENT TEST
==================================================

Test:

Create file
Open file
Save file
Save As if supported
Rename file
Delete file
Create folder
Open folder
Delete folder
Refresh
Search
Download
Upload if supported

Test filenames:

main.c
hello.cpp
student.py
test file.py
hello-world.cpp
very_long_filename_that_should_not_break_the_ui.cpp

Test invalid filenames.

Test duplicate filenames.

Test deleting files.

Test opening deleted files.

Test unsaved changes.

Example:

Edit code
→ do not save
→ switch file
→ return
→ verify behavior is correct.

==================================================
5. C TESTING
==================================================

Test simple C:

```c
#include <stdio.h>

int main() {
    printf("Hello C\n");
    return 0;
}



Expected:

Hello C
Process exited with code 0

Test variables:

#include <stdio.h>

int main() {
    int a = 10;
    int b = 20;

    printf("Sum = %d\n", a + b);

    return 0;
}

Test stdin:

#include <stdio.h>

int main() {
    char name[100];
    int age;

    printf("Enter name: ");
    fgets(name, sizeof(name), stdin);

    printf("Enter age: ");
    scanf("%d", &age);

    printf("Name: %s", name);
    printf("Age: %d\n", age);

    return 0;
}

Test:

printf
scanf
fgets
getchar
arrays
strings
functions
structs
pointers
loops
files
multiple stdin inputs
==================================================
6. C COMPILATION ERRORS

Test invalid C:

#include <stdio.h>

int main() {
    printf("Hello")
    return 0;
}

Verify:

Compiler error appears
Correct error is shown
Exit status is correct
Process does not remain running
User can edit code
User can run again
==================================================
7. C++ TESTING

Test:

#include <iostream>

int main() {
    std::cout << "Hello C++" << std::endl;
    return 0;
}

Test stdin:

#include <iostream>
#include <string>

int main() {
    std::string name;
    int age;

    std::cout << "Enter name: ";
    std::getline(std::cin, name);

    std::cout << "Enter age: ";
    std::cin >> age;

    std::cout << "Name: " << name << std::endl;
    std::cout << "Age: " << age << std::endl;

    return 0;
}

Test:

cin
getline
cout
cerr
vectors
arrays
classes
functions
pointers
structs
files
multiple inputs
==================================================
8. PYTHON TESTING

Test:

print("Hello Python")

Test stdin:

name = input("Enter name: ")
age = input("Enter age: ")

print("Name:", name)
print("Age:", age)

Test:

input()
print()
loops
lists
dictionaries
functions
classes
exceptions
file handling
JSON
multiple inputs
==================================================
9. TERMINAL TESTING

The terminal must behave like a real interactive terminal.

Test:

Program starts
→ output appears
→ program waits for input
→ student types
→ press Enter
→ actual stdin receives input
→ program continues
→ more output appears
→ process exits

Test:

Enter name: Bunchhorng
Enter age: 20
Hello Bunchhorng
Age: 20

IMPORTANT:

Do NOT fake terminal input by simply adding text to the output.

Verify that input reaches the actual process stdin.

==================================================
10. TERMINAL INPUT TESTS

Test:

One input
Multiple inputs
Empty input
Spaces
Numbers
Negative numbers
Special characters
Long input
Multiple lines
Backspace
Enter
Copy
Paste

Example:

John Doe
20
Phnom Penh

Verify all values reach the process correctly.

==================================================
11. TERMINAL OUTPUT TEST

Test:

stdout
stderr
Live output
Large output
Long lines
Unicode
Khmer text
ANSI escape sequences if supported
Auto-scroll
Manual scroll
Clear
Stop

Test delayed output:

import time

print("Step 1")
time.sleep(2)
print("Step 2")
time.sleep(2)
print("Step 3")

Output must appear progressively.

Do not wait until the process finishes.

==================================================
12. TERMINAL ERROR TEST

Test:

Python:

print(10 / 0)

C++:

#include <iostream>

int main() {
    int x = 0;
    std::cout << 10 / x;
}

Verify:

Error appears
Terminal remains usable
Exit status is correct
Process is cleaned up
==================================================
13. STOP PROCESS TEST

Test:

C:

#include <stdio.h>

int main() {
    while (1) {
        printf("Running...\n");
    }

    return 0;
}

C++:

while (true) {
}

Python:

while True:
    pass

Click Stop.

Verify:

Process actually stops
Child processes stop
stdin closes
stdout closes
stderr closes
UI changes from Running to Ready
No orphan process
User can run another program
==================================================
14. TIMEOUT TEST

Test infinite loops and long-running programs.

Verify:

Timeout exists if intended
Timeout is enforced
Process is terminated
UI shows timeout status
Terminal remains usable
Another program can run afterward
==================================================
15. REPEATED RUN TEST

Run the same program repeatedly:

Run
→ input
→ finish

Run again
→ different input
→ finish

Run again
→ error

Run again
→ success

Verify:

No duplicated output
No duplicated processes
No stale stdin
No stale WebSocket
No old process receiving new input
No memory leak caused by repeated sessions
==================================================
16. RUN / STOP STATE TEST

Verify button states.

Before running:

Run = enabled
Stop = disabled

During execution:

Run = disabled or safely protected
Stop = enabled

After execution:

Run = enabled
Stop = disabled

After compile error:

Run = enabled
Stop = disabled

After timeout:

Run = enabled
Stop = disabled

==================================================
17. OUTPUT / ERROR / TERMINAL TABS

Test:

Output
Errors
Terminal

Switch between them while program is running.

Switch repeatedly.

Verify:

No lost output
No duplicated output
No broken layout
No stale status
Active tab is correct
==================================================
18. MOBILE RESPONSIVE TEST

Test:

320 × 568
360 × 640
375 × 667
390 × 844
393 × 852
412 × 915
430 × 932
480 × 1040

Also landscape:

568 × 320
667 × 375
844 × 390
932 × 430

Check:

Header
Editor
Terminal
Tabs
Files
Bottom navigation
Run
Stop
Save
Menus
Modals
Forms
Keyboard
Scrolling

There must be no unwanted page-level horizontal scrolling.

==================================================
19. MOBILE KEYBOARD TEST

Open the terminal on mobile.

Run:

name = input("Enter name: ")
print("Hello", name)

Tap terminal.

Keyboard opens.

Type:

Bunchhorng

Press Enter.

Verify:

Input is visible
Cursor is visible
Keyboard does not cover important content
Enter sends stdin
Program continues
Terminal scrolls correctly

Test iOS-style and Android-style keyboard behavior if possible.

==================================================
20. PWA TESTING

Verify:

Web app manifest
App name
Icons
Start URL
Display mode
Theme color
Service worker
Installability
Offline behavior if intended
Update behavior

Install the application.

Open it from the home screen.

Verify:

IDE loads correctly
No browser-dependent UI breaks
Files work
Editor works
Terminal works
Run works
Stop works
Language remains selected
==================================================
21. ENGLISH / KHMER TESTING

Test:

English
→ Khmer
→ English
→ Khmer

Check:

Header
Navigation
Buttons
Settings
Files
Modals
Toasts
Errors
Empty states
Tooltips
Accessibility labels

IMPORTANT:

Translate IDE UI only.

Do NOT translate:

Student source code
File names
Program output
User input
Compiler output
Runtime output
C/C++/Python keywords
Technical identifiers

Example:

Student code:

print("Hello")

must remain unchanged when switching languages.

==================================================
22. RESPONSIVE KHMER TEST

Khmer text can have different width and line-height.

Test Khmer at:

320 × 568
360 × 640
390 × 844
412 × 915
430 × 932

Check:

Buttons
Header
Bottom navigation
Modals
Settings
Tabs
Toasts

Make sure Khmer does not overflow.

==================================================
23. NETWORK TESTING

Test:

Normal connection
Slow connection
API timeout
Backend unavailable
Connection lost during execution
Connection restored
Duplicate requests

The UI should show useful error states.

Do not leave the user permanently stuck in:

"Loading..."

==================================================
24. API TESTING

Inspect all frontend API calls.

Check:

HTTP method
URL
Request body
Response handling
Error handling
Authentication
Authorization
Timeout
Duplicate requests

Verify frontend does not assume every request succeeds.

Test:

200
400
401
403
404
409
422
429
500
502
503

where applicable.

==================================================
25. AUTHENTICATION TEST

If authentication exists, test:

Login
Logout
Session persistence
Invalid login
Expired session
Unauthorized access
Protected routes
Refresh page
Multiple tabs

Verify users cannot access protected resources without authorization.

==================================================
26. SECURITY TEST

Inspect the execution system carefully.

Students submit C/C++/Python code.

Test whether malicious or dangerous programs can:

Access arbitrary server files
Delete server files
Access environment secrets
Access credentials
Access unrelated user files
Consume unlimited CPU
Consume unlimited memory
Create unlimited processes
Run forever
Create huge files
Generate unlimited output
Access internal services
Escape the execution environment

Verify appropriate sandboxing and resource limits exist.

DO NOT weaken security while fixing functionality.

==================================================
27. PATH / FILE SECURITY

Test filenames and paths such as:

../test
../../test
../../../etc/passwd

and other path traversal patterns.

Verify users cannot access files outside their allowed workspace.

==================================================
28. OUTPUT LIMIT TEST

Test a program producing huge output.

Example:

while True:
    print("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")

Verify:

Browser does not freeze
Server does not crash
Memory does not grow without limit
Output is limited appropriately
Process can still be stopped
==================================================
29. RESOURCE LIMIT TEST

Test:

CPU-intensive program
Infinite loop
Memory-intensive program
Huge output
Many child processes
Long-running process

Verify appropriate:

Timeout
Memory limits
CPU limits
Process limits
Output limits

exist where required.

==================================================
30. CONCURRENT EXECUTION TEST

Test what happens when:

User clicks Run twice.

User clicks Run while another program is running.

User opens two tabs.

User runs C and then Python quickly.

Verify the system does not create unintended duplicate or conflicting processes.

==================================================
31. BROWSER TEST

Test the application in available browsers.

At minimum check:

Chrome/Chromium
Firefox
Safari if available
Mobile browser if available

Check:

Editor
Terminal
Keyboard
PWA
File handling
Layout
==================================================
32. PERFORMANCE TEST

Check:

Initial load
Editor performance
Large source files
Large terminal output
Frequent terminal updates
Switching tabs
Opening files
Running programs
Repeated execution

Look for:

Memory leaks
Excessive re-renders
CPU spikes
Slow API requests
Event listener leaks
WebSocket leaks
Process leaks
==================================================
33. CONSOLE ERROR TEST

Open browser developer console.

There should be no unexpected:

Errors
Unhandled Promise Rejections
Failed network requests
React/Vue warnings
Duplicate event listeners
Hydration errors
Invalid DOM nesting
Missing keys

Fix real problems rather than hiding them.

Do not simply disable warnings.

==================================================
34. BACKEND LOG TEST

Inspect backend logs while testing.

Look for:

Exceptions
Process errors
Memory problems
Timeout problems
Broken pipes
Closed socket errors
Orphan process errors
Permission errors

Fix root causes.

==================================================
35. DATABASE TEST

If the IDE uses a database, test:

Create
Read
Update
Delete
Validation
Duplicate data
Missing records
Concurrent requests
Transaction failures

Verify invalid data cannot corrupt the database.

==================================================
36. EDGE CASE TESTING

Test:

Empty code
One-line code
Very large code
Very long line
Unicode
Khmer text
Emoji
Special characters
Empty input
Huge input
Negative numbers
Zero
Very large numbers
Invalid numbers
Missing files
Deleted files
Duplicate files
Invalid extensions
Compile failure
Runtime failure
Timeout
Network failure
Server restart

==================================================
37. UI/UX TEST

Check:

Alignment
Spacing
Typography
Contrast
Buttons
Icons
Active states
Loading states
Error states
Empty states
Focus states
Touch targets

Do not redesign unnecessarily.

Keep the existing visual identity.

No gradients.

Keep the UI clean and professional.

==================================================
38. ACCESSIBILITY TEST

Check:

Keyboard navigation
Focus visibility
Button labels
aria-label
Form labels
Contrast
Touch target size
Screen reader semantics where appropriate

Do not remove accessibility to make the UI smaller.

==================================================
39. REGRESSION TEST

After fixing bugs, repeat all critical tests.

Especially:

C
C++
Python
stdin
stdout
stderr
Run
Stop
Timeout
Files
Editor
Terminal
Mobile
PWA
English
Khmer

Make sure fixes do not break existing functionality.

==================================================
40. DO NOT HIDE BUGS

Do NOT:

Disable errors
Remove console warnings just to make the console clean
Hide failed API requests
Fake successful execution
Fake terminal input
Mock successful compiler results
Delete failing tests
Comment out broken code
Suppress exceptions without fixing the cause

Find and fix the root cause.

==================================================
41. BUG CLASSIFICATION

For every bug found, classify:

CRITICAL
HIGH
MEDIUM
LOW

Use:

CRITICAL:
Security failure, data loss, system crash, arbitrary server access, uncontrolled process execution.

HIGH:
Core IDE functionality does not work.

MEDIUM:
Important functionality works incorrectly in specific cases.

LOW:
Minor UI or usability issue.

==================================================
42. BUG REPORT FORMAT

For every bug:

BUG-001

Title:
Severity:

Environment:

Steps to reproduce:

Expected:

Actual:

Root cause:

Fix:

Files changed:

Verification:

==================================================
43. DO NOT FIX EVERYTHING BLINDLY

Before fixing each bug:

Reproduce it.
Understand the root cause.
Identify affected components.
Implement the smallest safe fix.
Test the fix.
Run regression tests.

Do not rewrite the whole application.

==================================================
44. FINAL TEST MATRIX

Create a final table:

Category	Test	Result	Notes
Editor	Open file	PASS/FAIL
Editor	Edit	PASS/FAIL
Editor	Save	PASS/FAIL
Files	Create	PASS/FAIL
Files	Rename	PASS/FAIL
Files	Delete	PASS/FAIL
C	Compile	PASS/FAIL
C	Run	PASS/FAIL
C	stdin	PASS/FAIL
C	stdout	PASS/FAIL
C	stderr	PASS/FAIL
C++	Compile	PASS/FAIL
C++	Run	PASS/FAIL
C++	stdin	PASS/FAIL
C++	stdout	PASS/FAIL
C++	stderr	PASS/FAIL
Python	Run	PASS/FAIL
Python	stdin	PASS/FAIL
Python	stdout	PASS/FAIL
Python	stderr	PASS/FAIL
Terminal	Live output	PASS/FAIL
Terminal	Input	PASS/FAIL
Terminal	Stop	PASS/FAIL
Terminal	Timeout	PASS/FAIL
Terminal	Clear	PASS/FAIL
UI	Desktop	PASS/FAIL
UI	Mobile	PASS/FAIL
UI	Landscape	PASS/FAIL
PWA	Install	PASS/FAIL
PWA	Launch	PASS/FAIL
i18n	English	PASS/FAIL
i18n	Khmer	PASS/FAIL
Security	Path traversal	PASS/FAIL
Security	Process limits	PASS/FAIL
Security	File isolation	PASS/FAIL
Performance	Large output	PASS/FAIL
Performance	Large file	PASS/FAIL
Regression	Full test	PASS/FAIL
==================================================
45. FINAL REPORT

At the end, provide:

1. Overall Test Summary

Total tests:
Passed:
Failed:
Fixed:

2. Critical Bugs

List all critical bugs.

3. High Bugs

List all high-severity bugs.

4. Medium Bugs

List all medium-severity bugs.

5. Low Bugs

List all low-severity bugs.

6. Files Changed

List every modified file.

7. Architecture Problems

Explain any architectural problems discovered.

8. Security Problems

Explain security issues discovered.

9. Performance Problems

Explain performance issues discovered.

10. Remaining Problems

Do not claim everything is fixed if something remains.

11. Final Regression Result

Confirm whether:

C
C++
Python
Terminal
stdin
stdout
stderr
Editor
Files
Mobile
PWA
English
Khmer

still work after the fixes.

==================================================
MOST IMPORTANT REQUIREMENT

This is a STUDENT PROGRAMMING IDE.

The most important functionality is:

CODE
↓
COMPILE
↓
RUN
↓
REAL PROCESS
↓
REAL STDIN
↓
REAL STDOUT / STDERR
↓
EXIT
↓
CLEANUP

Test that complete flow with:

C
C++
Python

Do not test only the UI.

The IDE must survive:

Compile errors
Runtime errors
Infinite loops
Timeouts
Huge output
Multiple inputs
Empty input
Repeated execution
Stop
Network problems
Mobile keyboard
Different screen sizes

And after every fix:

TEST AGAIN.

Do not finish until you have inspected the complete IDE and produced the final test report.


### I especially recommend testing these 10 programs

Have your agent create/run these as a **standard IDE test suite**:

1. **Hello World** — basic execution
2. **Variables + calculations** — normal logic
3. **Multiple stdin** — terminal input
4. **`scanf()` / `cin` / `input()`** — language-specific input
5. **Large output** — terminal performance
6. **Compile error** — compiler handling
7. **Runtime error** — error handling
8. **Infinite loop** — Stop/Timeout
9. **File I/O** — filesystem behavior
10. **Unicode/Khmer** — encoding support

The most important one for your IDE is **#3 + #4**, because your previous terminal screenshots showe
