# Deploy ETEC STUDIO on AWS Free Tier — runbook (tested 2026-09-20)

Single-instance production deployment of the ETEC STUDIO online compiler
(Laravel API + MySQL + Redis + Docker-sandbox workers + nginx serving the built
PWA) on a `t3.micro` Ubuntu EC2, fronted by Caddy with Let's Encrypt, behind a
registrar-owned domain (**etecstudio.online**, hosted at Namecheap).

This is the **real, verified** flow — every step below was executed against the
live production box on 2026-09-20. Deviations from it are the bugs this doc
exists to prevent.

## Architecture

```
 Internet
    │  https://etecstudio.online  (:80/:443)
    ▼
 Caddy  (host systemd service, owns :80 + :443, Let's Encrypt TLS)
    │  reverse_proxy 127.0.0.1:8080
    ▼
 nginx   (container, loopback-only  127.0.0.1:8080)
    │         serves frontend/dist (the PWA) + proxies /api
    ▼
 Laravel backend (php-fpm :9000) ── MySQL :3306, Redis :6379
 worker (sandboxes: c/cpp/python, launched via /var/run/docker.sock)
```

Everything except `:80/:443` is bound to loopback (`127.0.0.1`) or lives on the
internal Docker bridge — nothing else is exposed to the internet.

> Configuration source of truth: `deploy/aws/deploy.sh` writes the Caddyfile and
> brings the stack up with **both** `-f docker-compose.yml -f
> docker-compose.prod.yml`. `docker-compose.prod.yml` pins nginx to
> `127.0.0.1:8080:80` and the Caddyfile proxies to that port. Do not bind nginx
> to `:80/:443` — Caddy owns them.

---

## 1. Create the EC2 instance

1. AWS account + billing setup (a card is required even for the Free Tier).
2. **EC2 → Instances → Launch instance**:
   - Name `coderunner`; AMI **Ubuntu 24.04 LTS** (x86_64).
   - **Architecture x86_64** — do **not** pick Graviton/ARM; the sandbox images
     are amd64-only.
   - Instance type `t3.micro` (2 burstable vCPU, 1 GB RAM).
   - **Key pair**: create `coderunner` → download `.pem` → `chmod 600`.
   - **Network → Edit** security group:
     | Type | Source | Purpose |
     | --- | --- | --- |
     | SSH (22) | your IP | administration |
     | HTTP (80) | `0.0.0.0/0` | Caddy TLS challenge + redirects |
     | HTTPS (443) | `0.0.0.0/0` | the app |
     Everything else stays closed (3306/9000/8081 are loopback/internal).
   - Storage 30 GB `gp3`.
3. Launch, note the **Public IPv4**.

## 2. Reserve an Elastic IP (static)

The default public IP changes on stop/start. EC2 → **Elastic IPs → Allocate →
Associate** to the `coderunner` instance. This is your permanent address —
point DNS at it with the web app you are sending to.

**Current production value:** the instance public IP is `13.210.95.182`
(SSH as `ubuntu@13.210.95.182` with `coderunner.pem`). `172.31.43.168` is only
the *private* hostname — never use it in DNS.

## 3. DNS (Namecheap)

At Namecheap → your domain → **Advanced DNS**, set two A records (delete any
stale ones pointing at an old server):

| Host | Type | TTL | Value |
| --- | --- | --- | --- |
| `@` | A | 300 | `<Elastic IP>` |
| `www` | A | 300 | `<Elastic IP>` |

Verify: `nslookup etecstudio.online 8.8.8.8` must return the **Elastic IP**; `www`
must resolve too (Caddy redirects it to the apex). Until records propagate,
browser HTTPS can still work once the cert exists — Caddy retries.

> Do not move the domain into Route 53 — that costs $0.50/domain/month. Keep it
> at Namecheap, it just needs A records.

## 4. SSH in + swap + Docker

```bash
chmod 600 ~/Downloads/coderunner.pem
ssh -i ~/Downloads/coderunner.pem ubuntu@13.210.95.182        # or <Elastic IP>

# 2 GB swap (1 GB RAM is tight: MySQL 512M + Redis 128M + php-fpm + a sandbox)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
# log out/in (or: newgrp docker); record the docker GID for .env later:
getent group docker
```

