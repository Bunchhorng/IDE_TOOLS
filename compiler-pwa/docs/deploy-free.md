# Deploy on Google Cloud Always Free (e2-micro)

AWS alternative: **docs/deploy-aws.md** (t3.micro, free for 12 months and with
an automated `deploy/aws/deploy.sh` bootstrap). GCP's `e2-micro` is **Always
Free** — pick it if you need free hosting past the first year.

The full app (Laravel API + MySQL + Redis + Docker-sandbox workers + nginx
serving the built PWA) runs on a single free `e2-micro` VM. This is the only
realistic path to *free* hosting because student-code execution needs real
Docker on the host — managed free tiers (Vercel/Netlify/Render/Railway/Fly)
can't run that sandbox model.

Usable budget on the free tier: **1 shared vCPU, 1 GB RAM, 30 GB disk**.
Everything in this guide is sized for that.

---

## 1. Create the VM

1. Create a Google Cloud account and **enable billing** (required even for
   Always Free — you won't be charged if you stay inside the quota).
2. Go to **Compute Engine → VM instances → Create instance**.
3. Set:
   - **Name**: `coderunner`
   - **Region**: `us-west1`, `us-central1`, or `us-east1` (free-tier regions).
   - **Machine type**: `e2-micro` (shared-core x86). Make sure **Spot** is off.
   - **Boot disk**: 30 GB standard persistent disk, Debian 12 or Ubuntu 24.04 LTS.
   - **Firewall**: tick "Allow HTTP traffic" and "Allow HTTPS traffic".
4. Add your public SSH key (or use the in-browser SSH button).
5. Reserve a **static external IP** so the address never changes:
   **VPC network → External IP addresses → Reserve** (free while the VM runs).
   Note it down.

> Free tier: 1 `e2-micro` + 30 GB standard disk are free per month in those
> regions. Exceeding the quota (or a second VM) starts billing.

## 2. SSH in and add swap

1 GB RAM is tight (MySQL 512M + Redis 128M + PHP-FPM + one sandbox). Add
2 GB swap before anything else so the OOM killer never eats a request:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Install Docker

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

Log out and back in (or run `newgrp docker`) for the group to apply.
Record the docker group id for later:

```bash
getent group docker        # e.g. docker:x:999:  → note the 999
```

## 4. Get the code and configure

```bash
git clone <your-repo-url> compiler-pwa && cd compiler-pwa
# ...or: rsync -av ./compiler-pwa/ user@IP:./compiler-pwa/
cp .env.example .env
```

Edit `.env`:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:<openssl rand -base64 32>
DB_PASSWORD=<strong-password>
DB_ROOT_PASSWORD=<strong-password>
WORKER_PROCS=1
DOCKER_GROUP_ID=<gid-from-step-3>
EXECUTION_HOST_BASE=$PWD/backend
```

> `EXECUTION_HOST_BASE` must be the **absolute host path** to the repo's
> `backend` folder — the workers bind-mount it so sandboxes see the source.
> Use `/home/<user>/compiler-pwa/backend`, not `$PWD`, if you want it permanent.

## 5. Build the sandbox images and the PWA

```bash
./executor/build.sh    # builds coderunner/c, coderunner/cpp, coderunner/python
```

The frontend container (`frontend` service) is dev-only; on the server build
`dist` with a one-off node container instead:

```bash
docker run --rm -v "$PWD/frontend:/app" -w /app node:22-alpine \
  sh -c "npm install && npm run build"
```

## 6. Slim PHP-FPM for 1 GB

The default pool (12 children ≈ 500 MB) doesn't fit next to MySQL + Redis.
Shrink it before first start:

```bash
sed -i \
  -e 's/pm\.max_children = 12/pm.max_children = 4/' \
  -e 's/pm\.start_servers = 4/pm.start_servers = 2/' \
  -e 's/pm\.min_spare_servers = 2/pm.min_spare_servers = 1/' \
  -e 's/pm\.max_spare_servers = 6/pm.max_spare_servers = 2/' \
  docker/backend/www.conf
```

## 7. Start the stack

The base compose puts Vite dev + phpMyAdmin on the `dev` profile so they are
**not** started here. The prod override binds nginx to loopback so the host
TLS proxy (next step) can own ports 80/443.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build mysql redis backend worker nginx

docker compose ps                    # all 5 should be Up (healthy)
curl http://localhost/health         # → ok
curl http://localhost/               # → index.html (the PWA)
```

First boot runs migrations + seeds automatically. Sandbox images live on this
same daemon, so the worker can launch them.

## 8. HTTPS with Caddy (free certs)

This project owns the domain **etecstudio.online**, so use that path (clean
padlock, no per-device CA installs — best for students).

**1. Point DNS at the VM.** At your registrar (Namecheap/GoDaddy/etc.), set
two A records — both to your VM's static public IP:

| Host | Type | Value |
| --- | --- | --- |
| `@` (etecstudio.online) | A | `<VM public IP>` |
| `www` | A | `<VM public IP>` |

Also remove any conflicting CNAME/www records, and set TTL low (~300s) until
the cert is live. Wait until `nslookup etecstudio.online` returns your IP.

**2. Caddy auto-issues and renews Let's Encrypt certs — no config beyond DNS.**

```bash
sudo apt install -y caddy
sudo cp docker/caddy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
```

The repo's Caddyfile already serves `https://etecstudio.online` (gzip + proxy
to nginx on loopback) and redirects `www` → apex.

