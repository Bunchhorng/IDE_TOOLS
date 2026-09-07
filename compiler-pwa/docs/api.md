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
| POST   | `/api/projects/{project}/files` | Create. Body: `filename`, `language`, `content?` |
| GET    | `/api/files/{id}` | Show file |
| PUT    | `/api/files/{id}` | Update `filename`/`language`/`content` |
| DELETE | `/api/files/{id}` | Delete |

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
  "stdin": ""
}
```

Returns the queued execution with `status: "queued"`. Poll `GET /api/executions/{id}` until status is terminal.

### Execution statuses

`queued`, `running`, `success`, `compile_error`, `runtime_error`, `timeout`, `memory_limit`, `system_error`, `failed`

Rate limits: per user (default 5/minute, 50/hour), configurable via env.

## Errors

| Code | Meaning |
| ---- | ------- |
| 401 | Unauthenticated |
| 403 | Forbidden (not owner) |
| 404 | Not found |
| 422 | Validation error |
| 429 | Rate limit exceeded |