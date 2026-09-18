You are a senior application security engineer and security auditor.

I have an existing web-based programming IDE for students.

The IDE allows students to write and execute:

- C
- C++
- Python

The system has:

- Web frontend
- Backend API
- Code execution service
- Compiler
- Runtime processes
- Terminal
- stdin/stdout/stderr
- File management
- User accounts if implemented
- PWA
- English / Khmer UI

Your task is to perform a COMPLETE SECURITY AUDIT of the existing IDE.

IMPORTANT:

This is an authorized security audit of my own application.

Do NOT assume the application is secure.

Inspect the implementation first.

Find vulnerabilities.
Reproduce vulnerabilities safely.
Fix vulnerabilities.
Retest after every fix.

Do NOT destroy production data.
Do NOT attack external systems.
Do NOT perform destructive tests against infrastructure that is not part of this application.

==================================================
1. INSPECT FIRST
==================================================

Before changing anything, inspect:

Frontend
Backend
API
Authentication
Authorization
Database
File storage
Code execution
Compiler
Runtime
Terminal
WebSocket/SSE if used
Docker/container configuration
Process management
Environment variables
PWA
Dependencies
Nginx/reverse proxy
CORS
CSRF
Cookies
Sessions
Uploads
Downloads

Understand the complete architecture:

Student
    ↓
Frontend
    ↓
API
    ↓
Code execution service
    ↓
Compiler / Interpreter
    ↓
Sandbox
    ↓
Process
    ↓
stdout / stderr
    ↓
Terminal

Identify every trust boundary.

==================================================
2. THREAT MODEL
==================================================

Assume the attacker is an ordinary student account.

The attacker can:

- Submit arbitrary C code
- Submit arbitrary C++ code
- Submit arbitrary Python code
- Send arbitrary stdin
- Upload files
- Rename files
- Delete files
- Modify requests
- Call APIs directly
- Manipulate browser storage
- Open developer tools
- Modify HTTP requests
- Send unexpected JSON
- Send extremely large requests
- Run programs repeatedly
- Create malicious filenames
- Try to access other users' data

Determine what the attacker should and should not be able to access.

==================================================
3. CODE EXECUTION SECURITY
==================================================

This is the MOST IMPORTANT part.

Students execute arbitrary code.

Determine whether executed programs can access:

- Host filesystem
- Application source code
- Other users' files
- Database credentials
- Environment variables
- API keys
- SSH keys
- Cloud credentials
- Docker socket
- Host network
- Internal services
- Backend services
- Metadata services
- Other containers
- Other processes

A student program MUST NOT be able to escape the intended execution environment.

==================================================
4. C SECURITY TESTS
==================================================

Test safely with programs attempting to access restricted resources.

Example:

```c
#include <stdio.h>

int main() {
    FILE *f = fopen("/etc/passwd", "r");

    if (f) {
        printf("UNEXPECTED: file accessible\n");
        fclose(f);
    } else {
        printf("File access denied\n");
    }

    return 0;
}


The goal is to verify isolation.

Do not expose sensitive file contents in the final report.

==================================================
5. C++ SECURITY TEST

Test filesystem access:

#include <fstream>
#include <iostream>

int main() {
    std::ifstream file("/etc/passwd");

    if (file.is_open()) {
        std::cout << "UNEXPECTED: file accessible\n";
    } else {
        std::cout << "File access denied\n";
    }

    return 0;
}

Verify the sandbox prevents unauthorized access.

==================================================
6. PYTHON SECURITY TEST

Test:

import os

print("Current directory:", os.getcwd())

try:
    print(os.listdir("/"))
except Exception:
    print("Filesystem access restricted")

The program must not gain access to sensitive host resources.

Do not print sensitive information.

==================================================
7. ENVIRONMENT VARIABLE SECURITY

Check whether student programs can access:

Database passwords
API keys
JWT secrets
Application secrets
Cloud credentials
Service credentials
Private keys

Test safely by checking whether sensitive variables are exposed.

DO NOT print actual secrets.

Verify that execution processes receive only the environment variables they need.

Never pass the complete server environment into student programs.

==================================================
8. PROCESS ISOLATION

Determine whether student code runs:

Directly on host
Docker container
VM
Sandbox
Other isolation mechanism

If containers are used, inspect:

Privileged mode
Linux capabilities
Root user
Namespace isolation
Network access
Filesystem mounts
Docker socket
Host mounts
/proc
/sys
Device access

A student container should NOT have unnecessary privileges.

Check for dangerous configurations such as:

privileged: true

or:

/var/run/docker.sock

mounted into the execution container.

==================================================
9. CONTAINER ESCAPE REVIEW

Inspect container configuration for possible escape paths.

Check:

Privileged containers
Excessive capabilities
Host filesystem mounts
Docker socket
Host PID namespace
Host network
Host IPC
Device mappings
Writable sensitive mounts
Root execution

Do not perform destructive escape attempts.

Identify configuration weaknesses and explain how they could expose the host.

==================================================
10. NETWORK SECURITY

Determine whether student programs need network access.

If network access is NOT required:

Disable it.

Test whether C/C++/Python programs can connect to:

localhost
backend API
database
internal services
other containers
cloud metadata endpoints
arbitrary internet hosts

The execution environment should have the minimum network access required.

==================================================
11. SSRF PROTECTION

Check whether student programs or API endpoints can access internal services.

Test safely against application-owned internal endpoints.

Do NOT attack external systems.

Check whether users can access:

localhost services
internal Docker services
database ports
admin endpoints
internal APIs
==================================================
12. FILE SYSTEM ISOLATION

Each student's workspace must be isolated.

Student A must NOT access:

Student B's files.

Test path manipulation such as:

../
../../
../../../

and encoded variants.

Also test:

..
%2e%2e
%2f
..%2f

Verify server-side path validation.

Do not rely only on frontend validation.

==================================================
13. PATH TRAVERSAL

Test file operations:

Create
Read
Write
Rename
Delete
Download

with malicious paths.

Examples:

../secret.txt
../../secret.txt
../../.env
../../../etc/passwd

Also test encoded forms.

The application must reject paths outside the user's workspace.

==================================================
14. FILE UPLOAD SECURITY

If file uploads exist, test:

Large files
Empty files
Unexpected extensions
Double extensions
Special filenames
Path traversal filenames
Unicode filenames
Null-byte-like input
Executable files
Malicious archive files

Do not execute uploaded files unless intended.

Validate:

File size
File name
File type
Storage path
User ownership
==================================================
15. FILE DOWNLOAD SECURITY

Verify users can only download files they are authorized to access.

Test:

Other user's file IDs
Modified file IDs
Guessable paths
Deleted files
Unauthorized URLs

Never trust a file ID supplied by the client.

==================================================
16. AUTHENTICATION

If authentication exists, test:

Login
Logout
Session handling
Password validation
Password reset
Token expiration
Refresh tokens
Cookie security
Session fixation
Multiple sessions

Check cookies for:

HttpOnly
Secure
SameSite

where appropriate.

==================================================
17. AUTHORIZATION

Authentication means:

"Who are you?"

Authorization means:

"What are you allowed to access?"

Test:

Student A attempting to access:

Student B's files
Student B's projects
Student B's execution sessions
Admin APIs
Teacher APIs
Other users' data

Never rely on IDs from the frontend.

The backend must verify ownership/permissions.

==================================================
18. IDOR TESTING

Look for APIs such as:

/api/files/123
/api/projects/123
/api/runs/123
/api/users/123

Change IDs and test authorization.

Example:

User owns:

/files/100

Try:

/files/101
/files/102
/files/103

The server must reject unauthorized resources.

==================================================
19. API SECURITY

Inspect every API endpoint.

Check:

Authentication
Authorization
Input validation
Rate limiting
Request size limits
Error handling
HTTP methods
Content types
CORS

Test:

400
401
403
404
409
413
422
429
500

The server must handle malformed requests safely.

==================================================
20. COMMAND INJECTION

This is CRITICAL.

Inspect how the backend launches:

gcc
g++
python
shell commands
process execution

Look for unsafe patterns such as constructing shell commands from user input.

Dangerous pattern:

shell("python " + filename)

Prefer safe process APIs with argument arrays and no unnecessary shell interpretation.

Test:

Filename injection
Compiler argument injection
Command argument injection
Shell metacharacters
Environment manipulation

Do not execute destructive commands.

==================================================
21. COMPILER ARGUMENT INJECTION

Check whether users can control compiler arguments.

Ensure students cannot inject arbitrary compiler options that:

Access host files
Write outside workspace
Execute commands
Modify server configuration
Disable security restrictions

Compiler configuration should be controlled by the server.

==================================================
22. RESOURCE EXHAUSTION

Students can accidentally or intentionally consume resources.

Test safely:

CPU-heavy programs
Memory-heavy programs
Infinite loops
Huge output
Huge input
Many files
Large source files
Many executions

Implement appropriate limits:

CPU time
Wall-clock timeout
Memory
Process count
File size
Output size
Input size
Disk usage
Concurrent executions
==================================================
23. FORK / PROCESS BOMBS

Check whether the environment prevents uncontrolled process creation.

Test only inside a properly isolated sandbox.

Verify process limits exist.

The host system must remain stable.

==================================================
24. MEMORY EXHAUSTION

Test controlled memory allocation.

Verify a student's program cannot consume all server RAM.

The execution environment should have memory limits.

==================================================
25. OUTPUT FLOODING

Test:

while True:
    print("AAAAAAAAAAAAAAAAAAAAAAAA")

Verify:

Output is capped
Browser does not freeze
Server does not crash
Disk does not fill
WebSocket does not grow without limit
Process can be stopped
==================================================
26. DISK EXHAUSTION

Test whether a student can create unlimited files or extremely large files.

Verify:

Workspace quota
File size limit
Disk quota
Temporary file cleanup

A student must not be able to fill the server disk.

==================================================
27. TIMEOUT

Test:

while True:
    pass

Verify:

Timeout occurs
Process is killed
Child processes are cleaned up
Resources are released
User can run another program
==================================================
28. STOP BUTTON SECURITY

The Stop button must actually terminate the correct process.

Test:

Run A
→ Stop A

Then:

Run B
→ Stop B

Ensure:

Stop A cannot terminate another user's process.

Verify process IDs are securely associated with the authenticated user/session.

==================================================
29. PROCESS OWNERSHIP

Every execution session should have clear ownership.

Verify:

User A cannot:

Read User B's process output
Send stdin to User B's process
Stop User B's process
Access User B's execution session
==================================================
30. WEBSOCKET / SSE SECURITY

If WebSockets or SSE are used:

Check:

Authentication
Authorization
Session ownership
Connection cleanup
Origin validation where appropriate
Message validation
Resource limits

A user must not subscribe to another user's terminal session.

==================================================
31. TERMINAL INPUT SECURITY

Terminal input must be treated as DATA.

Do not pass terminal input through an unintended shell command.

Test input containing:

hello
"hello"
'hello'
;
&&
||
$
$(...)

The input must reach stdin as input, not become a backend shell command.

==================================================
32. XSS

Check all user-controlled content rendered in the UI:

File names
Project names
Usernames
Terminal output
Error messages
Program output
Uploaded metadata

Test harmless HTML strings such as:

<script>alert("test")</script>

Verify they are rendered as text rather than executed.

IMPORTANT:

Terminal output should be treated as untrusted text.

==================================================
33. TERMINAL XSS

This is especially important.

If a student's program outputs:

<script>alert("XSS")</script>

the browser must display the text.

It must NOT execute JavaScript.

Never inject raw terminal output using unsafe HTML rendering.

==================================================
34. SQL INJECTION

Inspect database queries.

Check:

Login
Search
Files
Projects
User data
Execution records

Use parameterized queries / ORM safely.

Test malformed input safely.

Do not expose database contents.

==================================================
35. CSRF

If cookie-based authentication is used, inspect CSRF protection.

Check state-changing requests:

Create
Update
Delete
Run
Stop
Upload

Verify unauthorized websites cannot perform actions on behalf of a logged-in user.

==================================================
36. CORS

Inspect CORS configuration.

Do not use:

Access-Control-Allow-Origin: *

with credentials.

Allow only the origins actually required.

==================================================
37. SECRETS

Search the project for:

Passwords
API keys
Tokens
Private keys
Database credentials
JWT secrets
Cloud credentials

Check:

Source code
Git history if available
Docker files
Compose files
.env
Frontend bundles

IMPORTANT:

Never expose secrets to the frontend.

Never put server secrets into VITE_* frontend variables.

==================================================
38. ENVIRONMENT VARIABLES

Check whether frontend environment variables accidentally expose:

Database credentials
API secrets
Private keys
Internal service credentials

Remember:

Frontend environment variables are usually visible to users.

==================================================
39. DEPENDENCY SECURITY

Inspect:

package.json
package-lock.json
composer.json
composer.lock
requirements.txt
pyproject.toml
Docker images

Check for:

Outdated dependencies
Known vulnerabilities
Unnecessary packages
Untrusted packages

Run the project's appropriate dependency audit tools.

Do not blindly upgrade major versions.

Check compatibility first.

==================================================
40. SECURITY HEADERS

Inspect HTTP response headers.

Check appropriate use of:

Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Strict-Transport-Security when HTTPS is used
Frame protection / CSP frame-ancestors

Do not add headers that break legitimate IDE functionality without testing.

==================================================
41. PWA SECURITY

Inspect:

Service worker
Cache
Manifest
Cached API responses
Authentication data
LocalStorage
IndexedDB

Do not cache sensitive authenticated data unnecessarily.

Verify logout behavior does not leave sensitive information accessible through cached pages.

==================================================
42. LOCAL STORAGE SECURITY

Inspect:

Tokens
User data
Source code
Session information
Language settings
Other stored data

Do not store highly sensitive credentials in localStorage if a safer architecture is available.

==================================================
43. ERROR MESSAGE SECURITY

Errors must not expose:

Stack traces
Server paths
Database credentials
Environment variables
Internal architecture
SQL queries
Secret tokens

Development mode may show detailed errors locally.

Production must return safe errors.

==================================================
44. RATE LIMITING

Check rate limits for:

Login
Code execution
Compile requests
API requests
File uploads
File creation
Password reset

Code execution especially needs protection against abuse.

Test repeated execution requests safely.

==================================================
45. CONCURRENT EXECUTION SECURITY

Test multiple executions.

Verify:

User isolation
Process isolation
Workspace isolation
Correct output routing
Correct process termination
No cross-user data leaks
==================================================
46. DATABASE SECURITY

Check:

Least-privilege database user
No root DB account from application
Password protection
Connection exposure
SQL injection
Sensitive data storage
Backup exposure

The database should not be directly exposed to students.

==================================================
47. DOCKER SECURITY

If Docker is used, inspect:

Dockerfile
docker-compose.yml
Container user
Capabilities
Volumes
Network
Privileged mode
Resource limits
Read-only filesystem
Temporary filesystem
Docker socket

Use least privilege.

Do not give the code execution container unnecessary access to the Docker daemon.

==================================================
48. NGINX / REVERSE PROXY

Inspect:

Exposed ports
Admin endpoints
Internal services
Static files
Directory listing
Upload paths
Proxy headers
HTTPS
Request size
Timeout configuration

Ensure internal services are not publicly exposed unnecessarily.

==================================================
49. INFORMATION DISCLOSURE

Check whether unauthenticated users can discover:

Usernames
Emails
File names
Project names
Execution IDs
Server paths
Internal IPs
Software versions
Debug information

Only expose information that is required.

==================================================
50. SECURITY REGRESSION

After every security fix:

Reproduce the original vulnerability.
Apply the fix.
Verify the vulnerability is no longer exploitable.
Test normal functionality.
Test related functionality.

Do not fix security by simply disabling the IDE.

==================================================
51. SECURITY PRIORITY

Classify findings:

CRITICAL
HIGH
MEDIUM
LOW
INFO

Examples:

CRITICAL:

Container escape
Host filesystem access
Secret exposure
Remote code execution outside sandbox
Cross-user process control

HIGH:

Cross-user file access
Command injection
Authentication bypass
Arbitrary file write
Database credential exposure

MEDIUM:

Missing authorization on non-critical endpoint
XSS with limited impact
Missing rate limiting

LOW:

Minor information disclosure
Security header improvement
==================================================
52. BUG REPORT FORMAT

For every vulnerability:

SEC-001

Title:
Severity:
Category:

Affected component:

Description:

Steps to reproduce:

Expected behavior:

Actual behavior:

Security impact:

Root cause:

Recommended fix:

Fix implemented:

Files changed:

Retest result:

Do NOT include actual passwords, API keys, tokens, or sensitive data in the report.

==================================================
53. SECURITY TEST MATRIX

Create:

Security Area	Test	Result	Severity
Authentication	Login protection	PASS/FAIL
Authorization	User isolation	PASS/FAIL
Files	Path traversal	PASS/FAIL
Files	Cross-user access	PASS/FAIL
Upload	Malicious filename	PASS/FAIL
Execution	Sandbox isolation	PASS/FAIL
Execution	Host filesystem	PASS/FAIL
Execution	Environment secrets	PASS/FAIL
Execution	Network isolation	PASS/FAIL
Execution	CPU limit	PASS/FAIL
Execution	Memory limit	PASS/FAIL
Execution	Process limit	PASS/FAIL
Execution	Output limit	PASS/FAIL
Execution	Timeout	PASS/FAIL
Terminal	stdin isolation	PASS/FAIL
Terminal	XSS	PASS/FAIL
API	IDOR	PASS/FAIL
API	Rate limiting	PASS/FAIL
API	Input validation	PASS/FAIL
API	CORS	PASS/FAIL
Web	XSS	PASS/FAIL
Web	CSRF	PASS/FAIL
Database	SQL injection	PASS/FAIL
Secrets	Secret exposure	PASS/FAIL
Docker	Privileges	PASS/FAIL
Docker	Docker socket	PASS/FAIL
PWA	Cache security	PASS/FAIL
Dependencies	Vulnerabilities	PASS/FAIL
Headers	Security headers	PASS/FAIL
==================================================
54. FINAL SECURITY REPORT

At the end provide:

Security Audit Summary

Total findings:
Critical:
High:
Medium:
Low:
Informational:

Critical Findings

List all.

High Findings

List all.

Medium Findings

List all.

Low Findings

List all.

Fixed Vulnerabilities

List each vulnerability and its fix.

Remaining Vulnerabilities

Be honest.

Code Execution Security

Explain:

Sandbox mechanism
CPU limit
Memory limit
Process limit
Timeout
Output limit
Filesystem isolation
Network isolation
Environment isolation
User Isolation

Explain how Student A is prevented from accessing Student B's:

Files
Processes
Terminal
Output
Projects
API resources
Infrastructure Security

Explain:

Docker
Nginx
Database
Environment variables
Secrets
Regression Test

Confirm:

C execution:
PASS/FAIL

C++ execution:
PASS/FAIL

Python execution:
PASS/FAIL

stdin:
PASS/FAIL

stdout:
PASS/FAIL

stderr:
PASS/FAIL

Terminal:
PASS/FAIL

Files:
PASS/FAIL

Authentication:
PASS/FAIL

PWA:
PASS/FAIL

Mobile:
PASS/FAIL

Do NOT claim the application is "100% secure".

Instead, report exactly what was tested, what was fixed, and what remains.

==================================================
MOST IMPORTANT SECURITY REQUIREMENT

This application executes UNTRUSTED STUDENT CODE.

Treat ALL student code as malicious.

The security boundary must be:

Student Code
↓
Restricted Sandbox
↓
Restricted Resources
↓
Limited CPU
↓
Limited Memory
↓
Limited Processes
↓
Limited Disk
↓
Limited Output
↓
Limited/No Network
↓
Automatic Cleanup

NEVER trust student code.

NEVER run student code with unnecessary host privileges.

NEVER expose:

Database passwords
API keys
JWT secrets
SSH keys
Docker socket
Host filesystem
Other users' files
Server environment secrets

Follow:

INSPECT
→ THREAT MODEL
→ TEST
→ REPRODUCE
→ FIX ROOT CAUSE
→ RETEST
→ REGRESSION TEST
→ FINAL SECURITY REPORT


### 🔴 The most important security areas for your IDE

For your particular IDE, I would make the agent pay special attention to these:

1. **Sandbox / container isolation** — student C/C++/Python code must not escape into your server.
2. **CPU + memory limits** — prevent infinite loops and resource exhaustion.
3. **Process limits** — prevent process bombs.
4. **Filesystem isolation** — Student A cannot read Student B's files or your `.env`.
5. **Network isolation** — student programs should only have network access if your design actually requires it.
6. **Command injection** — never construct compiler/runtime commands unsafely from student input.
7. **Terminal XSS** — program output must be treated as untrusted text.
8. **stdin security** — terminal input must go to the process as data, not accidentally become a shell command.
9. **Cross-user authorization** — one student must not control another student's execution process.
10. **Secrets** — never expose your Laravel/API/database/Docker credentials to executed programs.

For a **real student code-execution IDE**, #1–#5 are substantially more important than ordinary frontend security issues. A beautiful login page with perfect XSS protection does not compensate for a code runner that lets `python` access the host filesystem.
