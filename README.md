# projectU — personal dashboard

A single-user personal dashboard with automations: morning brief, school deadlines, football and Formula 1 (with spoiler mode), quick capture, student budget and networking tools. Runs as a PWA on iPhone (Add to Home Screen) and in desktop browsers, self-hosted on a home server. Notifications go to Web Push and Telegram.

> Status: planning complete, implementation starts with Phase 0 — see [docs/PLAN.md](docs/PLAN.md). Commands marked *(Phase 0)* are confirmed during bootstrap.

## Features
| Area | What it does |
|---|---|
| Morning brief | Weather for your configured locations, deadlines, today's sport — at 07:00 via push + Telegram and in the app |
| Sports calendar | Football (PL, La Liga, CL) + F1 sessions in one local-time timeline with filters |
| iCal feeds | `webcal://` subscriptions for sports and school (schedule only, secret rotatable URL) |
| Spoiler mode | Per sport; hides results everywhere until "watched" or 24 h after the event |
| Telegram bot | Notifications + quick input (`/note`, `/expense 4,50 jedlo`, `/today`, …) |
| Inbox | Fast capture from app or Telegram, triage into deadline/expense/archive |
| Deadlines | Subjects, priority, countdown, reminders D-3/D-1 |
| Football | Liverpool & Barcelona fixtures/results, tables, PL main matches of the round (Liverpool + headline match) |
| Formula 1 | Weekend schedule, results, standings, driver comparison, track overview |
| Network tools | IPv4/IPv6 subnet + VLSM, DNS over HTTPS, my IP & headers, encoders, SHA hashes, ports |
| Budget | Income/expenses in EUR, monthly category limits with alerts, charts |

UI languages: Slovak and English.

## Tech stack
TypeScript (strict) · Turborepo + pnpm · Next.js 16 (App Router, PWA) · Fastify 5 · PostgreSQL 18 · Drizzle ORM · pg-boss · Zod 4 · SimpleWebAuthn (passkeys) · web-push · Vitest · Docker Compose · Caddy.
Details and reasons: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/decisions/](docs/decisions/).

## Repository layout
```
apps/web            Next.js PWA
apps/backend        Fastify API + worker (jobs, notifications, Telegram, iCal)
packages/core-*     shared schemas, domain rules, i18n, API client, net tools, config
docs/               plan, architecture, data model, sources, security, deployment, feature specs, ADRs
ops/                deploy, backup and restore scripts (Phase 0)
```

## Local development
Prerequisites: Node.js 26.1+ (see `.nvmrc`), pnpm 11 (`npm i -g pnpm@11`), Docker (for PostgreSQL and integration tests, from P0-04).
```bash
pnpm install
cp .env.example .env          # set NODE_ENV=development; the backend reads it via `node --env-file-if-exists`
pnpm dev                      # web on http://localhost:3000, backend on http://localhost:4000
```
The backend validates its environment at startup and exits with a list of missing/invalid variables (names and rules only, never values). Variables are added to `apps/backend/src/config.ts` by the subtask that first uses them.

From P0-04 on (database):
```bash
docker compose -f compose.dev.yaml up -d postgres
pnpm --filter @projectu/backend db:migrate
```
Quality gates:
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm format:check
pnpm build                    # Next.js production build (the backend has no build step)
pnpm test:integration         # backend tests against a real PostgreSQL (Testcontainers), from P0-04b
```
The backend runs its TypeScript sources directly on Node 26 (type stripping), so only erasable TypeScript syntax is allowed (`erasableSyntaxOnly`) and relative imports use `.ts` extensions.
Passkeys require a secure context: `localhost` works for development; for testing on the iPhone use the deployed HTTPS instance.

## Environment variables
All variables are documented in [.env.example](.env.example) and validated at backend startup. Secrets live only in `.env` (never committed). Summary:

| Group | Variables |
|---|---|
| General | `NODE_ENV`, `APP_ORIGIN`, `APP_DOMAIN`, `APP_TIMEZONE`, `LOG_LEVEL` |
| Backend | `BACKEND_HOST`, `BACKEND_PORT`, `BACKEND_ROLES`, `TRUST_PROXY_CIDRS` |
| Database | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` |
| Auth | `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `SETUP_TOKEN` (setup only) |
| Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_ID` |
| Data | `FOOTBALL_DATA_API_TOKEN` |
| Ops | `ACME_EMAIL`, `HEALTHCHECKS_HEARTBEAT_URL`, `AGE_RECIPIENT`, `RCLONE_DESTINATION`, `HEALTHCHECKS_BACKUP_URL` |

