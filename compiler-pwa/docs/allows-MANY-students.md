You are a senior Backend Engineer, DevOps Engineer, Performance Engineer, and Distributed Systems Engineer.

I have a web-based student programming IDE.

The application allows MANY students to use the system at the same time.

Supported programming languages:
- C
- C++
- Python

Students can:
- Login
- Create/edit files
- Save files
- Compile code
- Run code
- Provide stdin/input
- View stdout
- View stderr
- Stop running programs
- Use the terminal
- Manage their own projects/files

My main requirement is:

MAKE THIS APPLICATION SMOOTH, STABLE, AND RESPONSIVE WHEN MANY USERS USE IT AT THE SAME TIME.

Do NOT assume the current architecture is scalable.

FIRST inspect the entire existing application before changing anything.

==================================================
1. FULL ARCHITECTURE INSPECTION
==================================================

Inspect:

Frontend:
- React/Vite
- Components
- State management
- API calls
- WebSocket/SSE if used
- Terminal implementation
- Code editor
- Run/Stop behavior
- Polling
- Re-rendering
- Memory usage
- Network requests

Backend:
- API routes
- Controllers
- Services
- Database queries
- Authentication
- Authorization
- Code execution
- Process management
- WebSocket/SSE
- Queue system if present
- File storage
- Logging
- Error handling

Infrastructure:
- Docker
- Nginx
- PHP/Python/Node runtime if applicable
- Database
- Redis if present
- Queue workers
- Code execution containers/processes
- Network configuration
- CPU/memory limits

Do NOT modify code until you understand the current architecture.

Create a short architecture summary first.

==================================================
2. FIND BOTTLENECKS
==================================================

Find everything that could become a bottleneck when many students use the application simultaneously.

Check:

- CPU bottlenecks
- RAM bottlenecks
- Database bottlenecks
- Disk I/O bottlenecks
- Network bottlenecks
- Too many HTTP requests
- Too many WebSocket connections
- Too many processes
- Too many child processes
- Too many containers
- Too many database connections
- Too many file operations
- Blocking operations
- Synchronous code execution
- Long-running requests
- Memory leaks
- Frontend memory leaks
- Excessive React re-renders
- Excessive polling
- Duplicate API requests
- Large API responses
- Large terminal output
- Unbounded logs
- Unbounded queues

==================================================
3. CODE EXECUTION MUST NOT BLOCK THE WEB SERVER
==================================================

This is extremely important.

When a student runs:

C
C++
Python

the compilation/execution process must NOT block the main web server.

Do NOT allow something like:

HTTP Request
    ↓
Compile
    ↓
Run program
    ↓
Wait 30 seconds
    ↓
Return response

because many users doing this simultaneously can make the server unusable.

Instead, design the execution flow appropriately.

For example:

Student
   ↓
Frontend
   ↓
API
   ↓
Execution Job
   ↓
Queue
   ↓
Worker
   ↓
Sandbox
   ↓
Compile
   ↓
Run
   ↓
Stream stdout/stderr
   ↓
Frontend

Use the existing architecture if it already has a good implementation.

Do not introduce unnecessary technologies if they are not needed.

==================================================
4. CONCURRENT CODE EXECUTION
==================================================

Test multiple students running programs at exactly the same time.

Simulate:

10 users
25 users
50 users
100 users
250 users
500 users

if the development environment has enough resources.

Each user should be able to:

- Compile C
- Run C
- Compile C++
- Run C++
- Run Python
- Send stdin
- Receive stdout
- Receive stderr
- Stop execution

Check whether one user's execution affects another user's execution.

IMPORTANT:

User A's process must NEVER interfere with User B's process.

Check:

- Process isolation
- Filesystem isolation
- Temporary directory isolation
- Environment isolation
- stdin isolation
- stdout isolation
- stderr isolation
- Process ID ownership
- Stop-process ownership

==================================================
5. QUEUE SYSTEM
==================================================

If code execution uses a queue, inspect the queue architecture.

Check:

- Job creation
- Job status
- Queue workers
- Number of workers
- Worker concurrency
- Failed jobs
- Retry behavior
- Stuck jobs
- Duplicate jobs
- Job cancellation
- Queue overload

Prevent unlimited jobs from being created.

For example:

1000 students should not be able to create unlimited execution jobs that consume all server resources.

Implement appropriate limits if missing.

Use:

queued
running
completed
failed
cancelled
timeout

where appropriate.

==================================================
6. CPU LIMITS
==================================================

A student program must not consume all server CPU.

Test programs such as:

- Infinite loops
- Very large loops
- Heavy calculations
- Multiple processes
- Recursive programs

Make sure execution has appropriate CPU limits.

Example:

Student program
    ↓
CPU limit
    ↓
Timeout
    ↓
Kill process
    ↓
Cleanup

Do NOT allow one program to consume 100% CPU indefinitely.

==================================================
7. MEMORY LIMITS
==================================================

Test programs that allocate very large amounts of memory.

Examples:

C:
- malloc huge memory
- large arrays

C++:
- large vectors
- large strings

Python:
- huge lists
- huge dictionaries
- large byte arrays

Make sure one student's program cannot consume all server RAM.

Implement appropriate memory limits.

If memory limits already exist, verify that they actually work.

==================================================
8. PROCESS LIMITS
==================================================

Students should not be able to create unlimited processes.

Test:

- fork bombs where applicable
- subprocess creation
- child processes
- repeated process creation

Use appropriate process limits and sandbox restrictions.

==================================================
9. DISK LIMITS
==================================================

Students must not be able to fill the server disk.

Test:

- Creating huge files
- Writing continuously
- Generating large output files
- Creating many small files
- Temporary file accumulation

Implement:

- Per-user storage limits
- Per-project limits
- Execution temporary-directory limits
- Output limits
- Cleanup

==================================================
10. TERMINAL PERFORMANCE
==================================================

The terminal must remain smooth with many users.

Test:

10 users connected
50 users connected
100 users connected

and multiple users simultaneously producing output.

Prevent:

- Unlimited terminal output
- Browser freezing
- Huge DOM growth
- Memory leaks
- Excessive WebSocket messages
- Excessive API polling

Implement appropriate:

- Output buffering
- Output size limits
- Message batching
- Backpressure
- Cleanup
- Connection handling

Do NOT load millions of terminal lines into the browser.

==================================================
11. REAL-TIME CONNECTIONS
==================================================

If the IDE uses WebSocket or SSE, inspect the implementation.

Check:

- Connection authentication
- Connection ownership
- Reconnection
- Disconnect handling
- Heartbeats
- Dead connections
- Multiple connections from one user
- Connection cleanup
- Message broadcasting
- Memory usage

Make sure User A does not receive User B's terminal output.

Test:

100 simultaneous connections.

==================================================
12. DATABASE PERFORMANCE
==================================================

Inspect all database queries related to:

- Users
- Projects
- Files
- Executions
- Execution logs
- Courses
- Classes
- Permissions

Look for:

- N+1 queries
- Missing indexes
- Duplicate queries
- SELECT *
- Large queries
- Unnecessary joins
- Repeated queries
- Slow queries
- Unbounded queries

Add appropriate database indexes where necessary.

Use pagination for large datasets.

Do NOT load thousands of records unnecessarily.

==================================================
13. DATABASE CONNECTION POOL
==================================================

Check database connection management.

Make sure:

100 users
200 users
500 users

cannot exhaust the database connection limit.

Check:

- Connection pooling
- Connection reuse
- Connection leaks
- Maximum connections
- Timeout
- Queueing behavior

==================================================
14. API PERFORMANCE
==================================================

Inspect every important API endpoint.

Check:

- Response time
- Database queries
- Payload size
- Authentication overhead
- Duplicate requests
- Rate limiting
- Error handling

Identify APIs that are called too frequently.

Examples:

GET /projects
GET /files
GET /execution/status
GET /terminal/output

Do not allow unnecessary polling.

If real-time communication is appropriate, use the existing WebSocket/SSE architecture.

==================================================
15. FRONTEND PERFORMANCE
==================================================

Optimize React performance.

Check:

- Unnecessary re-renders
- Large component trees
- Large state objects
- Excessive useEffect calls
- Duplicate API calls
- Memory leaks
- Event listener cleanup
- WebSocket cleanup
- Terminal rendering
- Editor performance
- File tree performance

Make sure changing terminal output does not re-render the entire application.

Use appropriate techniques such as:

- memoization
- stable callbacks
- virtualization
- batching
- debouncing/throttling

ONLY where they provide real benefit.

Do not add optimization unnecessarily.

==================================================
16. FILE SYSTEM PERFORMANCE
==================================================

Inspect student file storage.

Check:

- File creation
- File reading
- File writing
- File deletion
- Directory traversal
- Temporary files
- Compilation files
- Cleanup

Do not scan the entire project directory repeatedly for every request.

Avoid unnecessary disk operations.

==================================================
17. COMPILATION PERFORMANCE
==================================================

C and C++ compilation can become expensive with many users.

Check:

- Compiler process creation
- Temporary files
- Compilation timeout
- Compiler output limits
- Concurrent compiler processes
- CPU usage

Prevent thousands of compiler processes from running simultaneously.

Use appropriate concurrency limits.

