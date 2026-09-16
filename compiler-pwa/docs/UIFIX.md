You are a senior UI/UX engineer and frontend developer.

Your task is to inspect my current programming IDE UI and FIX the UI directly in the existing project.

This is a student programming IDE for:

* C
* C++
* Python

## Main Goal

Improve the UI so it looks like a modern, clean, professional programming IDE while keeping the application simple and easy for students to use.

## Important Rules

1. DO NOT rebuild the entire project from scratch.
2. DO NOT change the existing application architecture unless necessary.
3. DO NOT change backend functionality.
4. DO NOT change compiler/execution logic.
5. DO NOT remove existing features.
6. Keep existing routes, APIs, components, and functionality working.
7. First inspect the existing code before making changes.
8. Reuse existing components whenever possible.
9. Make the smallest reasonable changes needed to improve the UI.
10. Do not introduce unnecessary dependencies.
11. Do not use gradients.
12. Avoid excessive animations.
13. Keep the interface responsive.
14. Make the UI suitable for students and teachers.
15. Make sure the UI works on desktop and smaller screens.

## IDE Layout

The main IDE should have a layout similar to:

┌─────────────────────────────────────────────────────┐
│ Logo / Project Name       Language    Run  Stop     │
├──────────┬──────────────────────────────┬───────────┤
│          │                              │           │
│ Explorer │       Code Editor            │  Input    │
│          │                              │           │
│ Files    │                              │  Output   │
│          │                              │           │
├──────────┴──────────────────────────────┴───────────┤
│ Terminal / Problems / Output / Status              │
└─────────────────────────────────────────────────────┘

## Header

Improve the top navigation/header.

Include:

* IDE/project name
* Current programming language
* Run button
* Stop button
* Save button if available
* Settings button if available

Buttons should:

* Have clear icons
* Have tooltips
* Have proper hover states
* Have disabled states
* Show loading state when appropriate

Use Bootstrap Icons or the project's existing icon library instead of emojis.

## File Explorer

Improve the file explorer.

Requirements:

* Clear file/folder hierarchy
* File icons
* Active file highlighting
* Hover state
* New file button
* Delete/rename actions if already supported
* Scrollable file list
* Clear selected-file state

Example:

📁 project
├── 📄 main.c
├── 📄 main.cpp
└── 📄 main.py

Do not use emoji icons in the actual UI. Use proper icons.

## Code Editor

The code editor is the most important part of the application.

Improve:

* Editor spacing
* Font size
* Line numbers
* Current-line highlighting
* Horizontal scrolling
* Vertical scrolling
* Proper syntax highlighting
* Cursor visibility
* Selection visibility
* Active editor state

Do not modify the editor's actual functionality.

If Monaco Editor, CodeMirror, or another editor already exists, keep it and improve its surrounding UI rather than replacing it unnecessarily.

## Run / Stop Controls

Make execution controls very clear.

Run:

* Primary action
* Clear play icon
* Loading state while program is running

Stop:

* Clearly different from Run
* Disabled when nothing is running
* Immediately understandable

Example:

[ ▶ Run ] [ ■ Stop ]

Do not use unnecessary large buttons.

## Input Panel

Create a clean input area for programs requiring stdin.

Include:

* Clear label such as "Program Input"
* Textarea
* Placeholder
* Clear button if appropriate

Example:

Program Input
┌──────────────────────────────┐
│ Enter program input here...  │
│                              │
└──────────────────────────────┘

## Output Panel

Improve program output.

Clearly distinguish:

* Program Output
* Compilation Error
* Runtime Error
* Exit Code
* Execution Time

Example:

Output
────────────────────────────
Hello, World!

Program finished successfully.
Exit code: 0
Execution time: 0.02s

Errors should be visually obvious without making the UI aggressive.

## Problems / Errors

Create a clear error display.

For example:

Problems
────────────────────────────
main.cpp:12
error: 'x' was not declared in this scope

