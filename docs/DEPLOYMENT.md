# Deployment

Target: physical Ubuntu server at home, 2 GB RAM, Docker + Docker Compose, router port forwarding, own domain. The app is served at the **root of the owner's existing subdomain** (`APP_DOMAIN`; the real name lives only in the server `.env`, never in the repository). That subdomain currently serves an empty placeholder page from Apache on the same server — Apache is disabled during first deploy (§3 step 0). See [ADR 0010](decisions/0010-deployment.md).

## 1. Topology

```
Internet ──► router (forward TCP 80, 443) ──► server
                                               └─ docker compose
                                                  ├─ caddy    :80 :443  (only published ports)
                                                  ├─ web      :3000     (internal)
                                                  ├─ backend  :4000     (internal)
                                                  └─ postgres :5432     (internal, volume pgdata)
```
Routing (single origin `https://<APP_DOMAIN>`): `/api/*`, `/ical/*` → backend; everything else → web.

## 2. Network prerequisites (check before Phase 0 deploy)
| Check | How | If it fails |
|---|---|---|
| Public IPv4 (no CGNAT) | Router WAN IP equals the IP shown by an external "what is my IP" site | Ask ISP for public IP, or use **Cloudflare Tunnel** (no port forwarding; TLS terminated at Cloudflare) |
| Ports 80/443 not blocked by ISP | From mobile data: `curl -I http://<public-ip>` after forwarding | Cloudflare Tunnel |
| Static public IP | **Confirmed by owner** (static IP, domain DNS points to it) | — |
| DNS A record | `<APP_DOMAIN>` → public IPv4 (no AAAA needed; Telegram webhooks are IPv4-only anyway) | — |

