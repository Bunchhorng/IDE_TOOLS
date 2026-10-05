URGENT PRODUCTION BUG — MOBILE CODE EXECUTION

My production application is deployed at etcstudio.online.

Tech stack:
- Laravel backend/API
- ReactJS frontend
- Python code execution/runtime
- PWA
- The application is accessed from mobile phones
- The app has a code editor and runs user Python code through a sandbox

PROBLEM:
Previously, Python code execution worked correctly on mobile.
Now when I press the Run button, the UI shows:

"System Error"
"The sandbox failed to run the program. Please try again"
"Couldn't run your code right now."

This happens in production.

IMPORTANT:
Do NOT just hide the error or change the frontend message.
Find and FIX the actual root cause.

Please investigate the entire execution flow:

React/PWA
    ↓
Laravel API
    ↓
Python execution service/sandbox
    ↓
Python runtime
    ↓
stdout/stderr/result
    ↓
Laravel API
    ↓
React output panel

TASK 1 — REPRODUCE AND TRACE THE ERROR

Inspect the Run Code implementation in the React frontend.

Find:
- API endpoint called when Run is pressed
- HTTP method
- request payload
- authentication headers/token
- timeout
- response handling
- error handling
- service worker/PWA behavior

Then inspect the corresponding Laravel route/controller/service/job.

Then inspect the Python execution/sandbox implementation.

Trace one complete request from the browser to the Python runtime.

Add temporary structured logging if necessary.

DO NOT expose secrets, tokens, passwords, or user code in logs.

TASK 2 — CHECK PRODUCTION RUNTIME

Check whether the Python runtime actually exists and can execute in production.

Verify:

- Python version
- Python executable path
- virtual environment path
- required Python packages
- subprocess permissions
- working directory
- temporary directory permissions
- ability to create temporary files
- ability to execute child processes
- PHP/Laravel user permissions
- process limits
- memory limits
- CPU limits
- execution timeout
- disk space
- inode availability
- open file/process limits
- SELinux/AppArmor restrictions if applicable
- Docker/container restrictions if applicable
- server firewall/network restrictions
- PHP-FPM permissions
- queue worker status if execution uses queues
- supervisor/systemd process status if applicable

Test Python directly from the production server.

For example:

python3 --version
which python3
python3 -c "print('python runtime OK')"

Also test execution using the SAME Linux user/process that Laravel uses.

Do not assume that Python working from SSH means Laravel can execute it.

TASK 3 — CHECK TEMP DIRECTORY / SANDBOX

The error specifically says the sandbox failed.

Find the code responsible for creating/running the sandbox.

Verify that production can:

1. create a temporary directory
2. write a Python file
3. execute the Python file
4. capture stdout
5. capture stderr
6. capture exit code
7. delete the temporary directory

Test this using the Laravel process user.

Make sure the temporary directory is writable.

Check whether production recently changed:
- PHP version
- Laravel version
- Python version
- OS
- Docker image
- server permissions
- deployment configuration
- environment variables
- security policies
- hosting configuration

TASK 4 — CHECK ENVIRONMENT VARIABLES

Compare production .env/config with the environment where it previously worked.

Look for variables related to:

PYTHON
PYTHON_PATH
PYTHON_BIN
PYTHON_EXECUTABLE
SANDBOX
EXECUTION
CODE_EXECUTION
TEMP_DIR
QUEUE
REDIS
DOCKER
EXECUTION_TIMEOUT
MEMORY_LIMIT
API_URL

Do not print secret values.

After changing Laravel configuration, remember to clear/rebuild cached configuration appropriately.

TASK 5 — CHECK LARAVEL

Inspect:

- routes/api.php
- relevant controllers
- services
- jobs
- queue workers
- Process/Symfony Process usage
- shell_exec/exec/proc_open usage
- Python execution service
- exception handling
- storage permissions
- logs

Check:

storage/logs/laravel.log

Look for the exact exception immediately after pressing Run.

Do not convert the real exception into the generic:

"Sandbox failed"

until the original error has been logged.

Improve error handling so the backend records:

- exception class
- safe error message
- exit code
- timeout status
- stderr
- execution duration
- sandbox creation failure
- Python executable failure

Never log passwords, API keys, authentication tokens, or sensitive user data.

TASK 6 — CHECK QUEUE WORKERS

If Python execution uses Laravel queues:

- verify queue worker is running
- verify the correct queue is being consumed
- check failed_jobs
- check Redis/database connectivity
- check worker PHP version
- restart workers safely after deployment
- verify supervisor/systemd configuration

