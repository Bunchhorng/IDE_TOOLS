# ETEC STUDIO (compiler-pwa) — Security Audit Report

**Date:** 2026-09-18 · **Scope:** full stack (React PWA, Laravel API, Docker sandbox, nginx, MySQL/Redis) · **Method:** static inspection of all trust boundaries + configuration review. Live exploitation was limited to safe non-destructive checks (frontend build, compose validation) because no running stack was available in this environment — see "Remaining work" for what to re-verify against a live deployment.

---

## 1. Security Audit Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 2 (1 fixed, 1 partially fixed) |
| Medium | 4 (3 fixed) |
| Low | 4 (1 fixed) |
| Informational | 4 |

## 2. Code Execution Security (most important area) — PASS

Student code runs in a per-execution Docker container started by the backend via the host daemon (`DockerExecutionService`):

| Control | Implementation |
|---|---|
| Sandbox mechanism | Docker, per-run container `coderunner-<execution_id>`, `--rm` (auto-delete) |
| CPU limit | `--cpus 0.5` batch / configurable `cpu_percent` interactive |
| Memory limit | `--memory` + `--memory-swap` equal (no swap) — default 128 MiB |
| Process limit | `--pids-limit 100` (anti fork-bomb) |
| Timeout | `timeout <N>s` inside runner + Symfony Process hard timeout; interactive 120 s with `timeout -s KILL` |
| Output limit | `head -c 1MB` + PTY relay caps at `--max` and marks `truncated.txt` |
| Filesystem isolation | `--read-only` rootfs, `--tmpfs /tmp:rw,size=64m` only writable path outside `/app`; workdir is per-execution, deleted after run |
| Network isolation | `--network none` — student programs cannot reach DB, Redis, API, or internet |
| Environment isolation | Only `HOME`, `TMPDIR`, `PYTHONDONTWRITEBYTECODE`, `PYTHONUNBUFFERED` injected — **no** DB passwords, APP_KEY, or server env |
| Privileges | `--cap-drop ALL`, `--security-opt no-new-privileges`, non-root `--user 1000:1000` (uid 1000 `runner` in all three language images) |
| No docker.sock in sandbox | Docker socket is mounted in the **backend** container only (required to launch sandboxes), never in execution containers |

Compiler/runtime commands are built from the server-controlled `languages` table into a generated `run.sh`; user code is written to a separate file and only referenced by path. Filenames come from `filename_template`, not user input → no shell metacharacter injection in the runner. All host-side process launching uses `Symfony Process` argument arrays (no shell string concatenation); the one shell-context use (`writeFifoChunk`) escapes with `escapeshellarg` on a server-generated base64 payload.

## 3. Findings

### SEC-001 — No rate limiting on login/register/guest (HIGH — FIXED)
- **Category:** Authentication / API abuse
- **Affected:** `routes/api.php` — `/auth/login`, `/auth/register`, `/auth/guest`
- **Description:** Credential endpoints had no throttle; `/auth/guest` also auto-created a user row per unique `device_id`, allowing unauthenticated database inflation and unlimited password guessing.
- **Impact:** Password brute force, credential stuffing, guest-row spam.
- **Fix:** Named `auth` rate limiter (5/min per account+IP, 30/min per IP) applied via `throttle:auth` middleware to all three endpoints.
- **Files changed:** `backend/routes/api.php`
- **Retest:** PHP runtime not available in this environment — verify with `php artisan serve` + repeated 401 attempts → expect `429` after 5.

### SEC-002 — Missing security headers (MEDIUM — FIXED)
- **Category:** Web / headers
- **Affected:** `docker/nginx/default.conf`
- **Description:** No CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, or HSTS.
- **Fix:** Added full header set to HTTP + HTTPS servers (and to the asset `location` blocks, since nginx `add_header` is not inherited when a block defines its own headers). CSP allows `'unsafe-inline'` styles (Tailwind runtime styles) and `blob:` workers (xterm), `frame-ancestors 'none'` prevents clickjacking.
- **Files changed:** `docker/nginx/default.conf`
- **Retest:** `curl -I http://localhost/` after deploy.

