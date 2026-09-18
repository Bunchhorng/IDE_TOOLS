You are a senior responsive UI/UX engineer specializing in mobile IDEs and developer tools.

I already have a working programming IDE website.

I want you to improve the EXISTING UI so it is clean, responsive, and usable across ALL common phone screen sizes.

IMPORTANT:
Do NOT rebuild the application.
Do NOT redesign the entire application.
Do NOT change the existing functionality.
Do NOT change the backend.
Do NOT change C/C++/Python execution.
Do NOT change the terminal logic.
Do NOT change the editor logic.

Your task is ONLY to improve the responsive layout and mobile UI.

==================================================
1. INSPECT FIRST
==================================================

Before changing anything, inspect the existing frontend.

Check:

- Main layout
- Header
- Navigation
- Bottom navigation
- Sidebar
- File explorer
- Code editor
- Terminal
- Output
- Error panel
- Run button
- Stop button
- Save button
- Menus
- Modals
- Forms
- Cards
- Tables
- Toasts
- Dropdowns
- Scroll containers
- Fixed elements

Find:

- Fixed widths
- Fixed heights
- Hard-coded margins
- Hard-coded positions
- Overflow problems
- Elements going outside the viewport
- Text wrapping problems
- Buttons being too large/small
- Keyboard overlap
- Horizontal scrolling
- Bottom navigation overlap
- Terminal/editor height problems

Do not modify anything until you understand the current layout.

==================================================
2. TARGET DEVICES
==================================================

The UI must work properly on:

Small phones:
- 320 × 568
- 360 × 640

Common phones:
- 375 × 667
- 390 × 844
- 393 × 852
- 412 × 915
- 430 × 932

Large phones:
- 480 × 1040

Landscape:
- 568 × 320
- 667 × 375
- 844 × 390
- 932 × 430

Also make sure desktop/tablet layouts are not broken.

==================================================
3. RESPONSIVE PRINCIPLE
==================================================

Use:

Mobile-first responsive design.

The UI must adapt to the available viewport.

DO NOT design specifically for only one phone such as:

390 × 844

Do not use:

left: 390px;
width: 390px;
height: 844px;

or similar device-specific hacks.

Use:

- %
- rem
- em
- vw
- vh
- min()
- max()
- clamp()
- flexbox
- CSS grid
- responsive breakpoints

where appropriate.

==================================================
4. NO HORIZONTAL SCROLL
==================================================

On normal phone portrait screens:

The entire application should fit inside the viewport width.

There should be NO unwanted horizontal scrolling.

Check:

- Header
- Editor
- Terminal
- Bottom navigation
- Buttons
- Tabs
- Forms
- Modals
- Dropdowns

If horizontal scrolling is intentionally required inside the CODE EDITOR, keep it inside the editor only.

Do NOT allow the entire page to horizontally scroll.

==================================================
5. MOBILE HEADER
==================================================

Optimize the header for small screens.

The header must not become crowded.

For example:

[←] [File Name]        [Save] [▶]

On very small screens:

[←] [File...]       [▶]

Move secondary actions into a menu if necessary.

Do not squeeze 8–10 buttons into one row.

Important actions should remain easily accessible.

==================================================
6. FILE NAME
==================================================

Long filenames must not break the layout.

Example:

very_long_student_program_file.cpp

Should become something like:

very_long_stu...cpp

or use ellipsis.

Never allow the filename to push buttons outside the screen.

==================================================
7. TOP TABS
==================================================

For tabs such as:

Output
Errors
Terminal

make sure they remain usable on small screens.

If necessary:

- horizontal scroll only inside the tab container
- reduce spacing
- use compact labels
- maintain clear active state

Do not make the entire page horizontally scroll.

==================================================
8. CODE EDITOR
==================================================

The code editor is one of the most important parts of the IDE.

Make sure it:

- Uses available width
- Uses available height
- Does not get pushed outside the viewport
- Supports horizontal code scrolling
- Supports vertical scrolling
- Keeps line numbers usable
- Keeps cursor visible
- Does not become unusably small

Do NOT wrap code lines if the existing editor is designed for horizontal code scrolling.

The editor should feel like a real coding environment.

==================================================
9. TERMINAL
==================================================

The terminal must work well on phones.

It should:

- Fill available space
- Scroll vertically
- Allow horizontal scrolling when necessary
- Keep the cursor visible
- Accept keyboard input
- Avoid being hidden behind the mobile keyboard
- Keep the latest output visible
- Preserve terminal functionality

Do not create a separate mobile-only fake terminal.

Use the existing real terminal.

==================================================
10. MOBILE KEYBOARD
==================================================

This is VERY IMPORTANT.

When the student taps the terminal and the phone keyboard opens:

The terminal must remain visible.

Do not allow the keyboard to cover:

- Current input
- Terminal cursor
- Important controls

Test with:

Android keyboard
iOS keyboard

Handle viewport resizing correctly.

Be careful with:

100vh

