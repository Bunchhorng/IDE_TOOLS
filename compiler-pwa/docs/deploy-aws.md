# Deploy on AWS Free Tier (t3.micro EC2)

AWS alternative to **docs/deploy-free.md** (Google Cloud Always Free). The app
(Laravel API + MySQL + Redis + Docker-sandbox workers + nginx serving the built
PWA) runs on a single `t3.micro` instance, exactly like the GCP guide.

> **Free-tier limit: 12 months.** Unlike GCP's *Always Free*, the AWS Free Tier
> (EC2/RDS) expires after 12 months; afterwards the same setup costs roughly
> **$10–$15/month**. If "free forever" is a hard requirement, prefer the GCP
> guide or Oracle Cloud Always Free instead. If your 12 months are up, the same
> compose lifts onto any ~2 GB VPS unchanged.

Free-tier budget your monthly run must fit in:

| Resource | Free-tier quota | What we use |
| --- | --- | --- |
| EC2 | 750 h/mo `t3.micro` (or `t2.micro`) × 12 mo | 1 × `t3.micro` |
| EBS | 30 GB general-purpose SSD | 30 GB root volume |
| Elastic IP | 1 attached to a running instance | 1 static IP |
| Data transfer | 100 GB/month out | classroom traffic |
| RDS (optional) | `db.t3.micro` MySQL, 20 GB × 12 mo | offloads MySQL `512 MB` |

---

## 1. Create the EC2 instance

1. Create an AWS account and finish billing setup (a card is required even for
   the Free Tier — you are not charged while you stay inside the quota).
2. Go to **EC2 → Instances → Launch instance** and set:
   - **Name**: `coderunner`
   - **AMI**: Ubuntu **24.04 LTS** (x86_64 — matches the sandbox Docker images).
   - **Architecture**: `x86_64` (do **not** pick Graviton/ARM here; the executor
     images in this repo are built for amd64).
   - **Instance type**: `t3.micro` (2 vCPU burstable, 1 GB RAM).
   - **Key pair (login)**: **Create new key pair** → `coderunner` → `.pem`.
     Download it and `chmod 600 coderunner.pem`.
   - **Network settings → Edit**:
     | Type | Source | Purpose |
     | --- | --- | --- |
     | SSH (22) | `My IP` | administration only |
     | HTTP (80) | `0.0.0.0/0` | Caddy TLS challenge + redirects |
     | HTTPS (443) | `0.0.0.0/0` | the app |
     Leave all other ports closed — 3306/9000/5173/8081 are loopback-bound or
     internal already.
   - **Configure storage**: 30 GB `gp3`, encryption default.
3. **Launch.** Note the instance's **Public IPv4** address.

> **t3.micro is burstable.** It banks CPU credits and spends them under load
> (compose builds, frequent concurrent compiles). For steady classroom use the
> baseline (20% of a core) is fine; keep `WORKER_PROCS=1` and the app's own
> rate limits so you never chase your tail on credits.

## 2. Reserve a static IP (Elastic IP)

The default public IP changes on stop/start. Make it permanent (free while
attached to a running instance):

1. **EC2 → Network & Security → Elastic IPs → Allocate Elastic IP address**.
2. Allocate, select it → **Actions → Associate** → your `coderunner` instance.
3. Note the new public IP — this is your permanent address.

> You'll point DNS at this IP (step 8). If `etecstudio.online` is currently
> pointing at the GCP VM, this is the moment you switch it to AWS.

## 3. SSH in and add swap

1 GB RAM is tight (MySQL 512M + Redis 128M + PHP-FPM + one sandbox). Add 2 GB
swap so the OOM killer never eats a request:

```bash
chmod 600 coderunner.pem
ssh -i coderunner.pem ubuntu@<public-ip>

sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Install Docker

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

Log out and back in (or run `newgrp docker`) for the group to apply. Record the
docker group id for later:

```bash
getent group docker        # e.g. docker:x:999:  → note the 999
```

## 5. Get the code and configure `.env`

Ensure the compose context (the repo) is on the instance:

```bash
git clone <your-repo-url> compiler-pwa && cd compiler-pwa
# ...or, if you copy from your laptop instead of cloning:
rsync -av -e "ssh -i ~/Downloads/coderunner.pem" \
  --exclude '.git' --exclude 'node_modules' --exclude '.env' \
  ./ ubuntu@<ip>:~/compiler-pwa/
