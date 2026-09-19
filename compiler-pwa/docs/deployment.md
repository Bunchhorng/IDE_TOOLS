# Deployment

## Requirements

- Docker + Docker Compose
- Ports free: 80 (nginx), 3306 (mysql), 5173 (vite dev)

## Quick start (development)

```bash
cp .env.example .env
./executor/build.sh          # build C/C++/Python sandbox images
docker compose --profile dev up -d --build
```

> Development-only helpers (Vite dev server, phpMyAdmin) are on the `dev`
> profile so they never start on a production host. Omit `--profile dev` to a
> get the production service set (mysql, redis, backend, worker, nginx).

Services:

| Service | URL |
| ------- | --- |
| Frontend (Vite dev) | http://localhost:5173 |
| Nginx (proxy) | http://localhost:80 |
| API (direct) | http://localhost:9000/api |

The frontend and phpMyAdmin services only start with `--profile dev`.

The backend runs migrations + seeds on first start.

## Worker

The `worker` service processes execution jobs from Redis. It must run for code execution to complete. It has access to the Docker socket to launch sandboxes.

## Production considerations

- Set `APP_DEBUG=false`, generate a real `APP_KEY`.
- Serve the built frontend from `frontend/dist` (nginx does this already).
- Add TLS via a reverse proxy on the host (Caddy or certbot).
- Run multiple workers for throughput (`WORKER_PROCS`).
- Enable backup for MySQL volume `mysql_data`.
- Harden the worker's Docker access (dedicated host or restricted socket) for multi-tenant deployments.
- On a public server start with the prod override so the dev-only services stay
  off and nginx binds loopback for the host TLS proxy:
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build mysql redis backend worker nginx`
- Full free-tier walk-throughs:
  - **AWS Free Tier (t3.micro, 12 months):** `docs/deploy-aws.md` — includes the
    automated bootstrap `deploy/aws/deploy.sh`.
  - **Google Cloud Always Free (e2-micro):** `docs/deploy-free.md`

## Executor images

Sandbox images are built by `executor/build.sh`:

- `coderunner/c:latest`
- `coderunner/cpp:latest`
- `coderunner/python:latest`

These must be built on the same Docker daemon the worker uses.