> **Lost `.pem`?** It cannot be recovered from AWS. Attach a new key pair or use
> EC2 Instance Connect before cutting off access.

## 5. Get the code — mind the NESTED layout

The repo root is `IDE` and contains the app in a **`compiler-pwa/` subfolder**
(plus `AGEND.MD`). This nested layout is the #1 source of confusion — the app is
**`~/compiler-pwa/compiler-pwa`**, never the repo root.

```bash
cd ~
git clone -b production https://github.com/Bunchhorng/IDE_TOOLS.git compiler-pwa
cd ~/compiler-pwa/compiler-pwa        # ← the actual app
```

| Path | Contents |
| --- | --- |
| `~/compiler-pwa` | git repo root (`.git`, `AGEND.MD`) |
| `~/compiler-pwa/compiler-pwa` | **the app**: backend, frontend, deploy/aws/deploy.sh, docker-compose* |

## 6. `.env` — the passwords MUST match the MySQL volume

`deploy.sh` does **not** create `.env`. Copy it from a backup or example:

```bash
cd ~/compiler-pwa/compiler-pwa
cp .env.example .env            # fresh box (first-ever deploy)
# …or restore a previous .env (existing box, existing database volume!)
```

Rules that are not optional:

1. **`DB_USERNAME` / `DB_PASSWORD` / `DB_ROOT_PASSWORD` must equal the passwords
   the running MySQL container was initialized with.** MySQL data lives in the
   `mysql_data` Docker volume; if `.env` drifts (e.g. a fresh clone regenerated
   random passwords), every database query 500s and the UI shows
   **"Something went wrong. Please try again."**. To re-align with the existing
   volume:
   ```bash
   docker inspect coderunner-mysql --format '{{range .Config.Env}}{{println .}}{{end}}'
   # then set DB_PASSWORD=<MYSQL_PASSWORD>, DB_ROOT_PASSWORD=<MYSQL_ROOT_PASSWORD> in .env
   ```
2. **`DB_HOST=mysql` must be present** — Laravel defaults to `127.0.0.1` when
   missing, which is the container itself and breaks every connection.
3. `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` set, `WORKER_PROCS=1`,
   `DOCKER_GROUP_ID=<gid from step 4>`, `EXECUTION_HOST_BASE=/home/ubuntu/compiler-pwa/compiler-pwa/backend`.

> Nuclear reset only if you *want* to wipe data:
> `docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v`
> then let deploy.sh recreate a fresh MySQL volume with the new passwords.

## 7. Bootstrap

```bash
cd ~/compiler-pwa/compiler-pwa
DOMAIN=etecstudio.online ./deploy/aws/deploy.sh
```