==================================================
18. PYTHON EXECUTION
==================================================

Check Python execution under concurrency.

Test:

- Normal Python programs
- Infinite loops
- Large memory allocation
- Large output
- Many subprocesses
- File creation
- Long-running programs

Make sure Python execution has the same resource isolation principles as C/C++.

==================================================
19. RATE LIMITING
==================================================

Prevent one student from abusing expensive operations.

Consider limits for:

- Code execution
- Compilation
- Login
- API requests
- File uploads
- Project creation
- WebSocket connections

Do NOT make limits so aggressive that normal classroom usage becomes difficult.

Use reasonable limits based on the application's actual requirements.

==================================================
20. CONCURRENCY LIMITS
==================================================

Implement appropriate limits for expensive operations.

For example:

Maximum executions running simultaneously:
    configurable

Additional executions:
    queued

This should prevent the server from becoming overloaded.

Do NOT simply reject everything when the server is busy.

Prefer:

RUN REQUEST
    ↓
QUEUE
    ↓
WAIT
    ↓
WORKER
    ↓
EXECUTION

when appropriate.

==================================================
21. BACKPRESSURE
==================================================

If many students run programs simultaneously, the system must gracefully slow down instead of crashing.

Example:

Normal load
    ↓
Normal execution

High load
    ↓
Queue jobs

Very high load
    ↓
Queue grows

Critical load
    ↓
Apply safe limits
    ↓
Return clear message

The application must remain usable.

Never allow overload to crash:

- Web server
- Database
- Redis
- Workers
- Docker
- Host machine

==================================================
22. FAILURE HANDLING
==================================================

Test:

- Database unavailable
- Redis unavailable
- Worker unavailable
- Compiler unavailable
- Container creation failure
- Process crash
- WebSocket disconnect
- Browser disconnect
- Network interruption
- Server restart

The application should recover gracefully.

Do not leave:

- Zombie processes
- Stuck jobs
- Temporary files
- Containers
- Database locks
- Queue jobs

==================================================
23. CLEANUP
==================================================

Every execution must have cleanup.

After:

- Success
- Compile error
- Runtime error
- Timeout
- Stop
- Browser disconnect
- Worker crash

clean up:

- Processes
- Temporary files
- Containers
- Pipes
- WebSocket subscriptions
- Execution records where appropriate

Verify cleanup actually happens.

==================================================
24. LOAD TESTING
==================================================

Create a safe local/staging load-test plan.

Test scenarios:

TEST 1:
10 concurrent users

TEST 2:
25 concurrent users

TEST 3:
50 concurrent users

TEST 4:
100 concurrent users

TEST 5:
250 concurrent users

TEST 6:
500 concurrent users

For each test measure:

- Requests/sec
- Average response time
- P95 response time
- P99 response time
- Error rate
- CPU usage
- RAM usage
- Database connections
- Queue length
- Worker utilization
- WebSocket connections
- Disk usage
- Execution latency

Do not claim the system supports a number of users unless the test actually demonstrates it.

==================================================
25. SPIKE TEST
==================================================

Simulate a classroom situation.

Example:

200 students are sitting in a classroom.

Teacher says:

"Run your program now."

Many students click RUN within a few seconds.

Test this traffic spike.

Check:

- API response
- Queue behavior
- Compiler load
- Worker load
- Database load
- Terminal connections
- User experience

The system should degrade gracefully rather than crash.

==================================================
26. SOAK TEST
==================================================

Run the application under sustained load.

Example:

50 concurrent users for 30-60 minutes.

Check for:

- Memory leaks
- Increasing CPU usage
- Increasing database connections
- Queue growth
- File accumulation
- Zombie processes
- WebSocket leaks
- Browser memory growth

==================================================
27. SECURITY + PERFORMANCE
==================================================

Performance improvements MUST NOT weaken security.

Never solve scalability by:

- Running student code directly on the host
- Removing sandbox restrictions
- Removing authentication
- Sharing user directories
- Sharing execution containers incorrectly
- Removing resource limits
- Exposing internal services
- Giving users excessive permissions

Student code is UNTRUSTED.

Keep strong isolation.

==================================================
28. DOCKER / CONTAINER SCALABILITY
==================================================

If Docker is used for code execution, inspect:

- Container creation overhead
- Container cleanup
- CPU limits
- Memory limits
- Process limits
- Network isolation
- Filesystem isolation
- Read-only filesystem where appropriate
- Temporary storage
- Container concurrency
- Docker daemon load

Check whether creating one container per execution is practical for the expected workload.

If there is a better architecture, explain it before changing it.

==================================================
29. NGINX / WEB SERVER
==================================================

Inspect Nginx configuration.

Check:

