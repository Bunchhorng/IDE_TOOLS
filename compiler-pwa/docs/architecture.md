# Architecture

## Overview

CodeRunner is a secure online code compilation and execution platform.

```
    PWA Client (React + TS + Monaco)
        │  HTTPS / REST API
        ▼
    Laravel API (Sanctum auth, projects, files, executions)
        │
        ▼
    Redis Queue
        │
        ▼
    Execution Worker
        │
        ▼
    Docker Sandbox (isolated, resource-limited)
        │
        ▼
    Compiler / Runtime (GCC, G++, Python3)
```

## Components

### Frontend

- React + TypeScript + Vite SPA served as a Progressive Web App.
- Monaco Editor for code editing with C/C++/Python language mappings.
- Reactive layout: file explorer, editor, input, output terminal.
- Offline-capable shell via Workbox service worker.

### Backend

- Laravel 12 REST API with Sanctum token authentication.
- Execution endpoints dispatch jobs to a Redis-backed queue.
- Authorization enforced server-side via Policies (never trust client IDs).

### Execution Worker

- Consumes queued `ExecuteJob`s.
- Writes user code into an isolated temp workspace.
- Runs a restricted Docker container with strict resource caps.
- Persists results (stdout, stderr, exit code, timing) back to the DB.

## Key flows

1. User runs code → `POST /api/execute`.
2. Execution row created with status `queued`.
3. Job dispatched to Redis queue.
4. Worker picks job → status `running` → sandbox executes.
5. Worker updates row with result; frontend polls `GET /api/executions/{id}`.

## Adding a language

1. Create `executor/<slug>/Dockerfile` and build the image.
2. Insert a row into the `languages` table (name, slug, docker_image, compile/run commands, filename template).
3. No application code changes required.