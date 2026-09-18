You are a senior frontend engineer specializing in internationalization (i18n), localization, and educational software.

I already have an existing programming IDE website for students.

I want to add TWO languages:

1. English
2. Khmer (ភាសាខ្មែរ)

The user must be able to switch between English and Khmer easily.

IMPORTANT:
Do not rebuild the application.
Do not change the existing IDE functionality.
Do not change C/C++/Python execution.
Do not change the terminal logic.
Do not change the editor logic.
Do not change backend functionality unless language support actually requires it.

Your main task is to implement a clean and maintainable i18n system.

==================================================
1. INSPECT FIRST
==================================================

Before changing anything, inspect the project.

Identify:

- Frontend framework
- Existing language system
- UI components
- Navigation
- Header
- Sidebar
- Bottom navigation
- Editor
- Terminal
- Output
- Errors
- File explorer
- Settings
- Login/Register
- Forms
- Modals
- Toasts
- Alerts
- Empty states
- Loading states
- Error messages
- Buttons
- Tooltips
- Menus

Search the entire frontend for hard-coded user-facing text.

Do NOT translate code itself.

==================================================
2. LANGUAGE SYSTEM
==================================================

Implement proper i18n.

Use the project's existing i18n solution if one already exists.

If there is no i18n system, choose an appropriate solution based on the existing framework.

Do not create a complicated custom translation system unnecessarily.

The application should have:

English:
en

Khmer:
km

==================================================
3. LANGUAGE SWITCHER
==================================================

Add a clear language switcher.

Example:

EN | ខ្មែរ

or:

English
ខ្មែរ

On mobile, it can be inside the More/Settings menu.

The language switcher must be easy for students to find.

When the user changes language:

- UI updates immediately where possible.
- No page reload unless technically necessary.
- Current IDE state should not be lost.
- Current source code must not be lost.
- Current terminal session must not be lost unnecessarily.

==================================================
4. DEFAULT LANGUAGE
==================================================

Use a sensible default language.

If the user has previously selected a language:

Remember the selection.

For example:

localStorage:

language = "en"

or:

language = "km"

When the student returns, use their selected language.

If no language is stored:

Use the browser/system language if appropriate.

If the browser language is neither English nor Khmer:

Default to English.

==================================================
5. WHAT SHOULD BE TRANSLATED
==================================================

Translate ALL USER-FACING UI TEXT.

This includes:

### Navigation

English:
Files
Code
Output
Terminal
Errors
Settings
More
Home
Back

Khmer:
ឯកសារ
កូដ
លទ្ធផល
Terminal
កំហុស
ការកំណត់
បន្ថែម
ទំព័រដើម
ត្រឡប់ក្រោយ

IMPORTANT:

Some technical terms such as:

Terminal
Code
API
Git
Python
C
C++
JavaScript
React
Node.js
npm
SQL
HTML
CSS

may remain in English when that is clearer for students.

Do not translate technical product/programming names unnaturally.

==================================================
6. BUTTONS
==================================================

Translate buttons such as:

English:

Run
Stop
Save
Delete
Cancel
Close
Create
Edit
Update
Open
Download
Upload
Clear
Search
Refresh
Copy
Paste
Submit
Confirm
Continue
Back
Next
Previous

Khmer:

ដំណើរការ
បញ្ឈប់
រក្សាទុក
លុប
បោះបង់
បិទ
បង្កើត
កែសម្រួល
ធ្វើបច្ចុប្បន្នភាព
បើក
ទាញយក
ផ្ទុកឡើង
សម្អាត
ស្វែងរក
ផ្ទុកឡើងវិញ
ចម្លង
បិទភ្ជាប់
បញ្ជូន
បញ្ជាក់
បន្ត
ត្រឡប់ក្រោយ
បន្ទាប់
មុន

Use natural Khmer, not machine-like word-for-word translations.

==================================================
7. IDE STATUS
==================================================

Translate statuses.

English:

Running
Ready
Stopped
Passed
Failed
Error
Loading
Saving
Saved
Unsaved changes
Compiling
Waiting for input
Completed
Timeout

Khmer:

កំពុងដំណើរការ
រួចរាល់
បានបញ្ឈប់
ជោគជ័យ
បរាជ័យ
កំហុស
កំពុងផ្ទុក
កំពុងរក្សាទុក
បានរក្សាទុក
មានការកែប្រែមិនទាន់រក្សាទុក
កំពុង Compile
កំពុងរង់ចាំការបញ្ចូល
បានបញ្ចប់
អស់ពេល

However, keep technical terms such as:

Compile
Runtime
Exit Code
stdin
stdout
stderr

