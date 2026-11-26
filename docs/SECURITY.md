# Security

Single-user app, publicly reachable from the internet, hosted on a home server. Assets worth protecting: personal data (deadlines, budget, notes), the ability to send messages to the owner (Telegram/push), the home server itself, and API keys.

## 1. Trust boundaries
| Boundary | Crossing | Control |
|---|---|---|
| Internet → Caddy | all traffic | TLS 1.2+, HSTS, only ports 80/443 forwarded |
| Caddy → backend/web | internal Docker network | backend/web/postgres not published on host ports |
| Browser → API | authenticated requests | session cookie + Origin check + zod validation |
| Telegram → webhook | unauthenticated POST | secret header + chat allowlist + rate limit + dedupe |
| Calendar app → iCal | unauthenticated GET | unguessable rotatable token, schedule-only data |
| Backend → external APIs | outbound | keys from env, timeouts, response validation |
| Server → B2 | backups | encrypted with `age` before upload |

## 2. Threat model (STRIDE-lite)
| # | Threat | Example | Mitigation |
|---|---|---|---|
| S1 | Spoofing the owner | Stolen session cookie, phishing | Passkeys (phishing-resistant, UV required); `__Host-` cookie `HttpOnly; Secure; SameSite=Lax`; 30-day expiry; session list + revoke; step-up for sensitive actions |
| S2 | Spoofing Telegram | Forged webhook POST to add expenses/notes | `X-Telegram-Bot-Api-Secret-Token` compared in constant time; `message.chat.id` and `from.id` must equal `TELEGRAM_ALLOWED_CHAT_ID`, otherwise ignore (200, no reply); rate limit 60/min |
| S3 | First-run takeover | Attacker registers the first passkey before the owner | Setup requires `SETUP_TOKEN` (env, ≥ 32 random bytes) and only works while zero credentials exist; deploy with the token, complete setup immediately, then remove the token from env |
| T1 | Tampering with requests | Mass assignment, invalid values | zod schemas on every body/query/param with `.strict()`; DB CHECK constraints as second line |
| T2 | CSRF | Cross-site form POST using the cookie | `SameSite=Lax`; state-changing routes accept only `application/json`; `Origin` header must equal `APP_ORIGIN` on non-GET requests (else 403); no state changes on GET |
| T3 | XSS | Note/link content injecting script | React escaping; no `dangerouslySetInnerHTML`; strict nonce-based CSP; links rendered with `rel="noopener noreferrer"` and only `http(s)` schemes |
| R1 | Repudiation / unnoticed access | "Was that login me?" | `auth_event` audit log; Telegram alert on new passkey, recovery-code use, setup, iCal rotation |
| I1 | Information disclosure via iCal | Leaked webcal URL | Token 32 bytes base64url, stored hashed; schedule only (no results, no notes, deadline titles only in school feed); rotation in settings; `last_accessed_at` shown |
| I2 | Error/log leakage | Stack traces, tokens in logs | Generic error bodies; pino `redact` for `authorization`, `cookie`, `x-telegram-bot-api-secret-token`, `token`, query `token`; iCal path token masked in Caddy/app logs |
| I3 | Secret leakage | Keys committed or sent to the client | Secrets only in `.env` (git-ignored, `chmod 600`); `.env.example` without values; web gets no keyed secrets (VAPID public key served by API); CI uses GitHub Actions secrets only for registry push |
| I4 | "My IP & headers" tool leaks | Echoing cookies back | Endpoint is authenticated; strips `cookie`, `authorization` and internal proxy headers from the echo |
| D1 | Brute force / flooding | Login, recovery codes, webhook, iCal spam | `@fastify/rate-limit` (see §6); Caddy request body limit 1 MB; recovery codes 80-bit entropy |
| D2 | Upstream quota exhaustion | Bug loops calling football-data | Per-source token bucket below provider limit; jobs are singleton; cache-first reads |
| E1 | Privilege escalation via recovery session | Recovery-scoped session reading data | `scope='recovery'` allows only passkey registration endpoints; 15-min expiry; upgraded to full session only after a new passkey is registered |
| E2 | Server compromise via dependencies | Malicious package | Minimal dependency list (ARCHITECTURE.md §11), lockfile committed, `pnpm audit` in CI, Renovate/Dependabot weekly, containers run as non-root with read-only root FS where possible |
| E3 | SSRF | User-provided URL fetched by server | The server never fetches user-provided URLs (inbox links are stored only); outbound hosts are fixed per integration |

## 3. Authentication design
See [ADR 0005](decisions/0005-auth-passkeys.md). Flows:
1. **Setup** (once): `POST /api/auth/setup/options` with `SETUP_TOKEN` → registration ceremony → verify → store credential → generate 10 recovery codes (shown once) → full session.
2. **Login**: `POST /api/auth/login/options` (discoverable credentials, no username) → `POST /api/auth/login/verify` → new session (old session rotated).
3. **Step-up**: same assertion flow with existing session → `elevated_until = now + 10 min`.
4. **Recovery**: `POST /api/auth/recovery` with a code → `recovery` session (15 min) → register new passkey → full session; Telegram alert.
5. **Lockout last resort**: on the server, `docker compose run --rm backend node src/cli.ts auth:reset` deletes all credentials and recovery codes and prints a one-time `SETUP_TOKEN`-equivalent valid 15 min. Requires physical/SSH access.
6. **Logout**: deletes session row; "log out everywhere" deletes all sessions.