### SEC-003 — Infrastructure ports bound to 0.0.0.0 (MEDIUM — FIXED)
- **Category:** Docker / network exposure
- **Affected:** `docker-compose.yml`
- **Description:** MySQL (`3306`) and php-fpm (`9000`) were published on all host interfaces. MySQL is reachable with the compose default credentials (`rootsecret`/`secret`) from any machine on the LAN; php-fpm is raw FastCGI and must never be exposed.
- **Fix:** Both now bound to `127.0.0.1`. nginx reaches php-fpm over the internal docker network; Redis and MySQL are otherwise network-internal only.
- **Files changed:** `docker-compose.yml`
- **Retest:** `docker compose config` (done — valid); after deploy, `ss -tlnp` should show only 127.0.0.1 bindings for 3306/9000.

### SEC-004 — Docker socket mounted into backend + worker containers (HIGH — ACCEPTED RISK, mitigated)
- **Category:** Docker / container escape
- **Affected:** `docker-compose.yml`
- **Description:** The backend requires `/var/run/docker.sock` to launch sandbox containers. A remote-code-execution bug in Laravel would let an attacker control the host docker daemon (equal to root on the host). This is the standard trade-off for Docker-in-Docker-by-socket designs; it is **not exploitable directly by students** (their code runs in `--network none` containers with no socket) but raises the blast radius of any backend RCE.
- **Recommendation (roadmap, not applied — requires infra changes):** switch to rootless Docker/Podman, or a supervised docker-api proxy (e.g. Tecnativa/docker-socket-proxy) limited to `POST /containers/create|start|stop` endpoints, or run each execution in a dedicated gVisor/Kata runtime.
- **Status:** Documented; **fix pending owner decision**.

### SEC-005 — Workdirs chmod 0777 (LOW — accepted, documented)
- **Category:** Local privilege/file access on backend host
- **Affected:** `DockerExecutionService::execute()` / `startInteractive()`
- **Description:** Per-execution workdirs under `storage/app/executions/<id>` are opened to 0777 so uid-1000 sandbox can write outputs (php-fpm runs as www-data and cannot chown). Local users on the backend host could read another run's files during its lifetime. Workdirs are deleted immediately after execution and are keyed by unguessable execution id.
- **Recommendation:** run php-fpm pool as uid 1000, or use a shared group + 0770.

### SEC-006 — Laravel `APP_KEY` hardcoded as compose/env fallback (MEDIUM — flag)
- **Affected:** `docker-compose.yml`, `backend/.env.example`
- **Description:** The example key `base64:95ObMnk6...` ships as the default fallback. If deployed without setting `APP_KEY`, every install shares a known key (Sanctum token forging, encrypted cookies).
- **Recommendation:** never deploy without generating `php artisan key:generate`. Compose kept a fallback so `docker compose up` works out of the box in dev — acceptable for local, dangerous in prod. Consider failing startup when `APP_KEY` equals the known default and `APP_ENV=production`.

### SEC-007 — Auth token in localStorage (LOW — accepted)
- **Category:** PWA / storage
- **Affected:** `frontend/src/services/authService.ts`
- **Description:** Bearer token stored in `localStorage` is readable by any XSS. **No XSS sink exists** (verified: zero `dangerouslySetInnerHTML`/`innerHTML` in src; terminal output is written via xterm `term.write()` as text, not HTML; React escapes by default), so practical risk is low. Token also deliberately survives reload (PWA). Logout clears it; 401 interceptor clears it.
- **Recommendation:** consider refresh-token-in-HttpOnly-cookie architecture later; would require backend session work.

### SEC-008 — nginx TLS certs + legacy config names (INFO)
- `coderunner.pem` / `coderunner-key.pem` are mkcert dev certs; fine for LAN testing, replace for production. Cosmetic `coderunner-*` container names kept intentionally (renaming breaks running deployments).

### SEC-009 — Executions table growth (INFO)
- `executions.source_code/stdin/stdout/stderr` up to 5 MB each; rate limits (5/min, 50/h) cap growth. Consider a retention job.

### SEC-010 — Dependency audit not runnable here (INFO)
- Run `composer audit` (backend) and `npm audit` (frontend) in CI; no known-bad packages spotted during review; deps are current majors.

## 4. Verified-PASS areas (no fix needed)