Do not simply restart workers and call the problem fixed.
Determine why the worker stopped or why execution started failing.

TASK 7 — CHECK REACT/PWA

Because this application is a PWA and the issue is being observed on mobile:

Check whether a stale service worker is serving an old frontend bundle or old API configuration.

Inspect:

- service-worker registration
- cache names/versioning
- Workbox configuration if used
- API base URL
- cached JS bundles
- fetch handlers
- offline fallback
- request interception

Make sure API requests to the code execution endpoint are NOT being incorrectly cached.

Code execution requests should generally use network requests and should not return stale cached execution results.

Implement proper PWA cache versioning.

However, do NOT assume the PWA is the root cause until the API is tested directly.

TASK 8 — TEST THE API WITHOUT THE PWA

This is very important.

Call the production execution API directly using an HTTP client such as curl/Postman/browser dev tools.

Use a minimal safe test program such as:

print("hello production")

Determine whether:

A) API itself fails
B) Laravel succeeds but Python sandbox fails
C) Python succeeds but Laravel response fails
D) API succeeds but React/PWA displays an error

This will isolate the layer causing the problem.

TASK 9 — MOBILE NETWORK / CORS

Verify production API communication from mobile:

- HTTPS
- CORS
- preflight OPTIONS
- authentication
- cookies
- SameSite configuration
- CSRF configuration where applicable
- API domain
- reverse proxy
- Cloudflare/proxy configuration
- request timeout

But do NOT change CORS blindly.
Only modify it if browser/network inspection proves that CORS is actually failing.

TASK 10 — PRODUCTION HARDENING

Once the root cause is found, make the execution system production-safe.

Requirements:

- never execute arbitrary code directly inside the Laravel/PHP process
- enforce execution timeout
- enforce memory limits
- enforce CPU/process limits
- isolate temporary files
- clean up temporary files
- restrict filesystem access
- prevent access to application secrets
- prevent access to .env
- prevent access to internal services
- prevent network abuse if network access is not required
- limit output size
- limit source-code size
- kill child processes after timeout
- correctly handle SIGTERM/SIGKILL
- prevent fork bombs/process exhaustion
- return structured JSON errors
- avoid exposing server internals to users

If Docker is used for the sandbox, verify the container image and runtime are available and healthy.

If Docker is NOT currently used, recommend a secure production architecture for running untrusted Python code rather than simply using PHP exec().

TASK 11 — DO NOT BREAK EXISTING FEATURES

Before changing anything:

- inspect the existing architecture
- understand the current implementation
- preserve existing API contracts where possible
- don't rewrite the entire application
- don't replace working Laravel/React code unnecessarily
- don't remove authentication
- don't disable security restrictions just to make execution work

TASK 12 — CREATE A DIAGNOSTIC HEALTH CHECK

Add an admin-only/system health check that verifies:

Laravel API:
OK/FAIL

Python runtime:
OK/FAIL

Python executable:
OK/FAIL

Sandbox directory:
OK/FAIL

Temporary file creation:
OK/FAIL

Python execution:
OK/FAIL

Queue worker:
OK/FAIL

Redis/database:
OK/FAIL

Docker/container runtime if applicable:
OK/FAIL

Disk space:
OK/FAIL

Memory:
OK/FAIL

This health check must NOT expose sensitive information to normal users.

TASK 13 — FINAL FIX

After identifying the root cause:

1. Fix the underlying production issue.
2. Test Python execution directly on the server.
3. Test through Laravel API.
4. Test from desktop browser.
5. Test from Android/iPhone browser.
6. Test installed PWA.
7. Test multiple Python programs.
8. Test timeout handling.
9. Test invalid Python code.
10. Test large output.
11. Test concurrent executions.
12. Verify logs contain useful diagnostics.
13. Verify no secrets are exposed.
14. Verify PWA cache is updated correctly.

IMPORTANT:
Do not tell me "try again" as the solution.

I need the actual root cause.

At the end, give me a concise report:

ROOT CAUSE:
...

FILES CHANGED:
...

SERVER CONFIGURATION CHANGED:
...

COMMANDS RUN:
...

WHY IT WORKED BEFORE:
...

WHY IT FAILED NOW:
...

PRODUCTION FIX:
...

SECURITY IMPROVEMENTS:
...

TEST RESULTS:
...

If you cannot access the production server/runtime, clearly tell me exactly which server logs, files, commands, or configuration values you need me to provide rather than guessing.
