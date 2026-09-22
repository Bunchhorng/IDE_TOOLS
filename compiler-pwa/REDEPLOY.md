# REDEPLOY — quick reference after every code change

Day-to-day workflow for shipping `production` to the public server
(**https://etecstudio.online**, AWS free tier). The long-form runbook lives in
`docs/deploy-aws.md` (sections you'll need most: 5, 6, 9, 10).

> Keep `.env` safe. `deploy.sh` only creates it on a fresh box and never
> touches DB passwords once it exists. If `.env` is lost, so is the connection
> to the existing MySQL volume — restore it from backup, don't regenerate.

---

## TL;DR

```bash
# LOCAL — one time setup
cd ~/Documents/MY-PROJECT/IDE        # repo root; app is in compiler-pwa/
git checkout production
git status                            # confirm you're on the right branch

# LOCAL — after each change
# (optional but recommended: type-check before pushing)
cd compiler-pwa/frontend && npm run build && cd ../..

git add <changed files>
git commit -m "describe the change"
git push origin production

# SERVER — after each change
ssh -i ~/Downloads/coderunner.pem ubuntu@13.210.95.182
cd ~/compiler-pwa/compiler-pwa        # ← the app, NOT the repo root
git pull origin production
DOMAIN=etecstudio.online ./deploy/aws/deploy.sh
```

Then hard-refresh in the browser (**Ctrl+Shift+R**) so the new service worker
takes over.

---

## 1. Local (make your change)

1. `cd ~/Documents/MY-PROJECT/IDE` → work on `production` (never merge master in).
2. Frontend-only changes: smoke-test before pushing.

   ```bash
   cd compiler-pwa/frontend
   npm run lint && npm run build      # catches TS/oxlint errors early
   ```

   The server rebuilds `frontend/dist` during deploy, so pushing source is enough.

3. Commit **only intended files**, no secrets: `git status` + `git diff` first.

## 2. Deploy to the server

```bash
ssh -i ~/Downloads/coderunner.pem ubuntu@13.210.95.182
cd ~/compiler-pwa/compiler-pwa
git pull origin production            # pulls the nested app dir
DOMAIN=etecstudio.online ./deploy/aws/deploy.sh
```

What `deploy.sh` does (idempotent, safe to re-run):

- rebuilds the C/C++/Python executor images,
- rebuilds `frontend/dist` in a one-off `node:22-alpine` container,
- rewrites the Caddyfile + restarts Caddy (Let's Encrypt),
- `docker compose up -d --build mysql redis backend worker nginx`;
  backend migrations + seeds run on boot.

## 3. Verify

```bash
docker compose ps                              # 5 containers, mysql/redis Healthy
curl -s http://localhost/health                # → ok
curl -s https://etecstudio.online -I           # → HTTP 2xx over the real domain
```

In the browser: hard refresh (**Ctrl+Shift+R**), then run a project and confirm
the new UI/behaviour. A lingering old version = stale service worker → DevTools
→ Application → Unregister service worker → reload.

## 4. Rollback (if a deploy broke something)

```bash
cd ~/compiler-pwa/compiler-pwa
git log --oneline -5
git checkout production~1 -- <files-that-broke-it>   # or revert the commit
git push origin production
git pull origin production
DOMAIN=etecstudio.online ./deploy/aws/deploy.sh
```

## 5. Pitfalls (all hit in production before)

| Symptom | Cause / fix |
| --- | --- |
| "Something went wrong." on login/register | `.env` DB passwords drifted from the existing MySQL **volume** — re-align: `docker inspect coderunner-mysql --format '{{range .Config.Env}}{{println .}}{{end}}'`, set `DB_PASSWORD`/`DB_ROOT_PASSWORD` in `.env` to match, redeploy. |
| Old UI after deploy | Service worker cache — hard refresh / unregister SW. |
| `address already in use` on :80/:443 | nginx must stay loopback `127.0.0.1:8080:80` (prod override); Caddy owns 80/443. |
| Don't commit `.env`, `.pem`, `dist/`, node_modules | Server regenerates `.env` only once; keep it out of git forever. |

## Reference

- Repo: https://github.com/Bunchhorng/IDE_TOOLS · branch **`production`**
- Server SSH: `ssh -i ~/Downloads/coderunner.pem ubuntu@13.210.95.182`
- Server app path: `~/compiler-pwa/compiler-pwa` (repo root is `~/compiler-pwa`)
- App: https://etecstudio.online · DB: `172.31.43.168` (private, never in DNS)
- Full runbook + incident notes: `docs/deploy-aws.md`