## 3. Server preparation (one-time)
0. Free ports 80/443: `sudo systemctl disable --now apache2`, then `sudo ss -tlnp | grep -E ':(80|443) '` must print nothing. Keep `/etc/apache2` untouched (easy rollback); uninstall later once the app is live. Record the result in PLAN.md (P0-10d).
1. Ubuntu LTS, updated; `unattended-upgrades` enabled; create a non-root user with sudo.
2. Install Docker Engine + Compose plugin from Docker's official apt repository.
3. Create 2 GB swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` + `/etc/fstab`; `vm.swappiness=10`.
4. `ufw default deny incoming; ufw allow 80,443/tcp; ufw allow from 192.168.0.0/16 to any port 22` (adjust LAN range). Note: Docker-published ports bypass ufw — only Caddy publishes ports, intentionally.
5. `apt install age rclone` (or rclone from rclone.org if the apt version is old).
6. `mkdir -p /opt/projectu && cd /opt/projectu`; place `compose.yaml`, `Caddyfile`, `ops/`, `.env` (`chmod 600`).
7. Log in to GHCR with a read-only token (`docker login ghcr.io`) if the repo/images are private.

## 4. Compose services (finalised in P0-10b)
| Service | Image | Memory limit | Notes |
|---|---|---|---|
| `caddy` | `caddy:2` | 64 MB | volumes `caddy_data`, `caddy_config`; `Caddyfile` mounted read-only |
| `web` | `ghcr.io/<owner>/projectu-web:<tag>` | 320 MB | Next.js `output: 'standalone'`, `node server.js`, non-root |
| `backend` | `ghcr.io/<owner>/projectu-backend:<tag>` | 320 MB | `BACKEND_ROLES=api,worker`; healthcheck `GET /api/health/ready` |
| `postgres` | `postgres:18` | 384 MB | `shared_buffers=128MB`, `effective_cache_size=384MB`, `work_mem=4MB`, `maintenance_work_mem=64MB`, `max_connections=30`; volume `pgdata` |

All services: `restart: unless-stopped`, `security_opt: [no-new-privileges:true]`, log driver `json-file` with `max-size: 10m, max-file: 5`. Expected steady-state total ≈ 0.8–1.1 GB.

## 5. Caddyfile (shape)
```
{
  email {$ACME_EMAIL}
}
{$APP_DOMAIN} {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
    Cross-Origin-Opener-Policy "same-origin"
    -Server
  }
  request_body { max_size 1MB }
  handle /api/* { reverse_proxy backend:4000 }
  handle /ical/* { reverse_proxy backend:4000 }
  handle { reverse_proxy web:3000 }
  log { output stdout; format json }   # iCal tokens masked by a log filter (P3-07b)
}
```
Certificates: Let's Encrypt via HTTP-01 (port 80) / TLS-ALPN-01 (port 443), automatic renewal.

## 6. CI/CD
GitHub Actions (`.github/workflows/`):
1. `ci.yml` on every push/PR: install (pnpm, cached) → `typecheck` → `lint` → `test` (unit) → `test:integration` (Testcontainers PostgreSQL) → `build`.
2. `release.yml` on push to `main` (after CI green): build `web` and `backend` images (multi-stage; `linux/amd64` once the server CPU is confirmed as x86_64, otherwise multi-arch `linux/amd64,linux/arm64` via buildx), tag `sha-<short>` + `main`, push to GHCR.

Deploy (manual, on the server; no inbound SSH from the internet):
```
cd /opt/projectu && ./ops/deploy.sh [tag]   # default: main
```
`deploy.sh` steps:
1. `docker compose pull web backend`
2. `docker compose run --rm backend node dist/cli.js db:migrate` (forward-only migrations; abort on failure)
3. `docker compose up -d --remove-orphans`
4. Wait for `backend` healthcheck healthy (timeout 90 s) → print status; on failure print last 100 log lines and exit non-zero.
Rollback: `./ops/deploy.sh sha-<previous>` (only safe if the migration was backward compatible — migrations follow expand/contract: never drop/rename a column in the same release that stops using it).

Post-first-deploy one-offs:
- `docker compose run --rm backend node dist/cli.js telegram:set-webhook` (registers `https://<APP_DOMAIN>/api/telegram/webhook` with `secret_token`, `allowed_updates`, `setMyCommands`).
- `docker compose run --rm backend node dist/cli.js vapid:generate` (prints keys to put into `.env`; run once).
- Open `https://<APP_DOMAIN>/setup`, register the first passkey with `SETUP_TOKEN`, store recovery codes, remove `SETUP_TOKEN` from `.env`, `docker compose up -d backend`.

## 7. Backups
`ops/backup.sh`, run by a systemd timer at 02:30 local time:
```
pg_dump (inside postgres container, -Fc) | age -r "$AGE_RECIPIENT" > /var/backups/projectu/db-YYYYMMDD.dump.age
rclone copy /var/backups/projectu b2-projectu:projectu-backups --max-age 48h
find /var/backups/projectu -mtime +7 -delete       # keep 7 days locally
backend cli backup:record (success/size)  +  curl Healthchecks.io ping (success or /fail)
```
- Storage: **Backblaze B2** free 10 GB; bucket lifecycle "keep only last 30 days"; application key scoped to the bucket **without delete permission**.
- Encryption: `age` key pair generated on your PC; **only the public key** (`AGE_RECIPIENT`) is on the server; the private key lives in your password manager (+ a printed copy).
- Also back up `.env` and `caddy_data` (encrypted, same flow, weekly).
- Restore: `rclone copy` → `age -d -i key.txt` → `pg_restore --clean --if-exists -d projectu`. Monthly drill: `ops/restore-test.sh` restores into a throwaway `postgres:18` container and runs a row-count sanity query.

## 8. Monitoring
| What | How |
|---|---|
| Liveness/readiness | Docker healthcheck on `/api/health/ready`; Compose restarts unhealthy containers |
| Server/internet down | Healthchecks.io (free; chosen, D6) heartbeat from `system.heartbeat` every 5 min; e-mail after 15 min silence |
| Backup failure | backup script pings Healthchecks.io `/fail`; System page shows last `backup_run` |
| Data source failures | `data_source_status` + Telegram system notification after 3 consecutive failures |
| Job failures | System page (pg-boss failed jobs, last 7 days) |
| Logs | `docker compose logs -f backend` (JSON; pipe through `jq`) |
| Disk | System page shows DB size; cleanup job keeps tables bounded |

## 9. Updates
- App: merge to `main` → images built → `./ops/deploy.sh`.
- OS: `unattended-upgrades` (security); monthly `apt full-upgrade` + reboot.
- Base images: Renovate/Dependabot PRs; Postgres minor upgrades by pulling `postgres:18` (same major). Major upgrade = dump/restore, planned task.

## 10. Facts and assumptions
- Server CPU architecture unknown (owner checks `lscpu` later) → multi-arch images `linux/amd64,linux/arm64` until confirmed. *(Owner decision.)*
- The server runs 24/7; a UPS is recommended but not required. *(Confirmed by owner, A9.)*
- Static public IP and DNS A record confirmed by the owner.
- The owner already has working remote access to the server and can deploy from anywhere; the method is managed outside this repository. P0-10d checks that it does not expose password-based SSH to the internet.
- Off-site backups: Backblaze B2 (owner already has an account). Outage/backup monitoring: Healthchecks.io. *(Owner decision D6.)*