What it does: ensures swap, builds the sandbox images, builds `frontend/dist`
in a one-off `node:22-alpine` container, writes `/etc/caddy/Caddyfile`
(Let's Encrypt) and `systemctl enable --now caddy`, then
`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
mysql redis backend worker nginx`. The backend entrypoint runs
`php artisan migrate --force` + seed on boot. Idempotent — re-run it anytime.

First migration run adds project **slugs** (2026_09_20_000001) and backfills the
existing rows.

## 8. Verify a successful deployment

```bash
docker compose ps                                   # 5 containers, mysql/redis Healthy
sudo ss -ltnp | grep -E ':(80|443|8080)\b'         # caddy 80/443, docker-proxy 127.0.0.1:8080
curl -sI https://etecstudio.online                  # HTTP/2 200 (full internet path)
```

**Registration (end-of-to-end proof, expect HTTP 201 + JSON token):**

```bash
curl -s -X POST https://etecstudio.online/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"student-new1@etec.com","password":"secret123","password_confirmation":"secret123"}'
```

Then delete the smoke account, or sign up in the browser (only `@etec.com`
addresses are accepted).

**Project URLs use slugs, not IDs** (numeric IDs are hidden):

```bash
TOKEN=...   # from a real login
curl -s https://etecstudio.online/api/projects -H "Authorization: Bearer $TOKEN"
# response projects carry "slug":"xxxxxxxxxxx"
curl -s -o /dev/null -w "%{http_code}\n" \
  https://etecstudio.online/api/projects/<slug> -H "Authorization: Bearer $TOKEN"   # 200
curl -s -o /dev/null -w "%{http_code}\n" \
  https://etecstudio.online/api/projects/3 -H "Authorization: Bearer $TOKEN"        # 404
```

Browser URL is `/editor/<slug>` — no numbers.

**Editor must mount instantly** (Monaco is bundled locally, no CDN):
open a project → a `main.py`/`main.cpp` file loads without the `Loading...`
spinner. If it still spins, the service worker served the old shell → hard
refresh / clear site data (see Troubleshooting).

## 9. Redeploy / update workflow (the only thing you need day-to-day)

```bash
# local: commit + push
git push origin production

# on the VM:
cd ~/compiler-pwa/compiler-pwa
git pull origin production
DOMAIN=etecstudio.online ./deploy/aws/deploy.sh
```

Browser: hard-refresh (Ctrl+Shift+R) so the new service-worker version takes over.

## 10. Troubleshooting (real incidents, all resolved 2026-09-20)

| Symptom | Cause | Fix |
| --- | --- | --- |
| Register/login → "Something went wrong. Please try again." | `.env` DB passwords drifted from the MySQL volume (500), or the `throttle:auth` rate limit (plain-text 429) | Align DB_USERNAME/DB_PASSWORD/DB_ROOT_PASSWORD with `docker inspect coderunner-mysql …`; `docker compose exec redis redis-cli FLUSHDB`; retry with a fresh `@etec.com` email |
| `docker compose … up`: `yaml: line 195: could not find expected ':'` | A Dockerfile got pasted at the end of `docker-compose.yml` | The stray block was removed (commit `6eca2f6`); never paste build stages into the compose file |
| `failed to bind host port …address already in use` on `:80` | nginx trying to bind `:80`/`:443` that Caddy owns | nginx must be `127.0.0.1:8080:80` (prod override); Caddyfile must `reverse_proxy 127.0.0.1:8080` |
| Editor pane stuck on `Loading...`, page otherwise works | `@monaco-editor/react` fetched Monaco core from jsDelivr CDN; classroom network blocked it | Now bundled: `import * as monaco from 'monaco-editor'; loader.config({ monaco })` in `CodeEditor.tsx` (commit `6dd481f`); hard-refresh / clear site data |
| `https://etecstudio.online/editor/4` → 404 | Numeric IDs are intentionally hidden; routes resolve by slug | Use `/editor/<slug>` (commit `800f0f9`); bookmarks with raw IDs break by design |
| Sign-in redirects in a loop / unexpected page | Stale PWA service worker cache | DevTools → Application → Service Workers → Unregister, then reload |
| Site serves the OLD version after deploy | SW precached the previous build | Hard-refresh; `sw.js` re-registers network-first on next load |

## 11. Backup, ops & hardening

- **Backup**: `mysqldump` via cron, or EC2 **EBS snapshot** (cheap) — snapshot
  before anything destructive.
- **SSH**: key-only, `PasswordAuthentication no`.
- **Secrets**: never commit `.env`; rotate `APP_KEY`/DB passwords on incident.
  The `.pem` is the root door — keep offline.
- **Docker socket** in backend/worker is the main risk surface (see
  `security-audit-report.md`, SEC-004) — acceptable for a trusted classroom VM.
  Sandboxes are already hardened (`--network none`, `--cap-drop ALL`, memory/
  pid/time caps, read-only root).
- **Logs**: `docker compose logs -f --tail=100 backend worker nginx`.
- **Scale later**: raise `WORKER_PROCS` on a bigger box (`t3.small/medium`) or
  lift the same compose onto a 2 GB VPS when the free tier ends.

## Reference

| URL / port | What |
| --- | --- |
| `https://etecstudio.online` | the app (Caddy + Let's Encrypt) |
| `127.0.0.1:8080` (on VM) | nginx: frontend + `/api`, loopback only |
| `*:80` / `*:443` (on VM) | Caddy (systemd), TLS termination |
| `127.0.0.1:8081:80` | phpMyAdmin — dev profile only |
| `ssh -i ~/Downloads/coderunner.pem ubuntu@13.210.95.182` | SSH in |
| AWS console → EC2 | instance, key pair, EIP, security groups |

Free-tier ceiling: ~1 burstable vCPU / 1 GB RAM — fine for a classroom (one
sandbox at a time, app rate limits of 5 runs/min per user). The same compose
moves as-is to a bigger instance when the 12-month tier ends.