**3. Open https://etecstudio.online** — full PWA install (service worker,
offline, Add to Home Screen with the logo) now works on the iPhone/Android.

## 8b. Alternative: HTTPS with a private CA (no domain, no Let's Encrypt)

If DuckDNS/Let's Encrypt are blocked (restricted networks, no DNS control), the
nginx container already terminates TLS on 443 using
`docker/nginx/certs/coderunner.pem` + `coderunner-key.pem` — no extra proxy
needed. You just put a cert **for your public IP** in those two files, signed
by the **same mkcert CA your devices already trust**, then trust that CA once
per device.

1. Generate the cert on any machine with your mkcert CA (the dev machine —
   CAROOT at `~/.local/share/mkcert`):

   ```bash
   mkcert -cert-file coderunner.pem -key-file coderunner-key.pem \
     1.2.3.4 localhost 127.0.0.1        # 1.2.3.4 = your VM's static public IP
   ```

2. Upload it to the VM over SSH, overwriting the repo copies:

   ```bash
   scp coderunner.pem coderunner-key.pem user@1.2.3.4:./compiler-pwa/docker/nginx/certs/
   ```

3. Restart nginx and verify on the VM:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
   curl -k https://localhost/health        # → ok
   ```

4. **Trust the root CA once per device** (this is the one manual step). The CA
   is already shipped in the app's public folder so devices can fetch it:
   - iOS: open `https://<public-ip>/rootca.pem` → Install Profile →
     Settings → General → About → Certificate Trust Settings → enable **Full
     Trust** for the mkcert CA.
   - Android: open `https://<public-ip>/rootca.pem` → Settings → Security →
     Install a certificate (CA certificate).
   - Desktop: install it once (or run `mkcert -install` on that machine).

5. Open `https://<public-ip>` — clean padlock, no warning, full PWA install
   via Share → **Add to Home Screen**.

Notes:
- Because the SANs include `localhost`/`127.0.0.1`, the same cert serves on-box
  health checks and, on the dev machine, `https://localhost` and
  `https://<lan-ip>` (already the case today — `https://10.192.244.121` works
  with this repo's committed cert).
- The private key is committed in the repo — acceptable for this classroom
  setup, but rotate the pair if this VM ever leaves trusted hands.

## 9. Firewall & hardening

- **GCP firewall**: keep only `tcp:22` (SSH), `tcp:80`, `tcp:443`. Delete the
  default rules that open other ports; 3306/9000/5173/8081 are bound to
  loopback or internal networks already.
- **SSH**: key-only, `PasswordAuthentication no` in `/etc/ssh/sshd_config`.
- **Secrets**: never commit `.env`; rotate `APP_KEY`, `DB_PASSWORD`,
  `DB_ROOT_PASSWORD`.
- **Docker socket** (`/var/run/docker.sock` mounted into backend/worker) is
  the main risk surface when public — see `security-audit-report.md` (SEC-004).
  It's acceptable for a classroom VM; consider docker-socket proxying or a
  dedicated sandbox host if it grows beyond trusted students.
- Each sandbox already runs hardened (`--network none`, `--cap-drop ALL`,
  memory/pids/time limits, read-only root) — no extra action needed there.

## 10. Backup & operations

- **Backup**: stop briefly or use `docker run ... mysqldump`, or take a VM
  disk snapshot weekly (`gcloud compute disks snapshot`). Snapshot the
  `mysql_data` volume before anything destructive.
- **Logs**:
  `docker compose logs -f --tail=100 backend worker nginx`
- **More throughput later**: raise `WORKER_PROCS` in `.env` and recreate the
  worker (`docker compose up -d worker`) — mind the 1 GB ceiling; on GCP the
  next stop is a paid `e2-small/medium` or an Ampere A1 Free VM on Oracle.
- **Code change**: rebuild the one-off `dist`, restart nginx. The freed
  `worker` needs the executor images which rarely change.

---

## Reference

| URL | What |
| --- | --- |
| `https://etecstudio.online` | App (Route A: Caddy + Let's Encrypt) |
| `https://<public-ip>` | App (Route B: mkcert private CA, no domain) |
| `http://localhost:80` on the VM | nginx (frontend + `/api`), loopback only |
| `http://<ip>:80` externally | blocked on purpose — Caddy/nginx own 80/443 |

Free-tier ceiling: ~1 shared vCPU / 1 GB RAM — fine for a classroom (one
sandbox at a time, 5 runs/min per user from the app's own rate limits). If
it ever saturates, the same compose moves as-is to a larger VM.