# API Reference

Base URL: `/api`

Authentication: Sanctum Bearer token (`Authorization: Bearer <token>`).

## Standard response envelope

```json
{ "success": true, "message": "...", "data": { } }
```

## Auth

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/register` | Create account. Body: `name, email, password, password_confirmation` |
| POST | `/api/auth/login` | Sign in. Body: `email, password` |
| POST | `/api/auth/logout` | Revoke current token (auth required) |
| GET  | `/api/auth/me` | Current user (auth required) |

## Projects (auth required)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET    | `/api/projects` | Paginated list of user's projects |
| POST   | `/api/projects` | Create. Body: `name`, `description?` |
| GET    | `/api/projects/{id}` | Show project + files |
| PUT    | `/api/projects/{id}` | Update |
| DELETE | `/api/projects/{id}` | Delete |

## Files (auth required)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET    | `/api/projects/{project}/files` | List files in project |
| POST   | `/api/projects/{project}/files` | Create. Body: `filename`, `language`, `content?`, `folder_id?` |
| GET    | `/api/files/{id}` | Show file |
| PUT    | `/api/files/{id}` | Update `filename`/`language`/`content`/`folder_id` |
| DELETE | `/api/files/{id}` | Delete |

## Folders (auth required)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET    | `/api/projects/{project}/folders` | List folders in project (flat) |
| POST   | `/api/projects/{project}/folders` | Create. Body: `name`, `parent_id?` |
| GET    | `/api/folders/{id}` | Show folder |
| PUT    | `/api/folders/{id}` | Update `name` and/or `parent_id` (move) |
| DELETE | `/api/folders/{id}` | Delete folder, its subfolders and their files (cascade) |

## Languages

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET    | `/api/languages` | Active languages (public) |

## Execution (auth required)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/execute` | Queue an execution |
| GET  | `/api/executions` | Paginated execution history |
| GET  | `/api/executions/{id}` | Poll execution status/result |

### POST /api/execute

```json
{
  "language": "cpp",
  "project_id": 1,
  "file_id": 1,
  "code": "#include <iostream>\nint main() { std::cout << \"hi\"; }",
  "stdin": "",
  "interactive": false
}
```

`interactive: true` creates an execution that is *not* queued — it is started on demand by `POST /api/executions/{id}/interactive/start` and driven through the interactive endpoints below. Default (`false`/omitted) is the batch path: queue the execution with `status: "queued"`, then poll `GET /api/executions/{id}` until status is terminal.

### Execution statuses

`queued`, `running`, `success`, `compile_error`, `runtime_error`, `timeout`, `memory_limit`, `system_error`, `failed`, `stopped` (interactive sessions only — the frontend delivers `SIGKILL` and the session finalizes as `stopped` when the user clicks Stop).

Rate limits: per user (default 5/minute, 50/hour — shared by batch *and* interactive starts), configurable via env. Interactive polling/poll input are not separately rate-limited.

## Interactive execution (auth required, owner-only)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/executions/{id}/interactive/start` | Start the sandbox container + PTY bridge for the execution |
| POST | `/api/executions/{id}/interactive/input` | Forward terminal bytes (or line input), resize the PTY, or close stdin |
| GET  | `/api/executions/{id}/interactive` | Live poll: streamed output while running, final result once it exits |
| POST | `/api/executions/{id}/interactive/signal` | Deliver `SIGINT`/`SIGTERM`/`SIGKILL` (Ctrl+C = SIGINT) |

Interactive sessions keep a **real persistent process** alive: the backend runs the sandbox with `docker run -d`, a PTY bridge (`pbridge`) relays the program's `stdout`/`stderr` (stderr is also persisted to `/app/stderr.txt`) into a polled `output_b64` stream, and input written to the endpoint reaches the program's stdin. Output appears live while the program runs — the browser polls every ~500 ms.

### POST /api/executions/{id}/interactive/start

No body. Response `data` is the full `ExecutionResource`; on success `status` becomes `running`. If the container could not be started, the execution finalizes as `system_error` with a diagnostic in `stderr` (docker logs, permission/socket hints).

### POST /api/executions/{id}/interactive/input

Body (all optional; `line` and `chunk` are alternative encodings):

```json
{
  "line": "Enough to write to stdin as a line (a newline is appended)",
  "chunk": "base64-encoded raw terminal bytes (no newline added)",
  "rows": 24,
  "cols": 80,
  "close": true
}
```

- `line` (string, max 1,000,000): write as a line, newline appended. **Empty string is allowed** — it delivers a bare `\n` (required for menu loops / blank-line terminated input).
- `chunk` (string, max 1,400,000): base64-encoded raw bytes written verbatim (used for per-keypress terminal input).
- `rows`/`cols`: optional PTY resize.
- `close`: when `true`, closes stdin (EOF). A program whose next `input()` then hits EOF will exit, finalizing the session.

### POST /api/executions/{id}/interactive/signal

```json
{ "signal": "SIGINT" }
```

`signal` is required and must be one of `SIGINT`, `SIGTERM`, `SIGKILL`. Stop (as sent by the Stop button / mobile FAB) uses `SIGKILL`, which finalizes the session as `stopped`.

### GET /api/executions/{id}/interactive

Live poll. While the program runs, `data.output_b64` contains the newly produced terminal bytes (base64 of merged stdout + mirrored stderr), `status` is `running`, and the frontend should call the endpoint again. Once the process exits, `status` becomes terminal and `data.stdout`/`data.stderr`/`data.exit_code` hold the final result — subsequent calls keep returning the persisted result (session finalization is idempotent). Interactive sessions auto-finalize as `timeout` (exit 137) when they outlive `EXECUTION_INTERACTIVE_TIMEOUT` (default 120 s).

### Interactive result consistency

- Reads and applies results through the same `ExecutionResource` shape as batch runs (`stdout`, `stderr`, `exit_code`, `execution_time`, `truncated`, `output_b64`).
- If the frontend run path errors or the session finalizes before the interactive bridge is usable, the client degrades to a one-shot **batch** fallback so the student still gets a result with their typed input pre-supplied as stdin.
- All interactive endpoints authorize ownership (`view`) — Student A can never read, drive, or stop Student B's session.

## Errors

| Code | Meaning |
| ---- | ------- |
| 401 | Unauthenticated |
| 403 | Forbidden (not owner) |
| 404 | Not found |
| 422 | Validation error |
| 429 | Rate limit exceeded |