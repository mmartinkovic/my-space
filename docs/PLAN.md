# Technical plan

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done. Update the checkbox on the **subtask** line; a parent task is done when all its subtasks are done.

Related: [ARCHITECTURE](ARCHITECTURE.md) · [DATA-MODEL](DATA-MODEL.md) · [DATA-SOURCES](DATA-SOURCES.md) · [SECURITY](SECURITY.md) · [DEPLOYMENT](DEPLOYMENT.md) · [features/](features/) · [decisions/](decisions/)

## How to work this plan (LLM-sized subtasks)
The plan is split into **small, self-contained subtasks** (IDs like `P0-06c`) so that each can be finished in one focused session with little context, consistently and cheaply.

- **One subtask per session, branch and PR.** Branch `feat/<id>-<slug>` (e.g. `feat/p0-03a-config-logger`) from an up-to-date `main`; Conventional Commits; open a PR; merge when CI is green. Commit only when the owner asks (CLAUDE.md).
- **Read only what the subtask lists** under *Ctx* (plus `CLAUDE.md`). Don't scan the whole repo or all docs; open other files only when the code you touch imports them.
- **Stay inside *Files*.** Needing to touch other areas means the subtask is mis-scoped — stop and propose a split or a plan change.
- **Size rule:** one concern, roughly ≤ 8 files changed, tests included. If a subtask turns out bigger, split it here (`P0-06c` → `P0-06c1`, `P0-06c2`) before continuing.
- **Done** = `pnpm typecheck && pnpm lint && pnpm test` (+ `pnpm test:integration` when backend/DB is touched) green, *Done* criteria met, no placeholders/TODOs, docs updated if facts changed, SECURITY.md §10 checklist run, checkbox ticked.
- **(owner)** marks subtasks that need the owner's hands (accounts, server, iPhone). Agents prepare scripts and checklists; the owner executes and reports results, which are recorded under "Deployment records".
- Field keys: **Files** = scope · **Do** = what to build · **Done** = acceptance + tests · **Ctx** = the only docs to read · **Deps** = subtasks merged first.

## Test checkpoints (owner)
At the end of each subtask below, the agent tells the owner exactly how to try it out.

| After | What the owner can try | Where |
|---|---|---|
| P0-01d | `pnpm dev` → empty page on :3000, backend answers on :4000 (technical smoke test) | dev PC |
| P0-07c | First real flow: setup + passkey login (Windows Hello) | dev PC, localhost |
| P0-10d | First version on the iPhone: HTTPS on the own domain, Add to Home Screen, Face ID login | iPhone + server |
| P1-01c, P1-03b | Test push notification; test message from the Telegram bot | iPhone |
| P2-03b | First useful features: deadlines and inbox | iPhone |
| P3-07c | Sports calendar, spoiler mode, iCal subscription | iPhone |
| P4-04 | **MVP** — morning brief, daily use | iPhone |

## Milestones
| Phase | Theme | Outcome |
|---|---|---|
| 0 | Foundation | Monorepo, CI, DB, auth, PWA shell, jobs, deploy & backups on the home server |
| 1 | Notifications core | Web Push + Telegram delivery pipeline with quiet hours |
| 2 | School & inbox | Deadlines with reminders, quick capture (app + Telegram) |
| 3 | Sports core | Football + F1 schedule/results, spoiler mode, unified calendar, iCal |
| 4 | Morning brief | Weather, brief via push/Telegram/app, dashboard |
| **— MVP cut —** | | Daily-usable app: brief, deadlines, inbox, sports calendar, spoilers, iCal, Telegram |
| 5 | Budget | Transactions, limits, alerts, charts, Telegram quick add |
| 6 | Football extended | Tables, main matches of the round (Liverpool + headline), CL |
| 7 | F1 extended | Standings, driver comparison, track overview |
| 8 | Network tools | Subnet/VLSM, IPv6, DNS, encoders, hashes, whoami, ports |
| 9 | Polish | Upgrades, accessibility, smoke tests |

## Owner prerequisites (prepare before the listed subtask)
| Item | Needed by | Status |
|---|---|---|
| Node 26, pnpm 11, Docker Desktop (WSL2), `gh` login on the dev PC | P0-01a | done 2026-11-26 |
| Public GitHub repo `my-space`, commits with GitHub noreply e-mail | P0-02 | noreply set 2026-11-26; repo published after the docs commit |
| Healthchecks.io account + checks `heartbeat`, `backup` | P0-09b, P0-11b | — |
| Server: Apache disabled, Docker installed (DEPLOYMENT.md §3) | P0-10d | — |
| Backblaze B2 bucket + bucket-scoped key without delete permission | P0-11b | account exists |
| `age` key pair generated on the PC (private key in password manager) | P0-11b | — |
| Telegram bot via @BotFather | P1-03a | — |
| football-data.org API token (free registration) | P3-01b | — |

---

## Phase 0 — Foundation

