# Security Model

**Principle: assume all user code is malicious.**

User code is never executed directly on the Laravel host. Every run is isolated in a Docker sandbox.

## Host protection

- No `shell_exec`/`exec`/`system`/`passthru` on user input.
- Execution happens in throwaway containers created by the worker.
- Laravel host mounts only the Docker socket (granting the worker permission to launch *restricted* containers), never exposing it to user code.

## Container isolation

Each execution container:

- Network disabled (`--network none`)
- CPU capped (`--cpus 0.5`)
- Memory capped (default 128 MB, not configurable per request)
- Swap disabled (`--memory-swap` = memory)
- Process limit via `--pids-limit`
- Read-only root filesystem
- All capabilities dropped (`--cap-drop ALL`)
- `no-new-privileges`
- Non-root user (`1000:1000`)
- Temporary tmpfs `/tmp` (64 MB, noexec)
- Own temp workspace volume, removed after run
- No Docker socket, no host mounts, no secrets

## Input validation

- Language must exist and be active (`exists:languages,slug,is_active,1`)
- Code/stdin capped in size
- Filenames restricted via regex (no path traversal)
- All auth/ownership checks server-side; client-supplied IDs are never trusted

## Abuse protection

- Timeout enforced (default 5 s) via container + `timeout` command
- Output truncated to limit
- Rate limiting on execution endpoints
- Policies guard project/file/execution access
- No logging of passwords, tokens, or source code (logs store only IDs and statuses)

## Do not

- Mount `/` or sensitive host dirs into execution containers
- Mount `/var/run/docker.sock` into execution containers
- Give containers network access
- Trust `user_id`, `project_id`, `file_id`, language, or filenames from clients