Challenges are single-use, 5-minute TTL, stored server-side. `expectedOrigin = APP_ORIGIN`, `expectedRPID = WEBAUTHN_RP_ID`. Sign counter checked (0 allowed for synced passkeys per spec).

## 4. Authorization
Single user → authorization = "has a valid full session". Enforced by a Fastify `onRequest` hook registered globally: **every route is authenticated unless it is on the explicit public allowlist**:

| Public route | Protection |
|---|---|
| `GET /api/health/live`, `/api/health/ready` | no data returned |
| `POST /api/auth/setup/*` | `SETUP_TOKEN` + zero credentials |
| `POST /api/auth/login/*`, `POST /api/auth/recovery` | rate limit |
| `POST /api/telegram/webhook` | secret header + chat allowlist |
| `GET /ical/{feed}/{token}.ics` | token |
| `GET /api/push/vapid-public-key` | public by nature |

A test enumerates all registered routes and fails if a non-allowlisted route answers without a session.

## 5. Secure headers
Set by Caddy for all responses unless noted:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (add `preload` only after confirming all subdomains are HTTPS)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Cross-Origin-Opener-Policy: same-origin`
- HTML (Next.js middleware): `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{n}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://cloudflare-dns.com https://dns.google; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'` (style `unsafe-inline` reviewed in P0-07b; drop if Tailwind build allows)
- Service worker script: `Cache-Control: no-cache, no-store, must-revalidate`
- API: `Cache-Control: no-store`; iCal: `private, max-age=900`

## 6. Rate limits (`@fastify/rate-limit`, in-memory store, key = client IP from trusted proxy)
| Route group | Limit |
|---|---|
| `/api/auth/login/*`, `/api/auth/setup/*` | 10 / min, 50 / day |
| `/api/auth/recovery` | 5 / hour |
| `/api/telegram/webhook` | 60 / min |
| `/ical/*` | 60 / hour per IP |
| Authenticated API | 300 / min |
Fastify `trustProxy` is set to the Caddy container network only, so `X-Forwarded-For` cannot be spoofed from outside.

## 7. Secrets handling
| Secret | Where | Rotation |
|---|---|---|
| `DATABASE_URL` / `POSTGRES_PASSWORD` | server `.env` | manual, on suspicion |
| `SETUP_TOKEN` | server `.env` during setup only | remove after setup |
| `VAPID_PRIVATE_KEY` | server `.env` | rotation invalidates all push subscriptions → re-subscribe |
| `TELEGRAM_BOT_TOKEN` | server `.env` | via @BotFather `/revoke`, then re-run `telegram:set-webhook` |
| `TELEGRAM_WEBHOOK_SECRET` | server `.env` | re-run `telegram:set-webhook` |
| `FOOTBALL_DATA_API_TOKEN` | server `.env` | via provider account |
| iCal tokens | DB (hashed) | in-app rotate |
| `age` private key | **offline** (password manager), never on the server | — |
| B2 application key | `rclone.conf` (`chmod 600`, bucket-scoped, no delete permission) | yearly |

Backend validates all env vars with zod at startup and exits on missing/invalid values. Secrets are never logged, never returned by the API, never sent to the browser.

## 8. Backups & recovery
- Nightly `pg_dump -Fc` → `age -r <public key>` → `rclone copy` to B2 bucket (lifecycle: keep 30 days). The server holds only the public key, so a server compromise cannot decrypt old backups.
- B2 key without delete rights + lifecycle rules → ransomware on the server cannot wipe backups.
- Monthly restore drill into a scratch container (`ops/restore-test.sh`), result recorded in `backup_run`.
- Details: [DEPLOYMENT.md](DEPLOYMENT.md#backups).

## 9. Host hardening (home server)
- Only 80/443 forwarded on the router. The owner's existing remote-access method must not expose password-based SSH to the internet (key-only or VPN/tunnel) — checked in P0-10d.
- The previously installed Apache is disabled (`systemctl disable --now apache2`) so only Caddy listens on 80/443.
- `ufw` default deny inbound except 80/443 (+ SSH from LAN).
- Unattended security upgrades (`unattended-upgrades`).
- Docker: containers non-root, `no-new-privileges`, Postgres not published on host.
- Router admin password changed, UPnP disabled.

## 10. Per-change checklist (also in CLAUDE.md)
- [ ] New route is authenticated, or added to the public allowlist with a written reason.
- [ ] Input parsed with zod at the boundary; output serialised through a response schema.
- [ ] No secret in code, logs, client bundle or error messages.
- [ ] External data validated; failures degrade gracefully.
- [ ] Spoiler rule applied for any output containing results.
