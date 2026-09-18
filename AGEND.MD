# AGENTS.md

# Online Compiler PWA — AI Development Instructions

## 1. Project Overview

You are an AI software development agent working on an **Online Code Compiler and Code Execution Platform**.

The application must allow users to write, save, compile, and execute programming code directly from a web application that can also be installed as a **Progressive Web App (PWA)** on Android, iOS, tablets, and desktop devices.

The initial supported programming languages are:

* C
* C++
* Python

The system must be designed with security, scalability, maintainability, and mobile responsiveness in mind.

The application should feel like a lightweight online IDE similar to platforms such as:

* OnlineGDB
* Programiz
* Replit
* CodePen-style playgrounds

However, this project must have its own clean UI/UX and architecture.

---

# 2. Main Objective

Build a secure online compiler platform with this workflow:

```text
User
  ↓
PWA Frontend
  ↓
REST API
  ↓
Authentication / Validation
  ↓
Execution Queue
  ↓
Docker Sandbox
  ↓
Compiler / Runtime
  ↓
Execution Result
  ↓
Frontend Terminal
```

Users should be able to:

1. Register
2. Login
3. Create projects
4. Create files
5. Edit source code
6. Select programming language
7. Provide standard input
8. Run code
9. View compilation errors
10. View runtime errors
11. View program output
12. Save code
13. View execution history
14. Delete or rename projects/files
15. Install the application as a PWA

---

# 3. Technology Stack

Use the following technologies unless there is a strong technical reason to change them.

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Monaco Editor
* React Router
* Axios
* PWA support using `vite-plugin-pwa`

## Backend

* Laravel 12
* PHP 8.3+
* Laravel Sanctum
* MySQL
* Redis
* Laravel Queue

## Code Execution

Use Docker containers as isolated execution environments.

Supported languages:

```text
C      → GCC
C++    → G++
Python → Python 3
```

## Infrastructure

* Docker
* Docker Compose
* Nginx
* Redis
* MySQL

## Development Environment

The entire project should be runnable with Docker Compose.

---

# 4. High-Level Architecture

Use this architecture:

```text
                    ┌──────────────────────┐
                    │      PWA Client      │
                    │                      │
                    │ React + TypeScript   │
                    │ Monaco Editor        │
                    │ Tailwind CSS         │
                    └──────────┬───────────┘
                               │
                               │ HTTPS / REST API
                               ▼
                    ┌──────────────────────┐
                    │    Laravel API       │
                    │                      │
                    │ Authentication       │
                    │ Projects              │
                    │ Files                 │
                    │ Executions            │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Redis Queue        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Execution Worker    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │ C        │     │ C++      │     │ Python   │
        │ Sandbox  │     │ Sandbox  │     │ Sandbox  │
        │ GCC      │     │ G++      │     │ Python 3 │
        └──────────┘     └──────────┘     └──────────┘
```

---

# 5. Critical Security Requirement

## NEVER execute user code directly on the host server.

Never use unsafe patterns such as:

```php
shell_exec($userCode);
exec($userCode);
system($userCode);
passthru($userCode);
```

Do not execute arbitrary user input directly on the Laravel host.

All user code must execute inside a restricted Docker sandbox.

---

# 6. Docker Sandbox Requirements

Every code execution must run inside an isolated container.

The execution environment should have:

* CPU limits
* Memory limits
* Execution timeout
* Process limits
* File-size limits
* Output-size limits
* Network disabled
* Non-root execution
* Temporary filesystem
* Read-only base filesystem where practical
* No access to host filesystem
* No Docker socket access
* Container cleanup after execution

Example conceptual limits:

```text
CPU:
0.5–1 CPU

Memory:
128 MB

Execution timeout:
5 seconds

Maximum output:
1 MB

Network:
Disabled

Container:
Temporary
```

These are initial defaults and should be configurable.

---

# 7. Supported Languages

## C

Compiler:

```text
GCC
```

Example conceptual execution:

```bash
gcc main.c -o main
./main
```

## C++

Compiler:

```text
G++
```

Example conceptual execution:

```bash
g++ main.cpp -o main
./main
```

## Python

Runtime:

```text
Python 3
```

Example:

```bash
python3 main.py
```

The architecture should make it easy to add additional languages later.

Possible future languages:

```text
Java
JavaScript
TypeScript
Go
Rust
PHP
C#
Kotlin
```