because mobile browsers can change viewport height when the keyboard opens.

Prefer modern viewport units where appropriate:

svh
lvh
dvh

Use them only where they solve an actual problem.

==================================================
11. BOTTOM NAVIGATION
==================================================

The current IDE has mobile navigation similar to:

Files
Code
Output
More

Keep this concept if it already exists.

Make sure:

- It stays at the bottom
- It does not cover content
- It does not move unexpectedly
- It respects safe areas
- Buttons are large enough to tap
- Icons and labels remain readable

Example:

┌──────────────────────────────┐
│                              │
│          CONTENT             │
│                              │
├──────────────────────────────┤
│ Files  Code  Output  More    │
└──────────────────────────────┘

==================================================
12. SAFE AREA
==================================================

Support modern phones with:

- Notches
- Dynamic islands
- Rounded corners
- Home indicators

Use safe-area handling where appropriate.

For bottom navigation, consider:

env(safe-area-inset-bottom)

For top areas:

env(safe-area-inset-top)

Do not add excessive empty space on normal devices.

==================================================
13. TOUCH TARGETS
==================================================

Buttons must be easy to tap.

Avoid tiny controls.

Important interactive controls should have an appropriate touch target, generally around 44px or larger.

Check:

- Run
- Stop
- Save
- Back
- Menu
- Tabs
- File buttons
- Terminal controls
- Bottom navigation

Do not make every button huge.

Keep the UI compact but touch-friendly.

==================================================
14. RUN / STOP BUTTON
==================================================

Run and Stop are critical IDE actions.

On phones:

Run should remain easy to access.

When running:

Run → Stop

Do not allow the button to overlap:

- Filename
- Save button
- Status indicator
- Browser UI

Make the primary action visually clear.

==================================================
15. TERMINAL ACTION BUTTONS
==================================================

Controls such as:

Clear
Stop
More

should not consume too much horizontal space.

Use icon buttons when appropriate.

Use accessible tooltips/labels where needed.

==================================================
16. MODALS
==================================================

All modals must work on small phones.

Check:

- Width
- Height
- Scrolling
- Buttons
- Close button
- Input fields

Do not create:

width: 600px;

without responsive constraints.

Use something like:

width: min(...);
max-width: ...;
max-height: ...;

where appropriate.

A modal must never extend outside the viewport.

==================================================
17. FORMS
==================================================

Make forms usable on phones.

Check:

- Input width
- Font size
- Labels
- Select boxes
- Buttons
- Validation messages

Inputs should not cause unwanted browser zooming on iOS.

Use appropriate input font sizing.

==================================================
18. OVERFLOW
==================================================

Audit every major container.

Find:

overflow-x
overflow-y
position: fixed
position: absolute
height: 100vh
width: 100vw

and determine whether they cause mobile issues.

Do not blindly change overflow rules.

Fix the actual source of the problem.

==================================================
19. RESPONSIVE BREAKPOINTS
==================================================

Use sensible breakpoints based on layout needs.

Do NOT create many unnecessary breakpoints.

Prefer a simple responsive structure such as:

- Small mobile
- Mobile
- Tablet
- Desktop

If the existing project already has a breakpoint system, reuse it.

==================================================
20. LANDSCAPE MODE
==================================================

The application must remain usable when the phone rotates.

In landscape:

- Header remains usable
- Editor gets sufficient height
- Terminal gets sufficient height
- Bottom navigation does not cover content
- Buttons remain accessible

Do not assume portrait orientation only.

==================================================
21. SMALL SCREEN PRIORITY
==================================================

For extremely small phones such as:

320 × 568

prioritize:

1. Code editor
2. Terminal
3. Run/Stop
4. File access
5. Essential navigation

Secondary actions can move into menus.

Do not allow secondary UI to destroy the coding experience.

==================================================
22. RESPONSIVE TERMINAL / EDITOR SPLIT
==================================================

If desktop currently uses:

Editor
+
Terminal

keep that desktop behavior.

On mobile, use a stacked or tab-based layout.

For example:

Mobile:

Code
─────
Editor

or:

Terminal
─────
Output

Do not try to force a desktop split-screen layout onto a 320px phone.

==================================================
23. PWA MOBILE LAYOUT
==================================================

This application is also intended to be installable as a PWA.

When launched from the home screen:

The UI should behave like an app.

Avoid relying on:

- browser address bar
- browser navigation buttons
- desktop hover behavior

Important functionality must work without hover.

==================================================
24. NO HOVER DEPENDENCY
==================================================

Phones do not have normal mouse hover.

Do not hide important information or controls behind hover-only interactions.

Use:

- tap
- long press where appropriate
- visible controls
- menus

instead.

==================================================
25. PERFORMANCE
==================================================

Do not add unnecessary CSS or JavaScript.

Avoid:

- unnecessary resize listeners
- excessive DOM calculations
- continuous polling
- expensive animations

The IDE should remain smooth on low-end phones.

==================================================
26. VISUAL DESIGN
==================================================

