# ETEC STUDIO — Online Compiler PWA

A secure, mobile-friendly online code editor and execution platform installable as a PWA. Write, save, compile, and run **C**, **C++**, and **Python** code in an isolated Docker sandbox.

## Features

- Auth (register / login / logout) via Laravel Sanctum
- Project & file management (create, rename, delete)
- Monaco editor with syntax highlighting & dark/light themes
- Standard input, output, and error terminal with run stats
- Compile / runtime / timeout results with timing info
- Execution history page (filter, expand, delete)
- Redis-backed async queue execution
- Docker sandboxing with strict resource limits
- Responsive IDE layout for desktop, tablet, and mobile (bottom nav + run FAB)
- Preferences & settings (font size, tab size, minimap, ligatures, theme)
- Installable PWA with offline shell

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Monaco, vite-plugin-pwa
- **Backend:** Laravel 12, PHP 8.4, Sanctum, MySQL 8, Redis 7, queues
- **Execution:** Docker (isolated GCC / G++ / Python3 sandboxes)

## Requirements

- Docker and Docker Compose (v2)
- `curl` (for API/health checks)

> The host does **not** need PHP, Composer, or Node — everything runs in
> containers. Only an existing container image build is required to eventually
> push to a registry.

## Quick start

```bash
# 1. Configure environment (adjust DB passwords / sandbox limits as needed)
cp .env.example .env

# 2. Build the sandbox executor images (C, C++, Python)
./executor/build.sh

# 3. Build and start the full stack (mysql, redis, backend, worker, frontend, nginx)
docker compose up -d --build

# 4. (First run only) wait for migrations + seeding to finish
docker logs -f coderunner-backend   # Ctrl-C when you see "fpm is running, pid 1"
```

Then open:

- **App (built PWA):** http://localhost:80
- **Vite dev server:** http://localhost:5173
- **API root:** http://localhost/api/languages

> The `EXECUTION_HOST_BASE` variable in `.env` must point to the absolute host
> path of `backend/` (under `compiler-pwa`). This is used by the worker to bind
> the per-execution workspace into the sandbox container via the host Docker
> daemon.

### Service health check

```bash
docker compose ps                     # all services should be Up/healthy
curl -s http://localhost/api/languages   # expect JSON with 3 languages
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/health   # 200
```

### Using the app

1. Register an account (top-right).
2. Create a project, then a file — pick **C / C++ / Python** and a filename.
3. Write code in the Monaco editor, provide **standard input** if needed.
4. Click **Run** and watch the result (stdout / stderr / status / time) in the terminal.
5. Execution history is listed per project.

## Common troubleshooting

| Symptom | Fix |
| --- | --- |
| `502 Bad Gateway` on `/api/*` | Backend container still starting (migrations). Wait for `fpm is running` in `docker logs coderunner-backend`. nginx now resolves the backend via Docker DNS at request time, so a backend recreate no longer leaves a stale upstream IP. |
| Sandbox fails with `no such file or directory` for `run.sh` | `EXECUTION_HOST_BASE` is wrong/empty — it must be the host path of `backend/`. |
| Vite dev server returns `502` on `/api/*` (port 5173) | The dev proxy expects `http://nginx:80` inside the compose network (run via `docker compose up frontend`). Outside Docker, keep `curl`/browser on http://localhost:80. |
| Port `80` already in use | Change the nginx port mapping in `docker-compose.yml` (e.g. `"8080:80"`) and reopen http://localhost:8080. |
| `docker compose up` pulls conflicting MySQL image | The MySQL volume is version-locked; `docker compose down -v` only if you want to reset the DB. |

## Stopping / starting

```bash
docker compose stop        # pause containers
docker compose down        # stop + remove containers (keeps volumes/data)
docker compose down -v     # also remove MySQL/Redis volumes (destroys data)
```

## Documentation

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Frontend](docs/frontend.md)

> **Security first.** All code is treated as malicious and runs only inside a restricted, network-less, resource-limited Docker container. User code is never executed on the host.