## Deployment (overview)
Docker Compose on the home server: Caddy (HTTPS) → `web` + `backend` → PostgreSQL. Images are built by GitHub Actions and pulled by the server; `ops/deploy.sh` pulls, migrates and restarts. Nightly encrypted backups go to Backblaze B2. Full guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

First deployment checklist:
1. Router: forward TCP 80 and 443 to the server; DNS A record → public IP.
2. `cp .env.example .env`, fill in, `chmod 600 .env`.
3. `./ops/deploy.sh`
4. Generate VAPID keys (`docker compose run --rm backend node src/cli.ts vapid:generate`), put them in `.env`, redeploy.
5. Open `https://<your-domain>/setup`, register your passkey with `SETUP_TOKEN`, save the recovery codes in your password manager, register a second passkey (laptop), then delete `SETUP_TOKEN` from `.env` and redeploy.

## iPhone installation
1. Open `https://<your-domain>` in **Safari**.
2. Share button → **Add to Home Screen** → Add.
3. Launch the app from the Home Screen icon and sign in with Face ID (passkey).
4. Settings → Notifications → **Enable on this device** → Allow. (Web Push on iOS works only in the Home Screen app, iOS 16.4+.)
5. Settings → Notifications → **Send test notification** to verify.

If push notifications stop arriving (iOS may drop the subscription for rarely opened apps), open the app and re-enable them; Telegram keeps delivering in the meantime.

## Subscribing to the iCal feeds
1. Settings → Calendar feeds → **Sports** (or **School**) → **Rotate / show link** (requires a fresh passkey confirmation).
2. Tap **Open in Calendar** (a `webcal://` link) → Subscribe. Alternatively: iOS Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste the URL.
3. iOS decides the refresh interval (typically hours). Feeds contain schedules only — never results.
4. If a link leaks, rotate it; the old URL stops working immediately and you re-subscribe with the new one.

## Telegram bot setup
1. In Telegram, talk to **@BotFather** → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Generate `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`).
3. Send `/start` to your bot, then run `docker compose run --rm backend node src/cli.ts telegram:whoami` and put the printed chat id into `TELEGRAM_ALLOWED_CHAT_ID`.
4. Run `docker compose run --rm backend node src/cli.ts telegram:set-webhook`.
5. Send `/help` to the bot.

## Data sources & attribution
Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) · Football data provided by [football-data.org](https://www.football-data.org/) · F1 data by [Jolpica F1](https://github.com/jolpica/jolpica-f1) (CC BY-NC-SA 4.0) and [OpenF1](https://openf1.org/) (CC BY-NC-SA 4.0). Personal, non-commercial use only. Details: [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md).

## CI and branch protection
Every push to `main` and every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml): frozen install → format check → typecheck → lint → unit tests → build → `pnpm audit --prod --audit-level high`. Actions are pinned to commit SHAs; Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) proposes weekly grouped updates for npm and GitHub Actions (Docker is added with the Dockerfiles in P0-10a).

Branch protection for `main` (repository ruleset, one-time setup by the owner):
- Settings → Rules → Rulesets → New branch ruleset, target `main` (default branch), enforcement **Active**.
- Enable **Require a pull request before merging** (0 approvals — single maintainer), **Require status checks to pass** with the check `verify`, **Block force pushes**, **Restrict deletions**.
- Merges use **Squash and merge**; the branch is deleted after merge.

## Security
Threat model, auth design and operational rules: [docs/SECURITY.md](docs/SECURITY.md).