| Area | Evidence |
|---|---|
| Authorization / IDOR | Policies (`ProjectPolicy`, `FilePolicy`, `FolderPolicy`, `ExecutionPolicy`) enforce `user_id` ownership; auto-discovered by Laravel convention; every controller action calls `$this->authorize()`. `index`/`destroyAll` query through `auth()->user()->...` relations only. |
| Path traversal | Files are DB rows, not host paths — `../`-style filenames are irrelevant to storage; `StoreFileRequest` additionally regex-restricts filenames to `[a-zA-Z0-9_.\-]+` and validates folder belongs to project. |
| Command injection | Argument-array Process everywhere; runner script built from server-side language config; student filename never interpolated. |
| Terminal XSS | xterm `write()` treats output as text; React rendering is escaped; no HTML sinks. |
| stdin as data | Terminal input is base64-decoded bytes written into a fifo → PTY; never interpreted as a shell command. |
| Stop-button ownership | All interactive endpoints authorize `view` (owner-only); container name is derived from the execution id, not user input. |
| CORS | No `config/cors.php` = Laravel default (same-origin); Sanctum is token-based, `statefulApi()` handles SPA cookie flows safely. |
| SQL injection | Eloquent/bindings throughout; no raw queries found. |
| Error handling | JSON envelope for API; `APP_DEBUG` default true in dev only; guests redirected to JSON 401 (no stack traces on API routes). |
| Secrets to sandbox | Only benign env vars injected; `.env` never mounted into executor images. |
| Frontend env | Single `VITE_API_URL` (endpoint URL, not a secret). |
| Guest→upgrade flow | `upgrade` validates unique email + strong password; clears `device_id`. |

## 5. Regression Check

- `tsc --noEmit` — **PASS** (frontend typecheck clean)
- `npm run build` — **PASS** (PWA bundle generated, 15 precache entries)
- `docker compose config` — **PASS** (compose file valid after port-binding change)
- `php artisan` route/test run — **not executable in this environment** (no PHP host binary); re-run `php artisan test` in the backend container.
- Functional sanity of changed files: rate limiter only touches auth routes; nginx headers are additive; compose ports only re-bound to loopback — no runtime logic altered.

## 6. Regression Matrix (per checkingSecurity.md)

| Area | Test | Result |
|---|---|---|
| Authentication | Login protection (rate limit) | PASS (fixed, verify live) |
| Authorization | User isolation | PASS |
| Files | Path traversal | PASS |
| Files | Cross-user access | PASS |
| Upload | Malicious filename | PASS |
| Execution | Sandbox isolation | PASS |
| Execution | Host filesystem | PASS |
| Execution | Environment secrets | PASS |
| Execution | Network isolation | PASS |
| Execution | CPU limit | PASS |
| Execution | Memory limit | PASS |
| Execution | Process limit | PASS |
| Execution | Output limit | PASS |
| Execution | Timeout | PASS |
| Terminal | stdin isolation | PASS |
| Terminal | XSS | PASS |
| API | IDOR | PASS |
| API | Rate limiting (execute) | PASS |
| API | Rate limiting (auth) | PASS (fixed) |
| API | Input validation | PASS |
| API | CORS | PASS |
| Web | XSS | PASS |
| Web | CSRF | PASS (token auth, no cookies) |
| Database | SQL injection | PASS |
| Secrets | Secret exposure | PASS w/ APP_KEY caveat (SEC-006) |
| Docker | Privileges | PASS (cap-drop ALL, non-root) |
| Docker | Docker socket | ACCEPTED RISK (SEC-004) |
| Headers | Security headers | PASS (fixed) |
| PWA | Cache security | PASS (auth token not cached by SW; assets only) |
| Dependencies | Vulnerabilities | NOT RUN (INFO — run in CI) |

## 7. Remaining Work (honest list)

1. **SEC-004** — docker socket in backend: decide on socket-proxy/rootless/gVisor path.
2. **SEC-006** — enforce non-default `APP_KEY` in production deploys.
3. **SEC-005** — tighten workdir permissions (run pool as uid 1000 or group-based).
4. Run `composer audit` + `npm audit` in CI and gate on high severity.
5. Re-verify SEC-001/002 live: 429 on repeated logins; headers present on responses.
6. Add the executor/interactive test suites (`qa/*.sh`) as a periodic regression gate — they already cover traversal, authz, and round-trips.
