# ADR 0010 — Deployment: Docker Compose + Caddy on the home server

- Status: Accepted
- Date: 2026-11-25

## Context
Physical Ubuntu server at home, 2 GB RAM, port forwarding available, own domain, no existing reverse proxy, no external storage.

## Decision
- **Docker Compose** with services: `caddy`, `web`, `backend`, `postgres`. Backend runs API and worker in one process (`BACKEND_ROLES=api,worker`), splittable later.
- **Caddy** as reverse proxy: automatic HTTPS (Let's Encrypt), HSTS, single origin — `/api/*` and `/ical/*` → backend, everything else → web. Same origin removes CORS and simplifies CSRF.
- **Images are built in GitHub Actions** and pushed to GHCR; the server only pulls (a Next.js build does not fit comfortably in 2 GB RAM).
- **Deploy** = `ops/deploy.sh` run on the server: pull images → run migrations (one-off container) → `docker compose up -d` → readiness check. No inbound SSH from the internet.
- **Backups**: nightly `pg_dump` → `age` encryption → `rclone` to **Backblaze B2 free tier (10 GB)**, lifecycle rule keeps 30 days; monthly restore drill.
- **Swap**: 2 GB swap file as OOM safety net.

## Alternatives
- Bare-metal systemd services — less reproducible. Rejected.
- Nginx + certbot — more moving parts than Caddy. Rejected.
- Cloudflare Tunnel — fallback if the ISP uses CGNAT or blocks 80/443 (see DEPLOYMENT.md).

## Consequences
- + Reproducible, one command to update.
- − Home internet/power outages = missed notifications; mitigated by an external dead-man's-switch (Healthchecks.io free) alerting by e-mail.