Do not implement these languages during the initial phase unless explicitly requested.

---

# 8. Project Structure

Use the following structure:

```text
compiler-pwa/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   ├── Terminal/
│   │   │   ├── FileExplorer/
│   │   │   ├── LanguageSelector/
│   │   │   ├── Navbar/
│   │   │   └── Loading/
│   │   │
│   │   ├── pages/
│   │   │   ├── Home/
│   │   │   ├── Login/
│   │   │   ├── Register/
│   │   │   ├── Dashboard/
│   │   │   ├── Projects/
│   │   │   └── Editor/
│   │   │
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── router/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── public/
│   │   ├── icons/
│   │   └── manifest/
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/
│   └── Laravel application
│
├── executor/
│   ├── c/
│   │   └── Dockerfile
│   │
│   ├── cpp/
│   │   └── Dockerfile
│   │
│   └── python/
│       └── Dockerfile
│
├── docker/
│   ├── nginx/
│   └── mysql/
│
├── docker-compose.yml
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── security.md
│   └── deployment.md
│
├── AGENTS.md
└── README.md
```

---

# 9. Database Design

Use MySQL.

Main tables:

```text
users
projects
files
languages
executions
```

## users

```text
id
name
email
password
created_at
updated_at
```

## projects

```text
id
user_id
name
description
created_at
updated_at
```

Relationship:

```text
User 1 ──────── N Projects
```

## files

```text
id
project_id
filename
language
content
created_at
updated_at
```

Relationship:

```text
Project 1 ──────── N Files
```

## languages

```text
id
name
slug
version
docker_image
compile_command
run_command
is_active
created_at
updated_at
```

## executions

```text
id
user_id
project_id
file_id
language_id
status
source_code
stdin
stdout
stderr
exit_code
execution_time
memory_usage
created_at
updated_at
```

Possible statuses:

```text
queued
running
success
compile_error
runtime_error
timeout
memory_limit
system_error
failed
```

---

# 10. API Design

Use RESTful API architecture.

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Projects

```http
GET    /api/projects
POST   /api/projects
GET    /api/projects/{id}
PUT    /api/projects/{id}
DELETE /api/projects/{id}
```

## Files

```http
GET    /api/projects/{project}/files
POST   /api/projects/{project}/files
GET    /api/files/{id}
PUT    /api/files/{id}
DELETE /api/files/{id}
```

## Languages

```http
GET /api/languages
```

## Execution

```http
POST /api/execute
GET  /api/executions/{id}
GET  /api/executions
```

---

# 11. Execute API

The frontend should send:

```json
{
    "language": "cpp",
    "project_id": 1,
    "file_id": 1,
    "code": "#include <iostream>\nint main(){std::cout << \"Hello\";}",
    "stdin": ""
}
```

The API should validate:

```text
language
project_id
file_id
code
stdin
```

Never trust client-side validation alone.

---

# 12. Execution Response

Return a predictable response:

```json
{
    "id": 123,
    "status": "success",
    "stdout": "Hello",
    "stderr": "",
    "exit_code": 0,
    "execution_time": 0.03,
    "memory_usage": 10240
}
```

For compilation errors:

```json
{
    "id": 124,
    "status": "compile_error",
    "stdout": "",
    "stderr": "error: expected ';'",
    "exit_code": 1
}
```

For timeout:

```json
{
    "id": 125,
    "status": "timeout",
    "stdout": "",
    "stderr": "Execution timed out",
    "exit_code": null
}
```

---

# 13. Queue Architecture

Do not block the HTTP request while running potentially expensive code.

Use:

```text
POST /execute
       ↓
Create execution
       ↓
Status = queued
       ↓
Redis Queue
       ↓
Worker
       ↓
Docker Sandbox
       ↓
Update execution
```

The frontend can either:

```text
poll execution status
```

or use a future real-time mechanism.

For the initial implementation, polling is acceptable.

---

# 14. Frontend UI

The UI should be clean, professional, modern, and developer-focused.

Main editor layout:

```text
┌─────────────────────────────────────────────┐
│ CodeRunner                  Run ▶   Save     │
├────────────┬────────────────────────────────┤
│ FILES      │ main.cpp                       │
│            │                                │
│ 📁 Project │ #include <iostream>            │
│ ├ main.cpp │                                │
│ ├ test.cpp │ int main() {                   │
│ └ input    │     std::cout << "Hello";      │
│            │ }                              │
├────────────┴────────────────────────────────┤
│ INPUT                                       │
│                                             │
├─────────────────────────────────────────────┤
│ OUTPUT                                      │
│                                             │
│ Hello World                                 │
│                                             │
│ Execution time: 0.03s                       │
└─────────────────────────────────────────────┘
```

---

# 15. Responsive Design

The application must work on:

```text
Desktop
Laptop
Tablet
Android
iPhone
```

Desktop:

```text
File Explorer | Code Editor
              | Terminal
```

Mobile:

```text
Navbar
Language
Editor
Input
Output
```

On small screens:

* Use bottom navigation or tabs
* Make Run button easily accessible
* Avoid horizontal page overflow
* Make Monaco Editor responsive
* Make terminal readable
* Support touch interactions

---

# 16. PWA Requirements

The frontend must be installable as a PWA.

Implement:

```text
Web App Manifest
Service Worker
App Icons
Offline asset caching
Installable application
Standalone display mode
Responsive layout
```

Manifest should include:

```text
name
short_name
description
start_url
display
theme_color
background_color
icons
```

The PWA should work on:

```text
Android Chrome
iOS Safari
Desktop Chrome
Desktop Edge
Desktop Safari
```

Important:

The PWA does not need to execute C/C++/Python locally in the initial version.

Code execution should happen on the backend.

---

# 17. Monaco Editor

Use Monaco Editor as the main code editor.

Configure language mappings:

```text
.c      → c
.cpp    → cpp
.cc     → cpp
.cxx    → cpp
.py     → python
```

Enable:

* syntax highlighting
* line numbers
* minimap on desktop
* code folding
* autocomplete where supported
* dark/light theme
* keyboard shortcuts
* automatic indentation

Do not overload the editor with unnecessary extensions.

---

# 18. Code Editor Features

Initial version:

```text
Open file
Edit file
Save file
Create file
Delete file
Rename file
Run code
Clear output
Copy output
```

Future:

```text
Multiple tabs
Search
Replace
Format code
Keyboard shortcuts
Command palette
Git integration
```

---

# 19. Terminal / Output

The output panel must clearly distinguish:

```text
STDOUT
STDERR
COMPILE ERROR
RUNTIME ERROR
TIMEOUT
```

Example:

```text
OUTPUT

Hello World

-------------------------
Status: Success
Time: 0.03s
Memory: 12 MB
```

For errors:

```text
COMPILATION ERROR

main.cpp:5:10:
error: expected ';'
```

Use readable monospace fonts.

---

# 20. Authentication

Use Laravel Sanctum.

Users must be able to:

```text
Register
Login
Logout
View profile
```

Protected routes:

```text
/projects
/files
/execute
/executions
```

Users must only access their own projects and files.

Never trust a `user_id` supplied by the frontend.

Always derive the authenticated user from the server-side authentication context.

---

# 21. Authorization

A user must never be able to:

```text
View another user's project
Edit another user's file
Delete another user's project
View another user's execution
```

Use Laravel Policies or equivalent authorization mechanisms.

---

# 22. Validation

Validate all incoming data.

Example:

```text
language:
required
must exist
must be active

code:
required
string
maximum size

stdin:
nullable
string
maximum size
```

Never allow unlimited:

```text
source code
stdin
stdout
stderr
files
```

---

# 23. Error Handling

Handle:

```text
Validation errors
Authentication errors
Authorization errors
Compilation errors
Runtime errors
Timeouts
Memory limits
Docker errors
Queue errors
Database errors
Network errors
```

Return consistent API responses.

Example:

```json
{
    "success": false,
    "message": "Execution timed out",
    "data": null
}
```

---

# 24. Logging

Log important system events.

Examples:

```text
execution created
execution started
execution completed
execution timeout
execution failed
docker failure
queue failure
authentication failure
```

Never log:

```text
passwords
authentication tokens
sensitive credentials
```

Be careful with logging user source code because source code may contain sensitive information.

---

# 25. Rate Limiting

Execution endpoints must be rate-limited.

For example:

```text
User:
maximum executions per minute
maximum executions per hour
```

Do not allow one user to overload the execution infrastructure.

The exact limits should be configurable.

---

# 26. Resource Protection

Protect the server from:

```text
fork bombs
infinite loops
memory exhaustion
huge output
huge source files
disk exhaustion
network abuse
CPU exhaustion
process spawning
```

The sandbox must be designed assuming that submitted code is malicious.

---

# 27. Docker Rules

Never mount:

```text
/
```

or sensitive host directories into user execution containers.

Never expose:

```text
/var/run/docker.sock
```

to user code.

Never allow containers to access the Docker daemon.

Disable network access for execution containers unless a future feature explicitly requires it.

---

# 28. Development Workflow

Implement the project incrementally.

## Phase 1

Create:

```text
React + TypeScript + Vite
Laravel API
MySQL
Docker Compose
```

Verify that all services communicate correctly.

## Phase 2

Implement:

```text
Authentication
Users
Projects
Files
```

## Phase 3

Implement:

```text
Docker C executor
Docker C++ executor
Docker Python executor
```

## Phase 4

Implement:

```text
Execution API
Redis Queue
Execution Worker
```

## Phase 5

Implement:

```text
Monaco Editor
Run button
Input panel
Output terminal
```

## Phase 6

Implement:

```text
PWA
Responsive mobile UI
Install support
```

## Phase 7

Implement:

```text
Execution history
Improved error handling
Rate limiting
Security hardening
```

---

# 29. Coding Standards

## React

Use:

```text
Functional Components
TypeScript
Hooks
Reusable Components
Custom Hooks
```

Avoid unnecessary:

```text
any
global state
duplicated components
large components
```

Prefer:

```text
types/interfaces
strict TypeScript
small reusable components
```

---

# 30. Laravel Standards

Use:

```text
Controllers
Form Requests
Resources
Policies
Services
Jobs
Events where useful
Repositories only when justified
```

Do not put complex execution logic directly inside controllers.

Prefer:

```text
ExecutionController
      ↓
ExecutionService
      ↓
ExecutionJob
      ↓
DockerExecutor
```

---

# 31. Service Layer

Create a dedicated execution service.

Conceptually:

```text
ExecutionController
        ↓
ExecutionService
        ↓
ExecutionJob
        ↓
DockerExecutionService
        ↓
Docker
```

This makes the system easier to test and extend.

---

# 32. Language Configuration

Do not hard-code compiler logic throughout the application.

Use a language configuration model.

Example:

```text
C
slug: c
docker_image: compiler-c
compile_command: gcc
run_command: ./main
```

```text
C++
slug: cpp
docker_image: compiler-cpp
compile_command: g++
run_command: ./main
```

```text
Python
slug: python
docker_image: runtime-python
compile_command: null
run_command: python3
```

This allows future languages to be added without rewriting the execution architecture.

---

# 33. Testing

Write tests for:

## Backend

```text
Authentication
Authorization
Project CRUD
File CRUD
Execution API
Validation
Queue jobs
Execution status
Rate limiting
```

## Frontend

Test:

```text
Login
Project creation
File creation
Editor
Run button
Output
Error states
Mobile layout
```

## Security

Test:

```text
Infinite loops
Large output
Large input
Invalid language
Unauthorized project access
Unauthorized file access
Execution timeout
Memory limit
```

---

# 34. Git Workflow

Use meaningful commits.

Examples:

```text
feat: create Laravel API
feat: add authentication
feat: add project management
feat: add Monaco editor
feat: add C executor
feat: add C++ executor
feat: add Python executor
feat: add execution queue
feat: add PWA support
fix: prevent unauthorized project access
fix: handle execution timeout
security: restrict Docker execution
```

Do not create giant commits containing unrelated features.

---

# 35. Environment Variables

Never hard-code secrets.

Use `.env`.

Examples:

```env
APP_NAME="ETEC STUDIO"

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=compiler
DB_USERNAME=root
DB_PASSWORD=

REDIS_HOST=redis
REDIS_PORT=6379

EXECUTION_TIMEOUT=5
EXECUTION_MEMORY_LIMIT=128M
EXECUTION_OUTPUT_LIMIT=1M
```

Frontend environment:

```env
VITE_API_URL=
```

Never commit:

```text
.env
passwords
API keys
tokens
private credentials
```

Provide:

```text
.env.example
```

---

# 36. Docker Compose

The development environment should contain services similar to:

```text
frontend
backend
nginx
mysql
redis
worker
```

The execution containers should be created dynamically by the execution system and must not expose compiler services publicly.