```

> **SSH key (`.pem`) required.** AWS only accepts your key pair — it rejects
> password or default public-key auth with `Permission denied (publickey)`.
> Use the `.pem` you downloaded at EC2 launch with `ssh -i` / `rsync -e "ssh -i"`.
>
> Lost your `.pem`? It **cannot be recovered** from AWS. Recover the box via
> EC2 Instance Connect (if enabled) → stop the instance → detach the root EBS
> volume → attach it to a temporary instance → add your *new* public key to
> `/mnt/.../home/ubuntu/.ssh/authorized_keys` → reattach and restart. Simpler:
> launch a fresh instance with a new key pair while the volume is detached and
> re-attach that volume. Either way, `chmod 600 <key>.pem` first — SSH rejects
> world-readable keys.

Then:

```bash
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
DOCKER_GROUP_ID=<gid-from-step-4>
EXECUTION_HOST_BASE=$PWD/backend
```

> `EXECUTION_HOST_BASE` must be the **absolute host path** to the repo's
> `backend` folder — the workers bind-mount it so sandboxes see the source.
> Use `/home/ubuntu/compiler-pwa/backend` (not `$PWD`) if you want it permanent.

## 6. Bootstrap everything in one command

The repo ships an idempotent script that does steps 6–8 of the GCP guide for
you — sandbox images, the PWA build, slim PHP-FPM, Caddy, and compose up:

```bash
cd compiler-pwa
DOMAIN=etecstudio.online ./deploy/aws/deploy.sh
```

`DOMAIN` is used for the Caddy TLS config (defaults to `etecstudio.online`;
ignore it if you already copied the repo Caddyfile). Safe to re-run later as an
update after pulling new code. Steps the script performs:

1. Adds the 2 GB swap if missing (idempotent).
2. Runs `./executor/build.sh` → `coderunner/c`, `coderunner/cpp`, `coderunner/python`.
3. Builds `frontend/dist` in a one-off `node:22-alpine` container.
4. Slims PHP-FPM to `pm.max_children = 4` when `.env` still says local.
5. Installs Caddy, writes `/etc/caddy/Caddyfile` from `$DOMAIN`,
   `systemctl enable --now caddy`.
6. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build mysql redis backend worker nginx`.

Then verify:

```bash
docker compose ps                    # all 5 should be Up (healthy)
curl -s http://localhost/health      # → ok
curl -s http://localhost/            # → index.html (the PWA)
```

First boot runs migrations + seeds automatically. Sandbox images live on this
same daemon, so the worker can launch them.

## 7. HTTPS with Caddy (free certs)

This project owns **etecstudio.online**, so use that path (clean padlock, no
per-device CA installs — best for students).

**1. Point DNS at the AWS VM.** At your registrar (Namecheap/GoDaddy/etc.) set
two A records to your **Elastic IP** (this replaces any A records pointing at
the GCP VM):

| Host | Type | Value |
| --- | --- | --- |
| `@` (etecstudio.online) | A | `<Elastic IP>` |
| `www` | A | `<Elastic IP>` |

Set TTL low (~300s) until the cert is live. Verify with
`nslookup etecstudio.online`.

> Keep the domain at its current registrar. Moving it into **Route 53** costs
> **$0.50/domain/month** — not needed.

**2. Caddy auto-issues and renews Let's Encrypt certs.** If you ran
`deploy.sh` above, Caddy is already installed and `/etc/caddy/Caddyfile` is
configured with your `$DOMAIN`. Otherwise:

```bash
sudo apt install -y caddy
sudo cp docker/caddy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
```

**3. Open https://etecstudio.online** — full PWA install (service worker,
offline, Add to Home Screen with the logo) works on iPhone/Android/desktop.