### P0-01 Monorepo bootstrap
#### [x] P0-01a Workspace root
- **Files:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.gitattributes`
- **Do:** Node 26 pinned (`.nvmrc`, `engines`), pnpm 11 pinned (`packageManager`), lockfile committed; turbo tasks `dev`, `build`, `typecheck`, `lint`, `test`, `test:integration`; `format` / `format:check` run Prettier at the root. pnpm settings (`engineStrict`) live in `pnpm-workspace.yaml` (no `.npmrc`). `.gitattributes` forces LF (`* text=auto eol=lf`) so shell scripts and Docker builds work from a Windows checkout. Markdown docs are excluded from Prettier (hand-formatted tables).
- **Done:** `pnpm install` succeeds; `pnpm typecheck`, `pnpm lint`, `pnpm test` run (no-op) without error.
- **Ctx:** ADR 0001, ADR 0009. **Deps:** —

#### [x] P0-01b `core-config` (tsconfig, ESLint, Vitest presets)
- **Files:** `packages/core-config/**`
- **Do:** tsconfig bases (`base`, `library`, `node`, `nextjs`) with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`. ESLint flat config: `no-explicit-any`, `consistent-type-assertions` (`assertionStyle: never`; confirm `as const` stays allowed, else configure), `no-non-null-assertion`, `switch-exhaustiveness-check`, `no-floating-promises`, `no-misused-promises`, `no-empty` (incl. catch), `no-restricted-imports` for deep `@projectu/*/…`, `no-restricted-exports` default with exceptions for Next.js special files (`page`, `layout`, `loading`, `error`, `not-found`, `route`, `manifest`, `middleware`, config files). Vitest preset.
- **Done:** a lint fixture test proves `any`, `as X`, `!` and a default export fail while `as const` passes.
- **Notes (done 2026-11-26):** exports `@projectu/core-config/eslint` (`createEslintConfig({ rootDir, ignores })`, based on `strictTypeChecked`), `/vitest` (`vitestPreset`), `/tsconfig/*.json`. Extra rules from CLAUDE.md: no `enum`, `type` over `interface`, type-only imports, no `console`. TypeScript pinned to **6.0.3** (typescript-eslint 8.74 supports `<6.1`; TS 7 later). Root dev tools: `typescript`, `eslint`, `vitest`, `vite` (required peer of Vitest). pnpm 11 rejects releases younger than its minimum release age — versions were pinned to the previous release (`vite` 8.3.8, `@types/node` 26.6.10) instead of adding exclusions.
- **Ctx:** CLAUDE.md "Coding conventions", ADR 0001 "Rules". **Deps:** P0-01a

#### [x] P0-01c Core package skeletons
- **Files:** `packages/core-{schemas,domain,nettools,i18n,api-client}/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts,src/index.ts,src/index.test.ts}`, `packages/core-config/{eslint,tsconfig,test}/**`
- **Do:** one entry point each (`exports: { ".": "./src/index.ts" }`), named exports, one sample unit test per package.
- **Done:** `pnpm test` runs 5 green tests; a deep import of a package is a lint error.
- **Notes (done 2026-11-26):** each package ships one small real export instead of a dummy: `localeSchema`/`Locale` (schemas, adds `zod`), `defaultLocale` (i18n, depends on schemas), `assertNever` (domain), `isIpv4Address` (nettools), `joinUrl` (api-client). `core-config` gained: `universal: true` option (forbids `node:*` imports and Node globals in runtime `core-*` code), a tooling tsconfig used by ESLint for root `*.config.*` files (Node types stay out of `src`), `no-undef` off (TypeScript reports it), and `.ts` extensions in relative imports (`allowImportingTsExtensions` + `rewriteRelativeImportExtensions`).
- **Ctx:** ADR 0001. **Deps:** P0-01b

#### [x] P0-01d App skeletons + confirmed commands
- **Files:** `apps/backend/{package.json,tsconfig.json,src/main.ts}`, `apps/web/**` (minimal Next.js 16 App Router page, `next.config.ts` with `transpilePackages`, `output: 'standalone'`), `CLAUDE.md` (Commands section), `README.md` (Local development)
- **Do:** backend runs TypeScript natively on Node 26 (`node --watch src/main.ts`, no build step); web imports one symbol from a core package to prove wiring.
- **Done:** `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` work; CLAUDE.md commands table marked confirmed.
- **Notes (done 2026-11-26):** backend = minimal Fastify bootstrap (no routes yet; P0-03 adds config, errors, health), imports `isIpv4Address` to prove wiring; no `tsx` — Node 26 type stripping runs `src/*.ts` and workspace sources directly (ADR 0009), `erasableSyntaxOnly` added to the base tsconfig. Web = Next.js 16.4.6 / React 19.3.1, `<html lang>` from `core-i18n`, `next-env.d.ts` git-ignored, `typecheck` runs `next typegen` first. Apps get `test` scripts with their first tests (P0-03a, P0-07a). Verified: `pnpm dev` serves both apps, `pnpm build` builds the web app. CLI paths in docs changed from `node dist/cli.js` to `node src/cli.ts`. Dev servers bind to `127.0.0.1` (backend via new `BACKEND_HOST`, default `127.0.0.1`; the container sets `0.0.0.0`) — P0-03a moves it into the zod config.
- **Ctx:** ADR 0001, ADR 0009, README "Local development". **Deps:** P0-01c

### P0-02 CI and dependency hygiene
#### [x] P0-02 CI workflow, Dependabot, branch protection
- **Files:** `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`
- **Do:** CI on push/PR: install (pnpm cache) → typecheck → lint → test → build on Node 26; `pnpm audit --prod` (fail on high/critical). Dependabot weekly for npm, GitHub Actions, Docker. Document branch protection on `main` (required CI check) in README.
- **Done:** CI green on this PR; branch protection enabled by the owner.
- **Notes (done 2026-11-26):** single job `verify` (also the required status check); actions pinned to commit SHAs (checkout v7.0.1, pnpm/action-setup v6.1.1, setup-node v7.1.0); pnpm version from `packageManager`, Node from `.nvmrc`; `format:check` added to the pipeline; Next/Turbo telemetry off in CI. Dependabot: npm + github-actions, grouped, relying on its documented default 3-day cooldown; the Docker ecosystem is added in P0-10a (no Dockerfiles yet). `test:integration` joins CI in P0-04b.
- **Ctx:** DEPLOYMENT.md §6. **Deps:** P0-01d

### P0-03 Backend skeleton
#### [ ] P0-03a Config & logger
- **Files:** `apps/backend/src/{config.ts,logger.ts,main.ts}`, tests
- **Do:** zod-validated env (process exits with a readable list of missing/invalid vars); pino JSON logger with the `redact` list.
- **Done:** tests: missing var → readable error; redacted keys never appear in log output.
- **Ctx:** `.env.example`, SECURITY.md §2 (I2), §7. **Deps:** P0-01d

#### [ ] P0-03b Errors & validation
- **Files:** `apps/backend/src/{app.ts,errors.ts,plugins/error-handler.ts}`, tests
- **Do:** `buildApp()` factory; `AppError` union + single error handler (`{ error: { code, message } }`, no stack traces); 404 shape; `@fastify/type-provider-zod` wired.
- **Done:** `app.inject` tests for 404 shape, validation error shape, internal error hides details.
- **Ctx:** ARCHITECTURE.md §8. **Deps:** P0-03a

#### [ ] P0-03c Health, roles, proxy trust, shutdown
- **Files:** `apps/backend/src/{modules/system/health.routes.ts,roles.ts,main.ts}`, tests
- **Do:** `GET /api/health/live`, `/api/health/ready` (checks registered dependencies; DB added in P0-04b); `trustProxy` limited to `TRUST_PROXY_CIDRS`; `BACKEND_ROLES` toggles api/worker; `SIGTERM` closes server, pg-boss and pool within 10 s.
- **Done:** inject tests for both health routes; unit test of role parsing.
- **Ctx:** ARCHITECTURE.md §9, SECURITY.md §6 (last line). **Deps:** P0-03b

### P0-04 Database & migrations
#### [ ] P0-04a Drizzle setup & migration CLI
- **Files:** `apps/backend/src/db/{client.ts,schema/index.ts}`, `apps/backend/drizzle.config.ts`, `apps/backend/src/cli.ts` (`db:migrate`), `compose.dev.yaml`, `docs/decisions/0003-orm-drizzle.md`
- **Do:** decide the Drizzle version per ADR 0003 and pin it in the ADR; `compose.dev.yaml` runs `postgres:18`; scripts `db:generate`, `db:migrate`.
- **Done:** `docker compose -f compose.dev.yaml up -d postgres` + `pnpm --filter @projectu/backend db:migrate` work on an empty schema.
- **Ctx:** ADR 0002, ADR 0003, DATA-MODEL.md "Conventions". **Deps:** P0-03c

#### [ ] P0-04b Integration test harness
- **Files:** `apps/backend/test/{db.ts,setup-integration.ts}`, `apps/backend/vitest.integration.config.ts`, readiness DB check, `.github/workflows/ci.yml` (add `pnpm test:integration` step)
- **Do:** Testcontainers helper: fresh PostgreSQL per test file with migrations applied; `test:integration` script; `/api/health/ready` checks the DB.
- **Done:** integration test: ready → 200 with DB, 503 when the DB is unreachable.
- **Ctx:** CLAUDE.md "Testing". **Deps:** P0-04a

#### [ ] P0-04c First migration: enums, settings, auth tables
- **Files:** `apps/backend/src/db/schema/{enums.ts,settings.ts,auth.ts}`, generated migration, tests
- **Do:** enums needed so far, `app_settings` (seeded singleton), `webauthn_credential`, `recovery_code`, `webauthn_challenge`, `session`, `auth_event`.
- **Done:** integration tests: CHECK constraints reject invalid rows (e.g. `app_settings.id = 2`, session `expires_at < created_at`).
- **Ctx:** DATA-MODEL.md "Conventions", "Enums", "Settings & auth". **Deps:** P0-04b

### P0-05 Shared foundations
#### [ ] P0-05a `core-i18n` dictionaries & formatters
- **Files:** `packages/core-i18n/src/**`
- **Do:** `sk` source dictionary, `en` typed via `satisfies` (missing key = type error); parameterised messages; formatters: date/time in zone, relative time, EUR, numbers.
- **Done:** plural tests (sk 1 / 2–4 / 5+), formatter tests with explicit zone.
- **Ctx:** ADR 0008. **Deps:** P0-01c

#### [ ] P0-05b `core-domain/time`
- **Files:** `packages/core-domain/src/time/**`
- **Do:** `toUtcInstant({ localDate, localTime, zone })`, `startOfLocalDay`, `startOfLocalMonth` with `date-fns` + `@date-fns/tz`.
- **Done:** DST tests (2027-03-28, 2027-10-31 and current-year equivalents); non-existent/ambiguous local times documented and tested.
- **Ctx:** ADR 0011. **Deps:** P0-01c

#### [ ] P0-05c `core-domain/quiet-hours`
- **Files:** `packages/core-domain/src/quiet-hours/**`
- **Do:** `isInQuietHours`, `nextQuietHoursEnd` with explicit `now` and zone; windows wrapping midnight.
- **Done:** table-driven tests incl. DST nights and midnight wrap.
- **Ctx:** features/notifications.md "Rules". **Deps:** P0-05b

#### [ ] P0-05d `core-schemas` base + `core-api-client`
- **Files:** `packages/core-schemas/src/{common.ts,errors.ts,health.ts}`, `packages/core-api-client/src/**`
- **Do:** error response schema, health schema, branded id helpers; client with typed `get/post/patch/delete`, zod-parsed responses, `ApiError` union, injectable auth strategy (cookie / bearer).
- **Done:** client tests with a fake `fetch` (success, API error, network error, schema mismatch).
- **Ctx:** ARCHITECTURE.md §8, §10. **Deps:** P0-01c

### P0-06 Authentication backend
#### [ ] P0-06a Sessions & global auth hook
- **Files:** `apps/backend/src/plugins/auth.ts`, `apps/backend/src/modules/auth/{session.service.ts,session.repository.ts,auth-event.ts}`, tests
- **Do:** opaque token (SHA-256 hash stored), `__Host-session` cookie with exact flags, 30-day sliding expiry, global `onRequest` hook with the public allowlist, `auth_event` writer; **route-enumeration test**.
- **Done:** every non-allowlisted route → 401 without a session (test iterates all registered routes).
- **Ctx:** ADR 0005, SECURITY.md §3–4, DATA-MODEL.md `session`, `auth_event`. **Deps:** P0-04c

#### [ ] P0-06b Origin check, JSON-only, rate limits
- **Files:** `apps/backend/src/plugins/{csrf-origin.ts,rate-limit.ts}`, tests
- **Do:** non-GET requires `Origin == APP_ORIGIN` and `application/json`; rate limits per SECURITY.md §6.
- **Done:** tests: foreign Origin → 403, form content type → 415, limit exceeded → 429.
- **Ctx:** SECURITY.md §2 (T2), §6. **Deps:** P0-06a

#### [ ] P0-06c Setup flow (first passkey + recovery codes)
- **Files:** `apps/backend/src/modules/auth/{setup.routes.ts,webauthn.service.ts,challenge.repository.ts,recovery-codes.ts}`, `apps/backend/test/webauthn-authenticator.ts`, tests
- **Do:** `POST /api/auth/setup/{options,verify}` guarded by `SETUP_TOKEN` + zero credentials; challenges single-use, 5 min TTL; 10 recovery codes (stored hashed) returned once; full session.
- **Done:** tests: wrong token → 401, second setup → 404, codes stored hashed, challenge reuse rejected.
- **Ctx:** features/auth.md, SECURITY.md §3 (1), DATA-MODEL.md `webauthn_*`, `recovery_code`. **Deps:** P0-06b

#### [ ] P0-06d Login & logout
- **Files:** `apps/backend/src/modules/auth/{login.routes.ts,logout.routes.ts}`, tests
- **Do:** discoverable-credential login (options/verify), session rotation, sign-counter check, logout, log out everywhere.
- **Done:** tests: login creates session, unknown credential rejected, logout deletes session, "everywhere" deletes all.
- **Ctx:** SECURITY.md §3 (2, 6). **Deps:** P0-06c

#### [ ] P0-06e Step-up, passkey management, sessions list
- **Files:** `apps/backend/src/modules/auth/{step-up.routes.ts,credentials.routes.ts,sessions.routes.ts}`, tests
- **Do:** step-up assertion → `elevated_until` = now + 10 min; list/add/rename/delete passkeys (step-up required, last one undeletable); list/revoke sessions.
- **Done:** tests: sensitive action without step-up → 403; deleting the last passkey → 409.
- **Ctx:** SECURITY.md §3 (3), features/auth.md. **Deps:** P0-06d

#### [ ] P0-06f Recovery codes flow
- **Files:** `apps/backend/src/modules/auth/recovery.routes.ts`, tests
- **Do:** `POST /api/auth/recovery` → recovery-scoped session (15 min, passkey registration only); code consumed; regenerate codes (step-up). Telegram alert is a hook (no-op until P1-03b).
- **Done:** tests: code single-use, recovery session blocked from other routes, regeneration invalidates the old batch.
- **Ctx:** SECURITY.md §2 (E1), §3 (4). **Deps:** P0-06e

#### [ ] P0-06g CLI `auth:reset`
- **Files:** `apps/backend/src/cli.ts`, `apps/backend/src/modules/auth/reset.ts`, tests
- **Do:** deletes credentials + recovery codes, prints a one-time setup token valid 15 min.
- **Done:** integration test of the reset function.
- **Ctx:** SECURITY.md §3 (5). **Deps:** P0-06f

### P0-07 Web shell
#### [ ] P0-07a App shell, i18n, data layer
- **Files:** `apps/web/src/app/{layout.tsx,page.tsx}`, `apps/web/src/{i18n,lib,providers}/**`, Tailwind config
- **Do:** Tailwind, mobile-first nav (Dashboard, Calendar, School, Inbox, Budget, F1, Tools, Settings — unimplemented items hidden, no dummy content), dark mode via `prefers-color-scheme`, locale from settings / `Accept-Language`, TanStack Query provider, API client instance.
- **Done:** component test: nav renders only enabled items, in sk and en.
- **Ctx:** ADR 0008, ARCHITECTURE.md §7 (Client row). **Deps:** P0-05a, P0-05d

#### [ ] P0-07b CSP middleware & headers
- **Files:** `apps/web/src/middleware.ts`, tests
- **Do:** nonce-based CSP per SECURITY.md §5; service worker script served `no-cache`.
- **Done:** test calls the middleware and asserts the CSP header and nonce.
- **Ctx:** SECURITY.md §5. **Deps:** P0-07a

#### [ ] P0-07c Auth pages
- **Files:** `apps/web/src/app/{setup,login,recovery}/**`, `apps/web/src/features/auth/**`
- **Do:** WebAuthn ceremonies via `@simplewebauthn/browser`; recovery codes shown once with copy/download.
- **Done:** component tests for login and recovery forms (validation, error states).
- **Ctx:** features/auth.md. **Deps:** P0-07b, P0-06f

#### [ ] P0-07d Settings → Security page
- **Files:** `apps/web/src/app/settings/security/**`, `apps/web/src/features/auth/**`
- **Do:** passkeys list/add/rename/remove, recovery codes count/regenerate, sessions revoke, recent `auth_event`s; step-up prompt UX.
- **Done:** component test: step-up prompt appears on a step-up-required error.
- **Ctx:** features/settings-and-system.md "Settings" (Security row). **Deps:** P0-07c

### P0-08 PWA basics
#### [ ] P0-08a Manifest & icons
- **Files:** `apps/web/src/app/manifest.ts`, `apps/web/public/icons/**`, layout meta tags
- **Do:** `display: standalone`, `id`, `start_url`, theme colours, 192/512 + maskable + apple-touch-icon.
- **Done:** unit test of the manifest object.
- **Ctx:** DATA-SOURCES.md §7. **Deps:** P0-07a

#### [ ] P0-08b Service worker & install guide
- **Files:** `apps/web/public/sw.js` (or build-generated), SW registration, `apps/web/src/features/pwa/**`
- **Do:** SW scope `/`, caches app shell + offline fallback page only, versioned per build; "Install on iPhone" guide in Safari when not standalone.
- **Done:** unit test of the standalone detection helper. The iPhone install check happens in P0-10d.
- **Ctx:** ARCHITECTURE.md §7 (Service worker row). **Deps:** P0-08a, P0-07b

### P0-09 Jobs & integration foundation
#### [ ] P0-09a pg-boss & job registry
- **Files:** `apps/backend/src/jobs/{boss.ts,registry.ts}`, tests
- **Do:** pg-boss started in the worker role; typed job names + cron (UTC) registry; stopped on shutdown.
- **Done:** integration test: a registered job is executed.
- **Ctx:** ADR 0004, ARCHITECTURE.md §4 (job table). **Deps:** P0-04b

#### [ ] P0-09b System tables, cleanup, heartbeat
- **Files:** `apps/backend/src/db/schema/system.ts`, migration, `apps/backend/src/modules/system/{cleanup.job.ts,heartbeat.job.ts}`, `docs/DATA-SOURCES.md` §9, tests
- **Do:** tables `api_cache`, `data_source_status`, `backup_run`; `system.cleanup` (expired sessions/challenges for now); `system.heartbeat` pings `HEALTHCHECKS_HEARTBEAT_URL` when set. Verify the Healthchecks ping API and update DATA-SOURCES.md §9.
- **Done:** integration: cleanup deletes only expired rows; heartbeat calls a local fake server and is skipped when the env var is empty.
- **Ctx:** DATA-MODEL.md "Briefs, cache, system", DATA-SOURCES.md §9. **Deps:** P0-09a

#### [ ] P0-09c HTTP integration base
- **Files:** `apps/backend/src/integrations/http/{fetch-json.ts,limiter.ts,source-status.ts}`, tests
- **Do:** token-bucket limiter; `fetchJson({ source, url, schema, limiter, timeoutMs })` → `Result`; failure counting + system-notification hook (no-op until P1-03b).
- **Done:** limiter tests (fake clock); `fetchJson` tests against a local HTTP server: timeout, non-2xx, schema mismatch, 429 `Retry-After`.
- **Ctx:** DATA-SOURCES.md "Common rules", ARCHITECTURE.md §4. **Deps:** P0-09b

### P0-10 Containers, compose, first deploy
#### [ ] P0-10a Dockerfiles
- **Files:** `apps/backend/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore`, `.github/dependabot.yml` (add the `docker` ecosystem)
- **Do:** multi-stage, non-root, pnpm pinned, Next.js standalone output; image label with the git SHA.
- **Done:** both images build locally; containers start and answer health / home page.
- **Ctx:** DEPLOYMENT.md §4. **Deps:** P0-08b, P0-09c

#### [ ] P0-10b Compose, Caddyfile, deploy script
- **Files:** `compose.yaml`, `Caddyfile`, `ops/deploy.sh`
- **Do:** services, memory limits, log rotation, `no-new-privileges`; `deploy.sh`: pull → migrate → up → health wait (90 s), last 100 log lines on failure.
- **Done:** local stack runs with `APP_DOMAIN=localhost`; `shellcheck ops/deploy.sh` is clean.
- **Ctx:** DEPLOYMENT.md §1, §4–6. **Deps:** P0-10a

#### [ ] P0-10c Release workflow
- **Files:** `.github/workflows/release.yml`
- **Do:** on `main` after CI: build multi-arch images (`linux/amd64,linux/arm64`, D9), tag `sha-<short>` + `main`, push to GHCR (public).
- **Done:** images visible in GHCR after merge.
- **Ctx:** DEPLOYMENT.md §6. **Deps:** P0-10b, P0-02

#### [ ] P0-10d First production deploy (owner)
- **Files:** `docs/PLAN.md` (Deployment records), `docs/DEPLOYMENT.md` (corrections)
- **Do:** owner follows DEPLOYMENT.md §2–3 (incl. step 0: disable Apache) and the §6 first-deploy one-offs; confirm the remote-access method doesn't expose password-based SSH; record network checks.
- **Done:** HTTPS certificate issued; headers checked with `curl -I`; `/setup` completed on iPhone; `SETUP_TOKEN` removed; PWA installs on iPhone and shows the offline page in airplane mode; results recorded.
- **Ctx:** DEPLOYMENT.md, SECURITY.md §9. **Deps:** P0-10c

### P0-11 Backups
#### [ ] P0-11a Backup script, systemd units, `backup:record`
- **Files:** `ops/backup.sh`, `ops/systemd/projectu-backup.{service,timer}`, `apps/backend/src/modules/system/backup-record.ts`, `apps/backend/src/cli.ts`, tests
- **Do:** `pg_dump -Fc | age -r` → `rclone copy` → 7-day local retention → `backup:record` → Healthchecks ping (success or `/fail`); weekly encrypted `.env` + `caddy_data` archive.
- **Done:** `shellcheck` clean; integration test of `backup:record`.
- **Ctx:** DEPLOYMENT.md §7, SECURITY.md §8. **Deps:** P0-10b, P0-09b

#### [ ] P0-11b B2, age, rclone on the server (owner)
- **Files:** `docs/DEPLOYMENT.md` (record facts)
- **Do:** bucket + 30-day lifecycle + key without delete permission; `age` key pair generated offline, public key on the server; `rclone.conf` (`chmod 600`); timer enabled; Healthchecks `backup` check.
- **Done:** first nightly run succeeded and pinged Healthchecks; object visible in B2.
- **Ctx:** DEPLOYMENT.md §7, DATA-SOURCES.md §8–9. **Deps:** P0-11a, P0-10d

#### [ ] P0-11c Restore drill
- **Files:** `ops/restore-test.sh`
- **Do:** restore the latest backup into a throwaway `postgres:18` container, run a row-count sanity query, record in `backup_run`.
- **Done:** drill executed once successfully (log excerpt in the PR description).
- **Ctx:** DEPLOYMENT.md §7 (Restore). **Deps:** P0-11b

### P0-12 System page (skeleton)
#### [ ] P0-12a System summary endpoint
- **Files:** `apps/backend/src/modules/system/{summary.routes.ts,summary.service.ts}`, `packages/core-schemas/src/system.ts`, tests
- **Do:** `data_source_status`, failed pg-boss jobs (7 days), last `backup_run`, app version (image label), DB size.
- **Done:** integration test of the endpoint (session required).
- **Ctx:** features/settings-and-system.md "System page". **Deps:** P0-09c, P0-06a

#### [ ] P0-12b System page UI
- **Files:** `apps/web/src/features/system/**`, `apps/web/src/app/system/**`
- **Done:** component test: empty states and failing-source highlighting.
- **Ctx:** features/settings-and-system.md "System page". **Deps:** P0-12a, P0-07a

---

## Phase 1 — Notifications core

### P1-01 Web Push subscriptions
#### [ ] P1-01a Push subscription API & VAPID
- **Files:** `apps/backend/src/db/schema/push.ts`, migration, `apps/backend/src/modules/push/{routes.ts,service.ts,repository.ts}`, `cli.ts` (`vapid:generate`), tests
- **Do:** `GET /api/push/vapid-public-key` (allowlisted), subscribe / unsubscribe / list / rename.
- **Done:** integration CRUD tests; route-enumeration test still green.
- **Ctx:** ADR 0006, DATA-MODEL.md `push_subscription`. **Deps:** P0-09c, P0-06a

#### [ ] P1-01b Push sender & payload builder
- **Files:** `packages/core-domain/src/notifications/push-payload.ts`, `apps/backend/src/modules/push/sender.ts`, test-send route, tests
- **Do:** Declarative Web Push payload (< 2 KB) + SW fallback fields; `web-push` send with TTL; 404/410 deletes the subscription, other errors increment `failure_count`.
- **Done:** payload unit tests (size, required fields); integration with a fake push endpoint for 201/410.
- **Ctx:** DATA-SOURCES.md §7, ADR 0006. **Deps:** P1-01a

#### [ ] P1-01c Web: enable push on device (owner test)
- **Files:** `apps/web/src/features/notifications/**`, SW `push` + `notificationclick` handlers, `docs/DATA-SOURCES.md` §7
- **Do:** subscribe button only in standalone mode on iOS (explanation otherwise), permission requested on tap, test-notification button; verify the HTTPS requirement in Apple docs and note it in DATA-SOURCES.md §7.
- **Done:** component test of the standalone gate; owner: push received on iPhone with the app closed (recorded).
- **Ctx:** DATA-SOURCES.md §7. **Deps:** P1-01b, P0-08b

### P1-02 Notification pipeline
#### [ ] P1-02a Notification tables
- **Files:** `apps/backend/src/db/schema/notifications.ts`, migration (+ seeded preferences), `packages/core-schemas/src/notifications.ts`, tests
- **Do:** `notification`, `notification_delivery`, `notification_preference`, `event_reminder_rule`.
- **Done:** constraint tests (unique `dedupe_key`, unique delivery per channel).
- **Ctx:** DATA-MODEL.md "Notifications", features/notifications.md "Default routing". **Deps:** P1-01a

#### [ ] P1-02b Deferral & expiry decision
- **Files:** `packages/core-domain/src/notifications/dispatch-decision.ts`, tests
- **Do:** pure decision send / defer to quiet-hours end / expire, given the notification, quiet hours, exempt types and `now`.
- **Done:** table-driven tests (exempt types, deferral past expiry, DST).
- **Ctx:** ARCHITECTURE.md §5, features/notifications.md "Rules". **Deps:** P0-05c

#### [ ] P1-02c Planner `upsertDesired`
- **Files:** `apps/backend/src/modules/notifications/{planner.ts,repository.ts}`, tests
- **Do:** insert / reschedule / cancel by `dedupe_key` within a scope.
- **Done:** integration: reschedule on time change, cancel on removal, idempotent re-run.
- **Ctx:** ARCHITECTURE.md §5, ADR 0004. **Deps:** P1-02a

#### [ ] P1-02d Dispatcher job
- **Files:** `apps/backend/src/modules/notifications/{dispatcher.ts,dispatch.job.ts,channels/push.ts}`, tests
- **Do:** every minute, `FOR UPDATE SKIP LOCKED LIMIT 20`, decision from P1-02b, per-channel delivery insert-then-send, retries ×3, final statuses.
- **Done:** integration: no double send after a simulated crash between claim and delivery insert; quiet-hours deferral; expired notification never sent.
- **Ctx:** ARCHITECTURE.md §5. **Deps:** P1-02b, P1-02c, P1-01b

#### [ ] P1-02e Notification settings & recent list
- **Files:** settings routes in `apps/backend/src/modules/notifications/`, `apps/web/src/features/notifications/**`, System page section
- **Do:** type × channel matrix, quiet hours; upcoming + last 50 notifications on the System page.
- **Done:** integration: settings update re-plans; component test of the matrix.
- **Ctx:** features/notifications.md, features/settings-and-system.md. **Deps:** P1-02d, P0-12b

### P1-03 Telegram outbound
#### [ ] P1-03a Telegram client
- **Files:** `apps/backend/src/integrations/telegram/{client.ts,html.ts,schemas.ts}`, `docs/DATA-SOURCES.md` §6, tests
- **Do:** verify HTML formatting rules in the Bot API docs and record them; escaping; `sendMessage`, `editMessageText`, `answerCallbackQuery`; 429 `retry_after`; ≤ 4096 truncation helper.
- **Done:** escaping tests (all special chars, user content with `<`, `&`); client tests against a local fake Bot API.
- **Ctx:** DATA-SOURCES.md §6. **Deps:** P0-09c

#### [ ] P1-03b Telegram channel & system alerts
- **Files:** `apps/backend/src/modules/notifications/channels/telegram.ts`, wiring of the P0-06f / P0-09c hooks, test-message route + settings button
- **Do:** dispatcher channel; ≥ 3 consecutive source failures → `system` notification; auth alerts (new passkey, recovery-code use, setup, iCal rotation).
- **Done:** integration: system notification created once per source per day; Telegram delivery recorded.
- **Ctx:** ARCHITECTURE.md §5, SECURITY.md §2 (R1). **Deps:** P1-03a, P1-02d

### P1-04 Telegram webhook & commands skeleton
#### [ ] P1-04a Webhook route
- **Files:** `apps/backend/src/db/schema/telegram.ts`, migration, `apps/backend/src/modules/telegram/webhook.routes.ts`, tests
- **Do:** constant-time secret check, chat allowlist (foreign chats ignored silently), dedupe by `update_id`, rate limit.
- **Done:** integration: missing/wrong secret → 401; foreign chat ignored and nothing stored; duplicate `update_id` processed once.
- **Ctx:** features/telegram-bot.md "Webhook handling", SECURITY.md §2 (S2). **Deps:** P1-03a, P0-06b

#### [ ] P1-04b Command router, `/start`, `/help`, CLIs
- **Files:** `packages/core-domain/src/telegram-commands/**`, `apps/backend/src/modules/telegram/router.ts`, `cli.ts` (`telegram:whoami`, `telegram:set-webhook`), `getWebhookInfo` in settings
- **Done:** parser unit tests; integration: `/help` reply sent to the fake Bot API.
- **Ctx:** features/telegram-bot.md "Setup", "Commands". **Deps:** P1-04a

---

## Phase 2 — School & inbox

### P2-01 Subjects & deadlines
#### [ ] P2-01a Deadlines backend
- **Files:** `apps/backend/src/db/schema/school.ts`, migration, `apps/backend/src/modules/deadlines/**`, `packages/core-schemas/src/deadlines.ts`, tests
- **Done:** integration CRUD + validation + constraint (`done` ⇔ `completed_at`).
- **Ctx:** features/deadlines.md, DATA-MODEL.md "School". **Deps:** P0-06a

#### [ ] P2-01b School UI: list, filters, form
- **Files:** `apps/web/src/features/school/**`, `apps/web/src/app/school/**`, countdown formatter in `core-i18n`
- **Done:** countdown formatter unit tests; component test of filters.
- **Ctx:** features/deadlines.md. **Deps:** P2-01a, P0-07a

#### [ ] P2-01c Subjects in settings
- **Files:** `apps/web/src/features/school/settings/**`
- **Done:** component test: an archived subject is hidden from the deadline form.
- **Ctx:** features/settings-and-system.md "Settings" (School row). **Deps:** P2-01b

### P2-02 Deadline reminders
#### [ ] P2-02a Reminder rules
- **Files:** `packages/core-domain/src/reminders/**`
- **Done:** unit tests: offsets, past skip, DST, override, empty array.
- **Ctx:** features/deadlines.md "Rules", "Edge cases". **Deps:** P0-05b

#### [ ] P2-02b Reminder planner wiring
- **Files:** `apps/backend/src/modules/deadlines/reminders.planner.ts`, tests
- **Done:** integration: update reschedules, done cancels, reopen re-plans.
- **Ctx:** ARCHITECTURE.md §5. **Deps:** P2-02a, P2-01a, P1-02c

#### [ ] P2-02c Reminder settings UI
- **Files:** settings defaults + per-deadline override in `apps/web/src/features/school/**`
- **Done:** component test of the override form.
- **Ctx:** features/deadlines.md. **Deps:** P2-02b, P2-01b

### P2-03 Inbox
#### [ ] P2-03a Inbox backend
- **Files:** `apps/backend/src/db/schema/inbox.ts`, migration, `apps/backend/src/modules/inbox/**`, URL extraction in `core-domain`, tests
- **Done:** URL extraction unit tests; atomic convert-to-deadline integration test.
- **Ctx:** features/inbox.md, DATA-MODEL.md "Inbox". **Deps:** P2-01a

#### [ ] P2-03b Inbox UI
- **Files:** `apps/web/src/features/inbox/**` (global "+" capture, list, triage → deadline / archive / delete, history)
- **Done:** component tests: capture appears in the list; triage actions.
- **Ctx:** features/inbox.md. **Deps:** P2-03a, P0-07a

### P2-04 Telegram capture & school commands
#### [ ] P2-04 `/note`, plain text, `/deadlines`
- **Files:** `packages/core-domain/src/telegram-commands/**`, `apps/backend/src/modules/telegram/commands/**`
- **Done:** parser tests (sk/en aliases); integration: note created once per update; replies localised.
- **Ctx:** features/telegram-bot.md "Commands". **Deps:** P1-04b, P2-03a

---

## Phase 3 — Sports core

### P3-01 football-data integration & fixtures sync
#### [ ] P3-01a Sports tables & seeds
- **Files:** `apps/backend/src/db/schema/sports.ts`, migration, seeds (competitions PL, PD, CL)
- **Do:** `competition`, `team`, `sport_event`, `football_match`.
- **Done:** constraint tests (unique `(provider, external_id)`, one headline per matchday).
- **Ctx:** DATA-MODEL.md "Sports" (`competition` … `football_match`). **Deps:** P0-04c

#### [ ] P3-01b football-data client & mapper (recorded fixtures)
- **Files:** `apps/backend/src/integrations/football-data/{client.ts,schemas.ts,mapper.ts,__fixtures__/*}`, `docs/DATA-SOURCES.md` §2
- **Do:** record real responses (needs the API token); status mapping; limiter ≤ 8 req/min honouring `X-RequestsAvailable`; confirm team ids 64/81; record field semantics (`SCHEDULED` vs `TIMED`).
- **Done:** mapper unit tests on the fixtures.
- **Ctx:** DATA-SOURCES.md §2. **Deps:** P0-09c

#### [ ] P3-01c Fixtures sync job
- **Files:** `apps/backend/src/modules/football/{sync.job.ts,repository.ts}`, tests
- **Do:** idempotent upserts by `(provider, external_id)`; `is_followed` for favourites; teams refreshed weekly.
- **Done:** integration: sync twice → no duplicates; kickoff time change updates the row.
- **Ctx:** features/football.md "Favourites & followed events", "Sync & polling". **Deps:** P3-01a, P3-01b

### P3-02 Football live polling & results
#### [ ] P3-02a Polling window rule
- **Files:** `packages/core-domain/src/football/polling.ts`
- **Done:** unit tests of the window logic.
- **Ctx:** DATA-SOURCES.md §2 (Matchday polling row). **Deps:** P0-05b

#### [ ] P3-02b `football.poll-live` job
- **Files:** `apps/backend/src/modules/football/poll-live.job.ts`, tests
- **Do:** self-gating; sets `finished_at` on first `FINISHED`/`AWARDED`; emits a result domain event.
- **Done:** integration with fake provider responses TIMED → IN_PLAY → FINISHED.
- **Ctx:** features/football.md "Sync & polling". **Deps:** P3-02a, P3-01c

### P3-03 F1 schedule sync (Jolpica)
#### [ ] P3-03a F1 tables
- **Files:** `apps/backend/src/db/schema/f1.ts`, migration
- **Do:** `f1_circuit`, `f1_weekend`, `f1_session`, `f1_driver`, `f1_constructor`, `f1_session_result`.
- **Done:** constraint tests.
- **Ctx:** DATA-MODEL.md "F1". **Deps:** P3-01a

#### [ ] P3-03b Jolpica client & mapper
- **Files:** `apps/backend/src/integrations/jolpica/**` incl. sprint + normal weekend fixtures
- **Do:** custom User-Agent; limiter ≤ 2 req/s and ≤ 400/h; sprint vs normal weekend mapping; session `ends_at` estimates.
- **Done:** mapper tests on both fixtures.
- **Ctx:** DATA-SOURCES.md §3. **Deps:** P0-09c

#### [ ] P3-03c F1 schedule sync job
- **Files:** `apps/backend/src/modules/f1/sync.job.ts`, tests
- **Done:** idempotent re-sync integration test; all sessions followed.
- **Ctx:** features/f1.md §1. **Deps:** P3-03a, P3-03b

### P3-04 F1 session results
#### [ ] P3-04a OpenF1 sessions & session_result
- **Files:** `apps/backend/src/integrations/openf1/**` (sessions, session_result only)
- **Done:** `session_key` mapping unit tests on recorded fixtures.
- **Ctx:** DATA-SOURCES.md §4. **Deps:** P0-09c

#### [ ] P3-04b `f1.poll-results` job
- **Files:** `apps/backend/src/modules/f1/poll-results.job.ts`, Jolpica results/qualifying/sprint calls, tests
- **Do:** fast results from OpenF1 ≥ 35 min after session end, canonical points from Jolpica; `finished_at` set once; result event emitted once.
- **Done:** integration: OpenF1 first then Jolpica → single finished transition, results merged.
- **Ctx:** features/f1.md §2. **Deps:** P3-04a, P3-03c

### P3-05 Spoiler mode
#### [ ] P3-05a Spoiler rule
- **Files:** `packages/core-domain/src/spoiler/**`
- **Done:** table-driven tests (followed/unfollowed, watched, 24 h from finish, spoiler off, not finished).
- **Ctx:** features/spoiler-mode.md "Rule", ARCHITECTURE.md §6. **Deps:** P0-05b

#### [ ] P3-05b Spoiler settings & watch API
- **Files:** schema `spoiler_setting`, `event_watch`, migration, `apps/backend/src/modules/sports/{spoiler.routes.ts,spoiler.service.ts}`, tests
- **Done:** integration: watch/unwatch idempotent; settings validated.
- **Ctx:** DATA-MODEL.md "Spoilers". **Deps:** P3-05a, P3-01a

#### [ ] P3-05c Redaction in sports read endpoints
- **Files:** `apps/backend/src/modules/sports/{read.service.ts,redact.ts}`, match / F1 result endpoints, tests
- **Done:** integration: hidden result absent from JSON; watch reveals; auto-reveal after 24 h with an injected clock.
- **Ctx:** features/spoiler-mode.md "Where it applies". **Deps:** P3-05b, P3-02b, P3-04b

### P3-06 Unified calendar
#### [ ] P3-06a Events endpoint
- **Files:** `apps/backend/src/modules/sports/events.routes.ts`, `packages/core-schemas/src/sports.ts`, tests
- **Do:** filters + keyset pagination, redaction applied.
- **Done:** integration (filters, pagination, redaction).
- **Ctx:** features/sports-calendar.md. **Deps:** P3-05c

#### [ ] P3-06b Calendar UI
- **Files:** `apps/web/src/features/calendar/**`, `apps/web/src/app/calendar/**`
- **Done:** local-day grouping across DST unit tests; component test of filters.
- **Ctx:** features/sports-calendar.md. **Deps:** P3-06a, P0-07a

### P3-07 iCal feeds
#### [ ] P3-07a RFC 5545 writer
- **Files:** `apps/backend/src/modules/ical/writer.ts`, tests
- **Done:** folding at 75 octets incl. multi-byte chars, escaping, CRLF, stable UIDs.
- **Ctx:** features/ical-feed.md "Rules". **Deps:** P0-01d

#### [ ] P3-07b Feed endpoints & token rotation
- **Files:** schema `ical_feed_token`, migration, `apps/backend/src/modules/ical/{routes.ts,service.ts}`, Caddyfile log filter, tests
- **Do:** sports + school feeds, hashed tokens, rotation with step-up, `last_accessed_at`.
- **Done:** integration: no score in the feed; rotation → old token 404; public allowlist unchanged except the feed route.
- **Ctx:** features/ical-feed.md, SECURITY.md §2 (I1). **Deps:** P3-07a, P3-06a, P2-01a, P0-06e

#### [ ] P3-07c Calendar feeds settings UI (owner test)
- **Files:** `apps/web/src/features/settings/calendar-feeds/**`
- **Done:** component test (masked URL, rotate requires step-up); owner: iPhone subscription works (recorded).
- **Ctx:** README "Subscribing to the iCal feeds". **Deps:** P3-07b

### P3-08 Sports notifications
#### [ ] P3-08a Sports notification renderers
- **Files:** `packages/core-domain/src/notifications/render/sports.ts`
- **Done:** renderer tests (spoiler on/off, sk/en, push and Telegram variants).
- **Ctx:** features/notifications.md, features/spoiler-mode.md. **Deps:** P3-05a, P0-05a

#### [ ] P3-08b Football notification planner
- **Files:** `apps/backend/src/modules/football/notifications.planner.ts`, tests
- **Done:** integration: kickoff moved → rescheduled; postponed/cancelled → notifications cancelled; result notification once.
- **Ctx:** features/notifications.md "Default routing". **Deps:** P3-08a, P3-02b, P1-02c

#### [ ] P3-08c F1 notification planner
- **Files:** `apps/backend/src/modules/f1/notifications.planner.ts`, tests
- **Done:** integration: session time change reschedules; result notification once.
- **Ctx:** features/notifications.md. **Deps:** P3-08a, P3-04b, P1-02c

#### [ ] P3-08d Telegram "Watched" callback
- **Files:** `apps/backend/src/modules/telegram/callbacks/watched.ts`, tests
- **Done:** integration: callback marks watched idempotently and edits the message to include the result.
- **Ctx:** features/telegram-bot.md, features/spoiler-mode.md. **Deps:** P3-08b, P1-04b, P3-05b

---

## Phase 4 — Morning brief & dashboard

### P4-01 Weather
#### [ ] P4-01a Weather table, client, refresh job
- **Files:** schema `weather_location` (no seed), migration, `apps/backend/src/integrations/open-meteo/**` + multi-location fixture, `apps/backend/src/modules/weather/refresh.job.ts`, tests
- **Done:** mapper test on the fixture; at-most-one-primary constraint test.
- **Ctx:** features/weather.md, DATA-SOURCES.md §1, DATA-MODEL.md `weather_location`. **Deps:** P0-09c

#### [ ] P4-01b Locations API & settings UI
- **Files:** geocoding proxy route, location CRUD (primary, show in brief, reorder), `apps/web/src/features/weather/settings/**`
- **Done:** integration: first location becomes primary; deleting the primary promotes the next; duplicate name → 409.
- **Ctx:** features/weather.md "Rules", "Edge cases". **Deps:** P4-01a, P0-07a

#### [ ] P4-01c Weather widget
- **Files:** `apps/web/src/features/weather/widget/**`, WMO labels in `core-i18n`
- **Done:** WMO mapping completeness test (all documented codes in sk/en); component test: primary first, stale badge, empty prompt, attribution.
- **Ctx:** features/weather.md. **Deps:** P4-01b

### P4-02 Morning brief
#### [ ] P4-02a `composeBrief` & renderers
- **Files:** `packages/core-domain/src/brief/**`
- **Done:** unit tests: sections, empty states, truncation, spoiler, weather = primary + `show_in_brief` locations.
- **Ctx:** features/morning-brief.md. **Deps:** P3-05a, P0-05a

#### [ ] P4-02b Brief planning & generation
- **Files:** schema `morning_brief`, migration, `apps/backend/src/modules/brief/{planner.ts,generate.ts,routes.ts}`, tests
- **Done:** integration: brief time change re-plans; DST-day scheduling; `/api/brief/:date` returns a redacted snapshot.
- **Ctx:** features/morning-brief.md "Rules", "Edge cases". **Deps:** P4-02a, P4-01a, P3-08b, P2-02b

#### [ ] P4-02c Brief page & `/today`
- **Files:** `apps/web/src/app/brief/[date]/**`, `apps/backend/src/modules/telegram/commands/today.ts`
- **Done:** component test of the page; integration test of `/today`.
- **Ctx:** features/morning-brief.md, features/telegram-bot.md "Commands". **Deps:** P4-02b

### P4-03 Dashboard
#### [ ] P4-03a Dashboard layout & widget boundary
- **Files:** `apps/web/src/features/dashboard/{layout,widget-boundary}/**`
- **Done:** component tests: a widget error card or stale indicator doesn't affect sibling widgets.
- **Ctx:** ARCHITECTURE.md §8 (UI line). **Deps:** P0-07a

#### [ ] P4-03b Dashboard widgets
- **Files:** `apps/web/src/features/dashboard/widgets/**`
- **Do:** brief summary (link to full), weather, next 3 followed events with countdown, deadlines (next 5 + overdue), inbox count.
- **Done:** component tests per widget (data, empty, error).
- **Ctx:** features/sports-calendar.md, features/deadlines.md. **Deps:** P4-03a, P4-02c, P4-01c, P3-06b, P2-03b

### P4-04 MVP hardening
#### [ ] P4-04 MVP hardening (owner checklist)
- **Do:** SECURITY.md §10 over the codebase; production headers; iPhone checklist (install, login, push with app closed, Telegram, iCal subscribe, brief at 07:00 next morning) recorded; restore drill repeated; README verified end-to-end.
- **Done:** full suite green; route-enumeration test covers all routes.
- **Ctx:** SECURITY.md §10, README. **Deps:** P4-03b, P0-11c

## ═══ MVP cut ═══

---

## Phase 5 — Budget

### P5-01 Budget domain & backend
#### [ ] P5-01a Money & budget rules
- **Files:** `packages/core-domain/src/{money,budget}/**`
- **Done:** money parsing/formatting tests (comma decimal, cents); limit status at exact thresholds.
- **Ctx:** features/budget.md "Rules". **Deps:** P0-01c

#### [ ] P5-01b Budget backend
- **Files:** schema (`budget_category` + seed, `budget_limit_override`, `budget_transaction`), migration, `apps/backend/src/modules/budget/**`, tests
- **Done:** integration CRUD, idempotent create, alias uniqueness, monthly overview endpoint.
- **Ctx:** features/budget.md, DATA-MODEL.md "Budget". **Deps:** P5-01a, P0-06a

### P5-02 Budget UI
#### [ ] P5-02a Quick add & transaction list
- **Files:** `apps/web/src/features/budget/{quick-add,transactions}/**`
- **Done:** quick-add validation tests; numeric keypad with comma decimal, usable one-handed on iPhone.
- **Ctx:** features/budget.md. **Deps:** P5-01b, P0-07a

#### [ ] P5-02b Month view, categories & limits, CSV export
- **Files:** `apps/web/src/features/budget/{month,settings,export}/**`
- **Done:** CSV serializer test (escaping, matches the current filter).
- **Ctx:** features/budget.md. **Deps:** P5-02a

### P5-03 … P5-06
#### [ ] P5-03 Charts & dashboard budget widget
- **Files:** `apps/web/src/features/budget/components/charts/**`, dashboard budget widget
- **Done:** scale/axis helper tests; accessible charts (title, `aria` description, data-table toggle); responsive.
- **Ctx:** features/budget.md. **Deps:** P5-02b, P4-03a

#### [ ] P5-04 Budget alerts
- **Files:** `apps/backend/src/modules/budget/alerts.planner.ts`, tests
- **Done:** integration: 80 % / 100 % alert once per category per month.
- **Ctx:** features/budget.md "Acceptance criteria". **Deps:** P5-01b, P1-02c

#### [ ] P5-05 Telegram budget commands
- **Files:** `packages/core-domain/src/telegram-commands/**` (`/expense`, `/income`, `/budget`), undo callback
- **Done:** parser tests (amount formats, categories with/without diacritics, errors); integration: redelivery creates one transaction; undo within 10 min.
- **Ctx:** features/telegram-bot.md "Commands". **Deps:** P5-01b, P1-04b

#### [ ] P5-06 Inbox → expense
- **Files:** inbox triage action + pre-fill parser
- **Done:** atomic conversion integration test.
- **Ctx:** features/inbox.md. **Deps:** P5-02a, P2-03b

---

## Phase 6 — Football extended

### P6-01 Standings & tables
#### [ ] P6-01a Standings sync & snapshots
- **Files:** schema `football_standing`, migration, standings mapper in `apps/backend/src/integrations/football-data/`, `apps/backend/src/modules/football/standings.job.ts`
- **Done:** mapper test; snapshot selection unit tests.
- **Ctx:** DATA-MODEL.md `football_standing`, DATA-SOURCES.md §2. **Deps:** P3-01c

#### [ ] P6-01b Tables UI with spoiler `asOf`
- **Files:** standings endpoint, `apps/web/src/features/football/tables/**`
- **Done:** integration: hidden followed match → previous matchday served with `asOf`.
- **Ctx:** features/football.md "Tables", features/spoiler-mode.md. **Deps:** P6-01a, P3-05c

### P6-02 Main matches of the round (Liverpool + headline)
#### [ ] P6-02a Main-matches rule
- **Files:** `packages/core-domain/src/football/main-matches.ts`
- **Done:** rule tests listed in features/football.md (tiers, tie-breaks, Liverpool excluded, matchday 1 with promoted teams).
- **Ctx:** features/football.md "Main matches of the PL round". **Deps:** P0-01c

#### [ ] P6-02b Freeze, settings, markers, notifications
- **Files:** sync hook in `apps/backend/src/modules/football/`, settings (top-listed teams, extra count), calendar/brief markers, planner update
- **Done:** integration: one headline per matchday; decision frozen after a table change; headline gets favourite notifications.
- **Ctx:** features/football.md. **Deps:** P6-02a, P6-01a, P3-08b

#### [ ] P6-03 Champions League view
- **Files:** CL fixtures/results UI; league-phase table if the standings endpoint supports it (verify, update DATA-SOURCES.md §2)
- **Done:** mapper tests on recorded CL fixtures.
- **Ctx:** features/football.md "Tables". **Deps:** P6-01a

---

## Phase 7 — F1 extended

#### [ ] P7-01 OpenF1 laps, stints, drivers, location
- **Files:** `apps/backend/src/integrations/openf1/**` extension, permanent cache, limiter 2 req/s & 25 req/min, `docs/DATA-SOURCES.md` §4
- **Done:** field lists verified with live requests and recorded; mapper tests on fixtures.
- **Ctx:** DATA-SOURCES.md §4. **Deps:** P3-04a

### P7-02 Standings & results UI
#### [ ] P7-02a F1 standings sync & endpoint
- **Done:** snapshot selection unit tests; integration for standings redaction.
- **Ctx:** features/f1.md §2, features/spoiler-mode.md. **Deps:** P3-05c

#### [ ] P7-02b F1 standings & results pages
- **Done:** component tests (hidden state, `asOf` banner).
- **Ctx:** features/f1.md §2. **Deps:** P7-02a

### P7-03 Driver comparison
#### [ ] P7-03a Comparison aggregates
- **Files:** `packages/core-domain/src/f1/comparison.ts`
- **Done:** tests: H2H with missing rounds, DNFs, hidden rounds excluded.
- **Ctx:** features/f1.md §3. **Deps:** P7-01, P7-02a

#### [ ] P7-03b Comparison endpoint & UI
- **Done:** integration test of the endpoint; component test using the chart components.
- **Ctx:** features/f1.md §3. **Deps:** P7-03a, P5-03

### P7-04 Track overview
#### [ ] P7-04a Circuit facts & past winners
- **Files:** `apps/backend/src/modules/f1/data/circuit-facts.ts`, past-winners call (verify the Jolpica route, update DATA-SOURCES.md §3)
- **Done:** past-winners mapper test.
- **Ctx:** features/f1.md §4, DATA-SOURCES.md §3. **Deps:** P3-03b

#### [ ] P7-04b Track outline generation
- **Files:** `packages/core-domain/src/f1/outline.ts`, outline storage
- **Done:** normalisation + RDP simplification unit tests.
- **Ctx:** features/f1.md §4, DATA-SOURCES.md §4. **Deps:** P7-01

#### [ ] P7-04c Track overview page
- **Done:** component test (missing outline → graceful fallback; weekend weather shown).
- **Ctx:** features/f1.md §4. **Deps:** P7-04a, P7-04b, P4-01a

---

## Phase 8 — Network tools

### P8-01 IPv4 subnet calculator & VLSM
#### [ ] P8-01a IPv4 subnet library
- **Files:** `packages/core-nettools/src/ipv4/**`
- **Done:** IPv4 part of features/network-tools.md "Acceptance criteria".
- **Ctx:** features/network-tools.md. **Deps:** P0-01c

#### [ ] P8-01b VLSM library
- **Files:** `packages/core-nettools/src/vlsm/**`
- **Done:** VLSM part of features/network-tools.md "Acceptance criteria".
- **Ctx:** features/network-tools.md. **Deps:** P8-01a

#### [ ] P8-01c Subnet & VLSM UI
- **Done:** component tests (invalid input, results table).
- **Ctx:** features/network-tools.md. **Deps:** P8-01b, P0-07a

### P8-02 IPv6 calculator
#### [ ] P8-02a IPv6 library
- **Files:** `packages/core-nettools/src/ipv6/**`
- **Done:** IPv6 part of features/network-tools.md "Acceptance criteria".
- **Ctx:** features/network-tools.md. **Deps:** P8-01a

#### [ ] P8-02b IPv6 UI
- **Done:** component test (compression/expansion display, invalid input).
- **Ctx:** features/network-tools.md. **Deps:** P8-02a, P8-01c

### P8-03 DNS lookup
#### [ ] P8-03 DNS lookup (DoH)
- **Files:** `packages/core-nettools/src/doh/**`, web UI, CSP `connect-src`
- **Done:** schema tests on recorded responses; fallback test with a fake `fetch`.
- **Ctx:** DATA-SOURCES.md §5. **Deps:** P0-07b

### P8-04 Encoders, hashes, whoami, ports
#### [ ] P8-04a Encoders & hashes
- **Files:** `packages/core-nettools/src/encoding/**`, web UI (hashes via WebCrypto)
- **Done:** encoder round-trip tests incl. UTF-8.
- **Ctx:** features/network-tools.md. **Deps:** P0-07a

#### [ ] P8-04b Whoami & ports catalogue
- **Files:** backend `GET /api/tools/whoami`, ports catalogue in `core-nettools`, UI
- **Done:** whoami integration test (cookie/authorization stripped).
- **Ctx:** SECURITY.md §2 (I4), features/network-tools.md. **Deps:** P0-06a, P0-07a

---

## Phase 9 — Polish

#### [ ] P9-01 Drizzle 1.0 upgrade (only if P0-04a pinned 0.x)
- **Done:** full suite green, migration diff empty. **Deps:** Drizzle 1.0 GA

#### [ ] P9-02 Accessibility pass
- **Do:** keyboard navigation, focus states, contrast (WCAG AA), reduced motion, VoiceOver check on iPhone. Split per area (nav, forms, charts) if larger than the size rule.

#### [ ] P9-03 Smoke E2E
- **Do:** Playwright smoke suite (login via virtual authenticator, calendar renders, capture flow) in CI against the compose stack. Adds `@playwright/test` — justify at task start.

---

## Risks & mitigations
| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | ISP blocks ports or router forwarding misconfigured (static IP + DNS confirmed by owner) | App unreachable, no webhook/TLS | Check from mobile data in P0-10d; Cloudflare Tunnel fallback |
| R2 | 2 GB RAM pressure | OOM kills | Images built in CI; memory limits; Postgres tuning; 2 GB swap; single backend process |
| R3 | Home power/internet outage | Missed notifications | Expiry semantics; Healthchecks.io alert (D6); UPS recommended |
| R4 | iOS evicts push subscription (ITP) / push unreliable | Missed push | Declarative Web Push; critical types also via Telegram; System page shows subscription health |
| R5 | football-data free scores delayed | Late result notifications | Accepted by the owner (D7); €12/mo plan possible later without code changes |
| R6 | Jolpica limits decrease / volunteer outage | F1 data stale | Low request budget; caching; OpenF1 fallback for schedule/results (2023+ format) |
| R7 | OpenF1 free access changes | Comparison/outline missing | Permanent cache of fetched data; features degrade gracefully |
| R8 | Drizzle 1.0 transition | Upgrade churn | Pin stable; isolated upgrade task P9-01 |
| R9 | Fastify not yet tested on Node 26 | Runtime issue | CI on Node 26 from P0-02; fallback Node 24 image |
| R10 | Lockout (lost passkeys + codes) | No access | Second passkey, recovery codes in password manager, CLI reset via server access |
| R11 | Spoiler leak through a new surface | Ruined match | Single domain rule; integration test covering every surface; checklist item |
| R12 | Scope creep for a solo developer | Never finishing | MVP cut; phases independently shippable; small subtasks (D12) |
| R13 | Apache left enabled on the server | Caddy cannot bind 80/443 | DEPLOYMENT.md §3 step 0, checked in P0-10d |

## Decisions confirmed by the owner
| # | Date | Decision |
|---|---|---|
| D1 | 2026-11-25 | Each PL round has two main matches: Liverpool's match + the headline match ("šláger kola"); if Liverpool would be in the headline, another match is chosen by both teams' table positions. Formal rule: [features/football.md](features/football.md#main-matches-of-the-pl-round--core-domainfootballmain-matches). |
| D2 | 2026-11-25 | The headline match gets the same notifications as favourites (kickoff push 60 min before, result to Telegram). |
| D3 | 2026-11-25 | The morning brief also lists yesterday's results of followed events (spoiler-aware). |
| D4 | 2026-11-25 | Spoiler mode protects **only followed events**; other results are always visible. |
| D5 | 2026-11-25 | Server has a static public IP with the domain's DNS pointing to it; port forwarding available. |
| D6 | 2026-11-26 | Off-site backups to **Backblaze B2** (owner already has an account); outage and backup monitoring with **Healthchecks.io**. |
| D7 | 2026-11-26 | Delayed football scores on the free tier are acceptable (no paid plan). |
| D8 | 2026-11-26 | The app is served at the root of the owner's existing subdomain (`APP_DOMAIN`, kept only in `.env`). The current placeholder page served by Apache on the same server is replaced; Apache is disabled in P0-10d. |
| D9 | 2026-11-26 | Server CPU architecture unknown for now → multi-arch images until the owner confirms it. |
| D10 | 2026-11-26 | Public GitHub repository `my-space`; commits use the GitHub noreply e-mail; no personal data in the repo (real locations, domain, e-mail) — such values live only in `.env` or in app settings. |
| D11 | 2026-11-26 | One branch + PR per subtask (`feat/<id>-<slug>`); the planning docs are committed once as a separate `docs:` commit on `main`. |
| D12 | 2026-11-26 | The plan is split into small, self-contained subtasks (see "How to work this plan"). |
| D13 | 2026-11-26 | The owner already has working remote access to the server and can deploy from anywhere. |

### Confirmed assumptions (2026-11-26)
| # | Rule |
|---|---|
| A1 | Headline selection: prefer matches between two teams of {6 listed teams} ∪ {4 highest-placed non-listed teams}; among them the lowest sum of table positions wins; if no such match, the lowest position sum among all non-Liverpool matches. Table = after the previous matchday. |
| A2 | Main-match decisions are frozen per matchday; a postponed headline keeps its status and is not replaced. |
| A3 | Matchday 1 uses the previous season's final table; promoted teams rank below all teams from that table. |
| A5 | Auto-reveal 24 h counts from the event's finish time. |
| A6 | *(Modified by owner.)* One **primary** weather location (always in the brief, first on the dashboard); every other location has a **show in brief** toggle (default off). No seeded locations. |
| A7 | Sports iCal includes all F1 sessions (incl. practice) and followed football matches. |
| A8 | Morning brief time is exempt from quiet hours; deadline reminders default to 08:00. |
| A9 | The server runs 24/7. |

## Open questions
| # | Question | Blocks |
|---|---|---|
| Q4 | Server CPU (x86_64 vs ARM) — owner runs `lscpu` later; multi-arch until then (D9). | — |

## Deployment records
*(Filled in by owner subtasks: P0-10d network checks and smoke test, P0-11b backup facts, P1-01c and P3-07c iPhone checks, P4-04 checklist.)*
