# Deployment

## Requirements

- Docker + Docker Compose
- Ports free: 80 (nginx), 3306 (mysql), 5173 (vite dev)

## Quick start (development)

```bash
cp .env.example .env
./executor/build.sh          # build C/C++/Python sandbox images
docker compose up -d --build
```

Services:

| Service | URL |
| ------- | --- |
| Frontend (Vite dev) | http://localhost:5173 |
| Nginx (proxy) | http://localhost:80 |
| API (direct) | http://localhost:9000/api |

The backend runs migrations + seeds on first start.

## Worker

The `worker` service processes execution jobs from Redis. It must run for code execution to complete. It has access to the Docker socket to launch sandboxes.

## Production considerations

- Set `APP_DEBUG=false`, generate a real `APP_KEY`.
- Serve the built frontend from `docker/frontend` (or CDN).
- Add TLS via a reverse proxy (e.g., certbot / nginx).
- Run multiple workers for throughput.
- Enable backup for MySQL volume `mysql_data`.
- Harden the worker's Docker access (dedicated host or restricted socket) for multi-tenant deployments.

## Executor images

Sandbox images are built by `executor/build.sh`:

- `coderunner/c:latest`
- `coderunner/cpp:latest`
- `coderunner/python:latest`

These must be built on the same Docker daemon the worker uses.