> The repo's alternate mkcert private-CA route (section 8b of deploy-free.md)
> works identically on AWS: place a cert for your public IP in
> `docker/nginx/certs/` and trust the CA once per device.

## 8. Optional: offload MySQL to RDS Free Tier

Frees ~512 MB on the EC2 (nice headroom for builds), at the cost of one extra
service to manage:

1. **RDS → Create database**: Engine **MySQL**, Template **Free tier**,
   `db.t3.micro`, Single-AZ, 20 GB gp3, a strong master password.
   Store credentials in **Secrets Manager** or in `.env`.
2. **Connectivity → Don't connect to EC2**; create a **new security group**
   allowing `tcp:3306` only from the EC2's security group (not 0.0.0.0/0).
3. Point Laravel at RDS and drain the local MySQL:

```dotenv
# .env on the VM
DB_HOST=<rds-endpoint>.rds.amazonaws.com
DB_PORT=3306
DB_DATABASE=compiler
DB_USERNAME=admin
DB_PASSWORD=<rds-password>
```

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend worker
docker compose stop mysql      # local container no longer needed
```

host traffic never touches RDS's public endpoint; the driver connects within
VPC. Snapshots are your RDS backup story.

## 9. Firewall & hardening

- **Security group** stays: `22` (your IP), `80`, `443` only. Everything else
  is loopback or internal.
- **SSH**: key-only, `PasswordAuthentication no` in `/etc/ssh/sshd_config`.
- **Secrets**: never commit `.env`; rotate `APP_KEY`, `DB_PASSWORD`,
  `DB_ROOT_PASSWORD`. The `.pem` key is your root door — keep it offline.
- **Docker socket** (`/var/run/docker.sock` mounted into backend/worker) is the
  main risk surface when public — see `security-audit-report.md` (SEC-004).
  Acceptable for a classroom VM; consider docker-socket proxying or a dedicated
  sandbox host if it grows beyond trusted students.
- Each sandbox already runs hardened (`--network none`, `--cap-drop ALL`,
  memory/pids/time limits, read-only root) — no extra action needed there.

## 10. Backup & operations

- **Backup**: nightly `mysqldump` via a cron job, or take an EC2 **EBS
  snapshot** of the volume (snapshots are cheap). Snapshot before anything
  destructive. If using RDS, enable **automated backups** there too.
- **Logs**: `docker compose logs -f --tail=100 backend worker nginx`.
- **Code change**: `git pull` on the VM then re-run:
  ```bash
  ./deploy/aws/deploy.sh      # rebuilds dist, restarts the stack
  ```
  Sandbox images change rarely, so this is fast.
- **More throughput later**: raise `WORKER_PROCS` in `.env` and recreate the
  worker — mind the 1 GB ceiling / CPU credits. The next natural step up is a
  paid `t3.small/medium` or, for free, the GCP `e2-micro` / Oracle Ampere A1.

---

## Reference

| URL | What |
| --- | --- |
| `https://etecstudio.online` | App (Caddy + Let's Encrypt) |
| `https://<Elastic-IP>` | App (mkcert private-CA route, no domain) |
| `http://localhost:80` on the VM | nginx (frontend + `/api`), loopback only |
| AWS console → EC2 | instance, key pair, EIP, security groups |

Free-tier ceiling: ~1 burstable vCPU / 1 GB RAM — fine for a classroom (one
sandbox at a time, plus the app's 5 runs/min per-user rate limit). The same
compose moves as-is to a bigger instance when the 12-month tier ends or the
classroom outgrows it.



<!-- command for remote to ssh -->

ssh -i ~/Downloads/coderunner.pem ubuntu@15.135.252.174

ls ~/compiler-pwa/deploy/aws/

DOMAIN=etecstudio.online ~/compiler-pwa/deploy/aws/deploy.sh


-----------------------
cd ~/compiler-pwa
git fetch origin production
git checkout -f -B production origin/production
DOMAIN=etecstudio.online ./deploy/aws/deploy.sh