Use:

* Error icon
* File name
* Line number
* Error message
* Click-to-navigate if the existing editor supports it

## Status Bar

Add/improve a small status bar containing information such as:

C++
UTF-8
Ln 12, Col 8
Spaces: 4
Running / Ready

Only display information that is actually available.

## Color Design

Use a professional developer-tool color scheme.

Prefer:

* White / dark neutral backgrounds
* Blue for primary actions
* Red for errors
* Green for success
* Yellow/orange for warnings

Do not use gradients.

Do not use too many colors.

Maintain good contrast and accessibility.

## Dark Mode

If the existing application supports dark mode:

Make sure:

* Editor matches the overall theme
* Sidebar matches
* Input matches
* Output matches
* Buttons remain readable
* Borders remain visible
* Text has sufficient contrast

Do not create a separate complicated theme system if one already exists.

## Responsive Design

Check the UI at:

Desktop:
1920 × 1080

Laptop:
1366 × 768

Tablet:
768 × 1024

Mobile:
390 × 844

The IDE is primarily desktop-oriented, but smaller screens should not completely break the interface.

## UX Problems to Check

Look for and fix:

* Misaligned buttons
* Excessive padding
* Inconsistent spacing
* Inconsistent font sizes
* Poor contrast
* Overflow
* Broken scrolling
* Buttons that are too large
* Buttons that are too small
* Unclear active states
* Confusing labels
* Empty states
* Loading states
* Error states
* Disabled states
* Poor responsive behavior

# Inspection-First Workflow

Before modifying ANY file, follow this workflow exactly.

### Phase 1 — Inspect the Project

First inspect the complete project structure.

Identify:

* Frontend framework
* Build tool
* Package manager
* Main entry point
* Main IDE page/component
* Layout components
* Sidebar/file explorer
* Code editor component
* Input component
* Output/terminal component
* Header/navbar
* Settings/theme components
* Global CSS
* Component-specific CSS
* Existing UI libraries
* Existing icon libraries

Do not make changes during this phase.

### Phase 2 — Inspect Dependencies

Read the relevant dependency/configuration files.

Determine whether the project already uses:

* React / Vue / Angular / Svelte / other
* Tailwind
* Bootstrap
* Material UI
* shadcn/ui
* CSS modules
* SCSS
* Monaco Editor
* CodeMirror
* Bootstrap Icons
* Lucide
* Other UI libraries

Reuse the existing stack.

Do NOT install a new UI framework simply to redesign the interface.

### Phase 3 — Trace the IDE UI

Starting from the application's entry point, trace how the IDE is rendered.

Create a mental/component map such as:

App
→ IDE Page
→ Header
→ Sidebar
→ File Explorer
→ Editor
→ Input
→ Output
→ Status Bar

Identify which files control each section.

### Phase 4 — Inspect Existing Styling

Before changing CSS, inspect:

* Global styles
* CSS variables
* Theme definitions
* Colors
* Typography
* Spacing
* Borders
* Shadows
* Breakpoints
* Existing responsive rules

Reuse existing design tokens where possible.

Do not randomly add dozens of new CSS values.

### Phase 5 — Inspect Existing Functionality

Understand how the UI communicates with the existing functionality.

Specifically identify:

* Run handler
* Stop handler
* Language selector
* File selection
* File creation
* File deletion
* Editor state
* Input state
* Output state
* Error state
* Loading state

Do NOT rewrite these systems.

Only change their visual presentation unless a UI bug requires a minimal functional fix.

### Phase 6 — Identify Problems

Create an internal checklist of actual UI problems found.

Categorize them:

**Critical**

* Broken layout
* Unusable controls
* Content inaccessible
* Editor not usable

**Major**

* Poor spacing
* Broken responsive behavior
* Confusing navigation
* Poor error/output visibility

**Minor**

* Typography inconsistencies
* Icon inconsistencies
* Small alignment issues
* Minor visual polish

