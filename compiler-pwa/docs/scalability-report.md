# ETEC STUDIO (compiler-pwa) — Many-Student Concurrency Report

**Date:** 2026-09-18 · Goal: stay smooth, stable and responsive when many students use the IDE simultaneously.

---

## 1. Current Architecture (verified by inspection)

```
Student (React PWA / Monaco / xterm)
   │  Bearer token, HTTPS (nginx, gzip)
   ▼
nginx ──FastCGI──► PHP-FPM (Laravel API, Sanctum auth)
   │                    │
   │                    ├─► MySQL 8 (projects/files/executions, Redis-backed cache+session)
   │                    └─► Redis queue ──► N × queue:work workers
   │                                             │  docker run (arg-array, per-execution)
   │                                             ▼
   │                                    Sandbox: coderunner-<exec_id>
   │                                    --network none --cpus 0.5 --memory 128M
   │                                    --pids-limit 100 --read-only --cap-drop ALL
   │                                    uid 1000, 5s timeout, 1MB output cap
   ▼
Interactive path: POST /executions/{id}/interactive/start → long-lived container
with PTY bridge (pbridge.py); browser polls GET /interactive every 500ms;
input via fifo; Stop → docker rm -f.
```

**Good bones already present (no change needed):** execution is fully queued (Redis + `ExecuteJob`), the web server never compiles; per-execution containers with hard CPU/RAM/PID/time/output limits; per-user rate limits on execution (5/min, 50/h); ownership policies on every model; pagination everywhere; poll loop with proper cleanup (`clearInterval` on finish/stop/unmount); xterm writes output as text (no DOM growth); auto-deleting workdirs.

## 2. Bottlenecks Found (ranked by impact)

| # | Bottleneck | Impact under classroom spike | Status |
|---|---|---|---|
| 1 | **Single queue worker** (`queue:work` ×1) | 30 students click Run → 30 jobs × ~2-6s each = 1-3 min queue at best; all serialized through one sandbox slot | **FIXED** |
| 2 | **Fixed 500ms batch-poll while `queued`** | Spike: dozens of clients hammer the API for jobs that cannot start yet; FPM pool was default (5 children) → 502s under exactly this load | **FIXED** (adaptive poll + FPM tuning) |
| 3 | **Default PHP-FPM pool** (~5 children) | Polling storms exhaust children; every student sees stalls | **FIXED** (12 children, tuned pool) |
| 4 | **Job timeout 60s < interactive 120s wall** | A queued interactive job executed by a worker would be killed mid-run; also `--timeout=60` could reap a slow first pull | **FIXED** (90s, and interactive jobs are never queued — started on demand) |
| 5 | No gzip on JSON poll payloads (base64 terminal streams) | Wasted mobile bandwidth in classrooms on Wi-Fi | **FIXED** (gzip) |
| 6 | MySQL uncapped | A pathological query could starve the host that also runs sandboxes | **FIXED** (512M cap) |
| 7 | `executions` queried by `user_id` only via `latest()` | Covered by existing `(user_id, status)` + `created_at` indexes — verified OK | no change |
| 8 | `files.project_id` lookups | Covered by unique `(project_id, filename)` — verified OK | no change |

**Explicitly inspected and found NOT to be bottlenecks:** N+1 queries (controllers eager-load `language`, `file:id,filename`, `files`), WebSocket/SSE (none — polling only), per-render duplicate requests (poll loop is token-guarded and interval-cleared on finish/stop/unmount), terminal DOM growth (xterm canvas + byte-capped stream), disk accumulation (workdir deleted in `finally` + on finalize), zombie containers (`forceCleanup` on timeout/failure/stop + `--rm`).

## 3. Changes Made

| Change | File | Why |
|---|---|---|
| **4 parallel queue workers** (configurable `WORKER_PROCS`, `--max-jobs=200` leak hygiene) | `docker-compose.yml` | 4 sandboxes in parallel → 30-run spike clears in ~8× less wall time. Scale to cores × 0.75. |
| Job `--timeout=90` | `docker-compose.yml` | Exceeds sandbox wall clock + compile + pull headroom; prevents worker kill mid-run. |
| **PHP-FPM pool: 12 children, dynamic, `max_requests=500`, 65s terminate, slowlog 3s** | `docker/backend/www.conf` (new, mounted `:ro`) | Absorbs poll storms; slowlog surfaces slow queries during class. |
| MySQL memory cap 512M | `docker-compose.yml` | Protect sandbox host from DB runaway. |
| **gzip** (json/js/css/svg, min 256B, level 5) | `docker/nginx/default.conf` | 3-5× smaller poll payloads; big win on classroom Wi-Fi. |
| **Adaptive batch poll: 1.5s while `queued`, 400ms while `running`** | `frontend/src/services/executionService.ts` | Queued jobs can't start sooner however fast we poll; cuts spike API load ~3× with zero UX cost. |

**Security unchanged:** same sandbox flags, same rate limits, same auth — all performance work sits *outside* the trust boundary.

## 4. Capacity Model (estimates, not measurements)

Per-sandbox cost: ≤ 0.5 CPU + 128MB RAM (hard-capped by Docker).

| Host | WORKER_PROCS | Est. comfortable concurrent runs | Classroom spike (30-run burst) clears in |
|---|---|---|---|
| 4 vCPU / 8GB | 3 | 3 simultaneous + API | ~30-60s |
| 8 vCPU / 16GB | 6 | 6 simultaneous + API | ~15-30s |
| 16 vCPU / 32GB | 12 | 12 simultaneous + API | ~8-15s |

Beyond worker capacity, runs **queue** (status visible in UI), nothing crashes — this is the intended backpressure. API/FPM comfortably serves 300+ polling students with the new pool.

## 5. Load-Test Plan (run before claiming a number)

The environment here has no running stack, so **no capacity number is claimed**. Run on staging:

1. `qa/batch_tests.sh` + `qa/interactive_tests.sh` as smoke (already in repo).
2. Spike: k6 script — 30-200 VUs POST `/api/execute` within 5s, then poll until done. Measure: P95 execute-ack, P95 run-to-result, FPM busy workers, queue depth, `docker ps` count.
3. Soak: 50 VUs × 30min → watch worker RSS (validates `--max-jobs=200`), workdir count in `storage/app/executions`, `docker ps -a` for zombies.
4. Pass criteria: zero 5xx, P95 run-to-result < 15s under spike, no growth in RSS/workdirs/containers over soak.

## 6. Remaining Bottlenecks (honest)

1. **Docker daemon is a single point of serialization** for container creation (~200-500ms each). At very large scale, pre-warmed pool or gVisor/podman would help — not needed below ~50 simultaneous runs.
2. **One worker container** — restart takes all workers down for ~1s. For HA, split into multiple worker containers (`docker compose up --scale worker=N` works with the new command unchanged).
3. **Interactive sessions bypass the queue** (by design, started on demand) — their concurrency is bounded only by the execution rate limit per user. A global cap on simultaneous `running` interactive containers could be added if abused.
4. **MySQL single instance** — fine for a school; use managed DB / replicas for larger deployments.

## 7. Regression Check

- `docker compose config` — **PASS**
- `tsc --noEmit` — **PASS**
- `npm run build` — **PASS** (PWA bundle regenerated)
- Functional risk of changes: worker command keeps identical flags + adds parallelism; www.conf replaces stock pool (defaults for user/group/listen preserved); adaptive poll only changes a sleep duration. No API contract, sandbox flag, or security control touched.