in English when appropriate, or use a Khmer explanation alongside them.

Example:

កំពុង Compile...

rather than forcing an unnatural translation of "Compile".

==================================================
8. TERMINAL
==================================================

IMPORTANT:

Do NOT translate actual program output.

Do NOT translate:

C output
C++ output
Python output
compiler output
runtime errors
student-entered input

For example, if the student's C program says:

Enter your name:

The IDE must NOT automatically translate it.

That text belongs to the student's program.

The terminal should preserve exactly what the program outputs.

Translate only IDE-generated terminal UI.

For example:

English:

Process exited with code 0.
Exit code: 0

Khmer:

កម្មវិធីបានបញ្ចប់ដោយជោគជ័យ។
Exit code: 0

But do not modify:

printf("Enter your name: ");

==================================================
9. CODE EDITOR
==================================================

Do NOT translate:

- Source code
- Variable names
- Function names
- Comments written by students
- Compiler messages
- Programming keywords

For example:

```c
#include <stdio.h>

int main() {
    int age;

    printf("Enter age: ");
    scanf("%d", &age);

    return 0;
}


Do not use Khmer text as translation keys.

==================================================
25. AVOID DUPLICATION

If the same text appears in multiple components:

Do not create duplicate translations.

For example:

Save

should use:

common.save

everywhere.

==================================================
26. DYNAMIC TEXT

Handle dynamic values correctly.

Example:

English:

Welcome, Bunchhorng

Khmer:

សូមស្វាគមន៍, Bunchhorng

Do not translate the actual username.

Example:

English:

Process exited with code 0

Khmer:

កម្មវិធីបានបញ្ចប់។ Exit code: 0

The number must remain dynamic.

==================================================
27. CODE / TERMINAL SEPARATION

This is extremely important.

There are THREE types of text:

IDE UI text
Program-generated text
User-entered text

ONLY #1 should automatically use i18n.

Example:

IDE UI:

Run
→ translate

Program:

printf("Enter name:");
→ DO NOT translate

User:

Bunchhorng
→ DO NOT translate

==================================================
28. RESPONSIVE LANGUAGE UI

Check both languages on:

320×568
360×640
375×667
390×844
393×852
412×915
430×932

Khmer text may have different widths from English.

Make sure:

Buttons do not overflow
Tabs do not break
Header does not overflow
Bottom navigation works
Modals work
Text wraps correctly
Terminal remains usable

Do not simply assume that English layout will work for Khmer.

==================================================
29. MOBILE LANGUAGE SWITCHER

On mobile, the language selector should remain easy to access.

For example:

More
→ Settings
→ Language
→ English / ខ្មែរ

Do not make the language selector too large.

==================================================
30. DESKTOP LANGUAGE SWITCHER

On desktop, it can appear in:

Header
or
Settings

Example:

EN | ខ្មែរ

Keep it clean.

==================================================
31. RTL / LTR

Khmer is NOT RTL.

Both English and Khmer should use:

direction: ltr;

Do not implement RTL layout for Khmer.

However, verify Khmer text rendering correctly.

==================================================
32. KHMER FONT

Inspect the existing font system.

Make sure Khmer characters render correctly.

Use a suitable Khmer-capable font if necessary.

Do not change the entire application's typography unnecessarily.

Check:

Khmer characters
Line height
Button height
Navigation
Terminal
Modal
Form fields

Khmer often requires slightly different line-height and spacing than English.

==================================================
33. TRANSLATE THE ENTIRE APPLICATION

Perform a complete scan of the frontend.

Find hard-coded strings in:

JSX
TSX
Vue templates
JavaScript
TypeScript
HTML
Components
Modals
Toasts
Alerts
Forms
Navigation
Settings
Error states
Loading states
Empty states

Do not stop after translating the main navigation.

==================================================
34. DO NOT TRANSLATE SOURCE CODE

Never modify student source code during language switching.

If the student is editing:

name = input("Enter your name: ")
print("Hello", name)

changing:

English
→ Khmer

must NOT modify their code.

==================================================
35. DO NOT TRANSLATE TERMINAL OUTPUT

If the student runs:

print("Hello World")

the terminal should still display:

Hello World

even when the IDE UI language is Khmer.

The IDE language controls the IDE.

It does NOT control the student's program.

==================================================
36. TEST ENGLISH

Test:

Navigation
Editor
Terminal
Run
Stop
Save
Files
Settings
Errors
Notifications
Login if available
==================================================
37. TEST KHMER

Switch to:

ខ្មែរ

Then test the same features.

Check that every visible IDE label is translated.

Look specifically for accidental English such as:

Save
Cancel
Settings
Error
Loading
No data
Search
Close
Delete
Run

unless the text is intentionally a technical term.

==================================================
38. TEST LANGUAGE SWITCHING

Test:

English
→ Khmer
→ English
→ Khmer

Verify:

No page corruption
No lost code
No lost terminal session
No broken layout
No stale text
No console errors
==================================================
39. TEST PWA

Because this is an installable PWA:

Test language persistence after:

Change to Khmer.
Close application.
Reopen PWA.
Verify Khmer remains selected.

Then:

Change to English.
Close application.
Reopen PWA.
Verify English remains selected.
==================================================
40. FINAL QUALITY CHECK

Search for remaining hard-coded user-facing English strings.

Search for:

"Save"
"Cancel"
"Delete"
"Error"
"Loading"
"Settings"
"Search"
"Close"
"Run"
"Stop"
"No data"
"Success"
"Failed"

Determine whether each one should be translated.

Do not blindly translate technical terms.

==================================================
41. FINAL REPORT

Report:

i18n System
Framework:
i18n library:
Translation structure:
Language persistence:
Languages
English: PASS/FAIL
Khmer: PASS/FAIL
Areas Translated
Area	English	Khmer
Navigation	PASS/FAIL	PASS/FAIL
Header	PASS/FAIL	PASS/FAIL
Editor UI	PASS/FAIL	PASS/FAIL
Terminal UI	PASS/FAIL	PASS/FAIL
File Explorer	PASS/FAIL	PASS/FAIL
Settings	PASS/FAIL	PASS/FAIL
Errors	PASS/FAIL	PASS/FAIL
Toasts	PASS/FAIL	PASS/FAIL
Modals	PASS/FAIL	PASS/FAIL
Forms	PASS/FAIL	PASS/FAIL
Mobile UI	PASS/FAIL	PASS/FAIL
Intentionally NOT Translated

List technical/program-generated content that remains English, such as:

C
C++
Python
API
Terminal
compiler output
student source code
program output
Files Changed

List every changed file.

Remaining English Strings

List any remaining user-facing English strings that still need translation.

==================================================
MOST IMPORTANT RULE

The IDE should be bilingual, NOT the programming language itself.

Translate:

IDE interface
✓ Buttons
✓ Navigation
✓ Settings
✓ Messages
✓ Forms
✓ Tooltips
✓ Notifications
✓ Empty states
✓ IDE-generated status messages

Do NOT automatically translate:

✗ Student code
✗ Variable names
✗ Function names
✗ File names
✗ Program output
✗ User input
✗ Compiler output
✗ Runtime output
✗ Programming keywords
✗ Programming language names

The final experience should feel natural for both:

English-speaking students

and

Khmer-speaking students.

Follow this workflow:

INSPECT
→ FIND ALL UI STRINGS
→ CLASSIFY STRINGS
→ SET UP i18n
→ CREATE ENGLISH TRANSLATIONS
→ CREATE NATURAL KHMER TRANSLATIONS
→ CONNECT COMPONENTS
→ TEST ENGLISH
→ TEST KHMER
→ TEST LANGUAGE SWITCHING
→ TEST MOBILE
→ TEST PWA PERSISTENCE
→ CHECK TERMINAL/CODE ARE UNCHANGED
→ SEARCH FOR MISSED STRINGS
→ FINAL REPORT


### The key rule for your IDE

I would use this simple rule:

| Text | Translate? |
|---|---|
| **Save** | ✅ Yes |
| **Run** | ✅ Yes |
| **Stop** | ✅ Yes |
| **Settings** | ✅ Yes |
| **Files** | ✅ Yes |
| **Errors** | ✅ Yes |
| **Loading** | ✅ Yes |
| **Program finished successfully** | ✅ Yes |
| **Terminal** | ⚠️ Can remain English |
| **Compiler** | ⚠️ Can remain English |
| **C / C++ / Python** | ❌ No |
| `main.cpp` | ❌ No |
| `printf()` | ❌ No |
| `scanf()` | ❌ No |
| `cin` / `cout` | ❌ No |
| `input()` | ❌ No |
| Student's code | ❌ No |
| Student's program output | ❌ No |
| `gcc` / `g++` errors | ❌ No |
| `SyntaxError` | ❌ No |
| `Exit code: 0` | ⚠️ Keep technical term; surrounding message can translate |
| Username | ❌ No |
| File name | ❌ No |

**Most importantly:** don't let the agent translate the terminal's actual program output. If a student writes `printf("Hello");`, switching your IDE to Khmer should **never turn `Hello` into Khmer**. Only your IDE's own UI should change.