Prioritize usability problems over cosmetic changes.

### Phase 7 — Plan Before Editing

Before writing code, determine:

1. Which files need modification.
2. Why each file needs modification.
3. What UI problem each modification solves.
4. Whether an existing component can be reused.
5. Whether the change could affect existing functionality.

Do not modify unrelated files.

### Phase 8 — Implement Incrementally

Make changes in small logical groups.

Recommended order:

1. Global layout
2. Header
3. Sidebar/file explorer
4. Editor container
5. Input/output panels
6. Problems/errors
7. Status bar
8. Responsive behavior
9. Visual polish

After each major change, verify that the application still builds.

### Phase 9 — Verify the Diff

After editing:

* Review every changed file.
* Remove unused imports.
* Remove unused CSS.
* Check for duplicated components.
* Check for accidental backend changes.
* Check for accidental API changes.
* Check that no existing feature was removed.
* Check that no unnecessary dependency was added.

Keep the final diff focused on the UI.

### Phase 10 — Build and Run

Run the project's existing build/development commands.

Use the commands already defined by the project rather than inventing replacements.

If the build fails:

1. Read the exact error.
2. Identify whether the error was caused by your changes.
3. Fix it.
4. Run the build again.

Do not declare success until the application builds successfully.

### Phase 11 — Visual Verification

Open the application and inspect the actual rendered UI.

Check:

* Header
* Sidebar
* Editor
* Input
* Output
* Errors
* Status bar
* Scrolling
* Buttons
* Icons
* Empty states
* Loading states
* Responsive layout

Do not rely only on reading the source code.

### Phase 12 — Regression Test

Verify that the UI changes did not break:

* C execution
* C++ execution
* Python execution
* File switching
* Editor input
* Program input
* Program output
* Compilation errors
* Runtime errors
* Run button
* Stop button
* Language selection

If something is broken, fix the regression before finishing.

### Phase 13 — Final Cleanup

Before finishing:

* Remove debugging code.
* Remove console logs added during testing.
* Remove temporary files.
* Remove unused dependencies.
* Remove unused CSS.
* Ensure formatting is consistent.
* Ensure accessibility attributes are present where appropriate.

### Phase 14 — Final Report

Report exactly:

**Files inspected:**
List the important files inspected.

**Files changed:**
List every file modified.

**UI problems found:**
List the actual problems discovered.

**UI fixes:**
Explain what was changed.

**Functionality preserved:**
Explain what existing functionality remains unchanged.

**Build result:**
PASS / FAIL

**Testing result:**
List what was actually tested.

**Remaining issues:**
List anything that could not be fixed.

Never claim a test passed unless you actually performed it.

## Code Quality

Before changing code:

1. Inspect the project structure.
2. Identify the main IDE page/component.
3. Identify reusable UI components.
4. Identify the styling system.
5. Identify the editor component.
6. Identify the terminal/output component.

Then make targeted changes.

Do not create duplicate components when an existing component can be improved.

Keep the code clean and maintainable.

## Testing

After modifying the UI:

1. Start the application.
2. Open the IDE.
3. Test C.
4. Test C++.
5. Test Python.
6. Open files.
7. Switch files.
8. Type code.
9. Run code.
10. Stop code.
11. Enter stdin.
12. Check output.
13. Check compilation errors.
14. Check runtime errors.
15. Check loading states.
16. Check empty states.
17. Check responsive layout.

Make sure UI changes do not break existing functionality.

## Final Report

After completing the work, report:

### Changed

* List every UI change.

### Fixed

* List every UI problem fixed.

### Preserved

* List important functionality that was not changed.

### Tested

* C
* C++
* Python
* Input
* Output
* Errors
* Run
* Stop
* Responsive UI

### Remaining Issues

* Clearly list anything that could not be fixed.

Do not claim something was tested if it was not actually tested.

The final result should look like a professional educational programming IDE, not a generic dashboard.