Keep the existing visual identity.

Do not completely redesign the application.

Improve:

- spacing
- alignment
- sizing
- hierarchy
- readability
- responsiveness

Use a clean professional developer-tool style.

NO gradients.

Avoid excessive shadows, cards, decorations, and animations.

==================================================
27. ACCESSIBILITY
==================================================

Check:

- Text contrast
- Focus states
- Button labels
- aria-labels
- Keyboard navigation
- Touch targets
- Screen-reader labels

Do not remove visible labels solely to make the UI smaller if that makes the interface harder to understand.

==================================================
28. TEST EVERY TARGET SIZE
==================================================

After implementation, test at least:

320 × 568
360 × 640
375 × 667
390 × 844
393 × 852
412 × 915
430 × 932
480 × 1040

Also test:

568 × 320
667 × 375
844 × 390
932 × 430

For every size check:

- No horizontal page scrolling
- Header
- Filename
- Save
- Run
- Stop
- Tabs
- Editor
- Terminal
- Input
- Output
- Bottom navigation
- Menus
- Modals
- Keyboard behavior

==================================================
29. TEST REAL INTERACTION
==================================================

Do not only inspect screenshots.

Actually interact with the application.

Test:

1. Open IDE.
2. Open a C file.
3. Edit code.
4. Run.
5. Enter stdin.
6. View output.
7. Stop program.
8. Open C++.
9. Run C++.
10. Enter input.
11. Open Python.
12. Run Python.
13. Enter input.
14. Open Files.
15. Return to Code.
16. Return to Terminal.
17. Rotate mobile viewport.
18. Open keyboard.
19. Scroll terminal.
20. Close keyboard.
21. Open menus.
22. Open modals.

Make sure no layout breaks.

==================================================
30. VISUAL REGRESSION
==================================================

Before changing the UI, inspect the existing design.

After changing it, compare:

Desktop
Tablet
Mobile

Do not make desktop worse while fixing mobile.

If a desktop layout is already good:

KEEP IT.

Only modify the responsive behavior required for mobile.

==================================================
31. IMPORTANT — DO NOT USE DEVICE-SPECIFIC HACKS
==================================================

Do NOT create CSS such as:

@media (width: 390px) { ... }

unless there is an extremely specific documented reason.

Do NOT optimize only for the screenshot.

The implementation must work across unknown future phone sizes.

==================================================
32. FINAL QUALITY CHECK
==================================================

Before finishing, inspect:

- CSS
- Components
- Layout hierarchy
- Responsive breakpoints
- Fixed positioning
- Overflow
- Viewport units
- Safe areas
- Keyboard behavior

Remove:

- Dead CSS
- Duplicate CSS
- Unused classes
- Temporary fixes
- Debug code
- Device-specific hacks

==================================================
33. FINAL REPORT
==================================================

Report:

### Files Changed

List every changed file.

### Problems Found

For each problem:

- Component
- Problem
- Root cause
- Fix

### Responsive Testing

| Screen | Result |
|---|---|
| 320×568 | PASS/FAIL |
| 360×640 | PASS/FAIL |
| 375×667 | PASS/FAIL |
| 390×844 | PASS/FAIL |
| 393×852 | PASS/FAIL |
| 412×915 | PASS/FAIL |
| 430×932 | PASS/FAIL |
| 480×1040 | PASS/FAIL |
| Landscape | PASS/FAIL |

### IDE Testing

| Feature | Result |
|---|---|
| Code Editor | PASS/FAIL |
| Terminal | PASS/FAIL |
| C | PASS/FAIL |
| C++ | PASS/FAIL |
| Python | PASS/FAIL |
| stdin | PASS/FAIL |
| stdout | PASS/FAIL |
| Run | PASS/FAIL |
| Stop | PASS/FAIL |
| File Explorer | PASS/FAIL |
| Bottom Navigation | PASS/FAIL |
| PWA | PASS/FAIL |

### Remaining Issues

List anything that could not be tested or fixed.

==================================================
MOST IMPORTANT GOAL
==================================================

I want ONE responsive IDE UI that automatically adapts to different phones.

Not:

"Make it look good on my 390×844 screenshot."

Instead:

"Make it work correctly on phones I have never tested."

The final layout should feel like a professional mobile coding IDE:

Small screen
↓
Clean header
↓
Code / Terminal workspace
↓
Essential actions
↓
Bottom navigation
↓
Safe-area aware

Use this workflow:

INSPECT
→ IDENTIFY RESPONSIVE PROBLEMS
→ CHECK CURRENT COMPONENT STRUCTURE
→ PLAN
→ FIX LAYOUT
→ TEST SMALL PHONE
→ TEST NORMAL PHONE
→ TEST LARGE PHONE
→ TEST LANDSCAPE
→ TEST KEYBOARD
→ TEST TERMINAL
→ TEST C/C++/PYTHON
→ TEST DESKTOP
→ REVIEW CSS
→ REMOVE HACKS
→ FINAL REPORT