---

# 37. UI/UX Principles

The UI should be:

```text
Clean
Modern
Professional
Minimal
Fast
Developer-focused
Mobile-friendly
Accessible
```

Avoid:

```text
Unnecessary gradients
Excessive animations
Huge shadows
Too many colors
Cluttered interfaces
```

Prioritize:

```text
Code
Run
Output
Files
Projects
```

The editor should always be the primary focus.

---

# 38. Performance

Optimize:

```text
Frontend bundle
API responses
Database queries
Docker startup
Queue processing
Editor loading
PWA caching
```

Do not load unnecessary data.

Use pagination for:

```text
Projects
Executions
```

Avoid returning full source code when it is not required.

---

# 39. Accessibility

Support:

```text
Keyboard navigation
Focus states
Readable contrast
ARIA labels where needed
Accessible buttons
Accessible form inputs
```

The application should remain usable without a mouse on desktop.

---

# 40. Mobile UX

The mobile version is important.

Support:

```text
Touch-friendly buttons
Large Run button
Responsive editor
Bottom sheets
Scrollable terminal
Responsive file explorer
Mobile navigation
```

Do not simply shrink the desktop UI.

Design mobile-specific layouts where necessary.

---

# 41. Offline PWA Behavior

When offline:

Users should still be able to:

```text
Open the application shell
View cached UI
Navigate cached pages where possible
```

When offline:

```text
Code execution
API requests requiring server
Authentication requests
```

may be unavailable.

Display a clear message:

```text
You are offline.
Code execution requires an internet connection.
```

---

# 42. Future Features

Do not implement these in the first MVP unless explicitly requested:

```text
Real-time collaboration
AI code assistant
GitHub integration
Debugger
Breakpoints
WebSocket terminal
Code sharing
Public profiles
Leaderboards
Competitive programming
Package installation
External network access
Full Linux terminal
```

The architecture should leave room for these features later.

---

# 43. AI Agent Rules

When modifying the project:

1. Inspect the existing code before making changes.
2. Do not overwrite working code unnecessarily.
3. Follow the existing architecture.
4. Keep changes focused.
5. Do not introduce unnecessary dependencies.
6. Explain significant architectural changes.
7. Maintain TypeScript strictness.
8. Validate all backend inputs.
9. Treat user code as malicious.
10. Never execute user code directly on the host.
11. Never expose Docker credentials or sockets.
12. Add tests for important functionality.
13. Update documentation when architecture changes.
14. Keep API responses consistent.
15. Prefer reusable services/components.
16. Do not duplicate business logic.
17. Never hard-code secrets.
18. Never trust client-provided user IDs.
19. Enforce authorization server-side.
20. Prioritize security over convenience.

---

# 44. Definition of Done

A feature is considered complete only when:

```text
Implementation
    +
Validation
    +
Error Handling
    +
Security
    +
Testing
    +
Documentation
```

are completed.

For example, "C execution support" is not complete simply because GCC works.

It must also include:

```text
Docker isolation
Timeout
Memory limit
Output limit
Error handling
Queue support
Database execution record
API response
Frontend output
Security validation
Tests
```

---

# 45. MVP Definition

The first production-style MVP must support:

```text
✓ Register
✓ Login
✓ Logout

✓ Create project
✓ Edit project
✓ Delete project

✓ Create file
✓ Edit file
✓ Delete file
✓ Rename file

✓ Monaco Editor

✓ C
✓ C++
✓ Python

✓ Compile
✓ Execute
✓ Standard input
✓ Standard output
✓ Standard error

✓ Compilation errors
✓ Runtime errors
✓ Timeout

✓ Docker sandbox

✓ Redis queue

✓ Execution history

✓ Responsive UI

✓ PWA installation

✓ Android support
✓ iOS support
✓ Desktop support
```

---

# 46. Final Development Principle

The most important principle of this project is:

```text
SECURITY FIRST
```

The application executes arbitrary code submitted by users.

Therefore, always assume:

```text
User code can be malicious.
```

Never trust:

```text
source code
filename
language
stdin
project ID
file ID
user ID
execution parameters
```

Everything must be validated and authorized.

The final system should be:

```text
Secure
Scalable
Maintainable
Testable
Responsive
Installable
Developer-friendly
```

Build the system incrementally and verify each phase before moving to the next phase.