- Keep-alive
- Connection handling
- Request limits
- Timeout configuration
- Proxy buffering
- WebSocket support
- Upload limits
- Static file caching
- Compression where appropriate

Do not blindly change production values.

Use values appropriate for this application.

==================================================
30. LOGGING
==================================================

Make logging useful without creating a new performance problem.

Prevent:

- Logging every terminal character unnecessarily
- Unlimited execution logs
- Huge log files
- Sensitive information in logs

Use appropriate log levels.

==================================================
31. CACHING
==================================================

Identify data that can safely be cached.

Possible examples:

- Static assets
- Public configuration
- Language translations
- Non-sensitive metadata

Do NOT cache private student data incorrectly.

Do NOT introduce caching where stale data could cause correctness/security problems.

==================================================
32. FRONTEND NETWORK OPTIMIZATION
==================================================

Inspect network traffic.

Identify:

- Duplicate requests
- Requests made on every render
- Requests made too frequently
- Large payloads
- Unnecessary refreshes

Optimize carefully.

The UI should feel responsive even when the backend is busy.

==================================================
33. USER EXPERIENCE UNDER LOAD
==================================================

When the server is busy, the user should clearly see:

- Queued
- Waiting
- Running
- Completed
- Failed
- Timeout
- Cancelled

Do NOT make the UI appear frozen.

Show meaningful status messages.

Do not show fake progress.

==================================================
34. AUTOMATIC RECOVERY
==================================================

Check whether the system can recover from:

- Worker crashes
- Execution timeout
- WebSocket disconnect
- Browser refresh
- Network interruption
- Server restart

A student's project/files should not be lost unnecessarily.

==================================================
35. IMPLEMENT IMPROVEMENTS
==================================================

After inspection and testing:

1. Identify bottlenecks.
2. Rank them by impact.
3. Fix the highest-impact problems.
4. Do not rewrite the whole application unnecessarily.
5. Preserve existing functionality.
6. Preserve existing UI unless changes are required.
7. Do not break C/C++/Python execution.
8. Do not weaken security.
9. Do not introduce unnecessary dependencies.

==================================================
36. BEFORE/AFTER MEASUREMENTS
==================================================

For every major performance improvement, measure:

BEFORE:
- Response time
- CPU
- RAM
- Database load
- Execution latency

AFTER:
- Response time
- CPU
- RAM
- Database load
- Execution latency

Show measurable improvements where possible.

==================================================
37. FINAL ACCEPTANCE TEST
==================================================

After making changes, verify:

[ ] Single user works
[ ] 10 concurrent users work
[ ] 25 concurrent users work
[ ] 50 concurrent users work
[ ] 100 concurrent users work
[ ] Higher load is handled gracefully
[ ] C execution works
[ ] C++ execution works
[ ] Python execution works
[ ] stdin works
[ ] stdout works
[ ] stderr works
[ ] Stop works
[ ] Timeout works
[ ] Multiple executions work
[ ] User isolation works
[ ] Files remain isolated
[ ] Terminal remains responsive
[ ] Database remains stable
[ ] No obvious memory leaks
[ ] No zombie processes
[ ] Temporary files are cleaned
[ ] WebSocket connections are cleaned
[ ] Queue works correctly
[ ] Worker failures are handled
[ ] Security restrictions remain active
[ ] No existing major functionality is broken

==================================================
38. FINAL REPORT
==================================================

At the end, give me a concise but detailed report:

1. Current architecture
2. Main bottlenecks found
3. Problems found
4. Changes made
5. Files changed
6. Database changes
7. Infrastructure changes
8. Queue/worker changes
9. Code execution changes
10. Frontend performance changes
11. Security considerations
12. Load-test results
13. Before/after measurements
14. Remaining bottlenecks
15. Recommended production configuration
16. Estimated tested concurrent-user capacity

IMPORTANT:

Do NOT say:

"100% scalable"
"100% secure"
"Supports unlimited users"

unless this can actually be proven.

Instead report measured results, for example:

"Tested successfully with 100 concurrent users in the staging environment."

Also clearly distinguish:

- Tested capacity
- Estimated capacity
- Theoretical capacity

Do NOT hide failures.

If a test fails, report the failure and explain the root cause.

Most importantly:

MAKE THE APPLICATION REMAIN STABLE WHEN MANY STUDENTS RUN C, C++, AND PYTHON PROGRAMS AT THE SAME TIME.

The primary goal is:

Many Students
      ↓
Web Application
      ↓
Queue / Workers
      ↓
Isolated Execution
      ↓
Controlled CPU/RAM/Processes/Disk
      ↓
Stable Server
      ↓
Responsive IDE

Inspect first.
Measure first.
Then optimize.
Then test again.
