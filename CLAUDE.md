# CLAUDE.md — operating manual

## Project
Single-user personal dashboard (PWA on iPhone + desktop) for a CS student: morning brief, school deadlines, football & F1 with spoiler mode, iCal feeds, Telegram bot, inbox, budget, networking tools. Self-hosted on a home server (2 GB RAM, Docker Compose, Caddy). The server is the source of truth; all scheduling runs in the backend.
Docs: [PLAN](docs/PLAN.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [DATA-MODEL](docs/DATA-MODEL.md) · [DATA-SOURCES](docs/DATA-SOURCES.md) · [SECURITY](docs/SECURITY.md) · [DEPLOYMENT](docs/DEPLOYMENT.md) · [features/](docs/features/) · [decisions/](docs/decisions/)

## Communication
- Reply to the user in **Slovak**. Write code, comments, docs, commit messages in **English**.
- When unsure about requirements, **ask** before deciding. If you assume, record it under "Assumptions" in the relevant doc.

## Repository structure & boundaries
```
apps/web                 Next.js 16 App Router PWA (UI, SW, manifest) — features in src/features/<module>/
apps/backend             Fastify API + pg-boss worker; db/, integrations/<source>/, modules/<module>/, jobs/
packages/core-config     tsconfig bases, ESLint, Vitest presets
packages/core-schemas    zod schemas = API contract; all shared types are z.infer
packages/core-domain     pure business rules (spoiler, main matches of the round, reminders, quiet hours, budget, brief, telegram parsing, time)
packages/core-nettools   subnet/VLSM/IPv6/encoders/DoH parsing/ports (pure)
packages/core-i18n       sk/en dictionaries + Intl formatters
packages/core-api-client typed fetch client over core-schemas
```
- Dependency direction: `apps/* → (future feature-*/platform-*) → core-*`. `core-*` never imports apps, React, DOM or `node:*` APIs (must run in browser, Node and React Native).
- Import packages only by name (`@projectu/core-domain`), never deep paths. Named exports only (Next.js special files and `*.config.*` files are the only default-export exceptions). Relative imports carry the `.ts` extension (`./locale.ts`).
- Runtime `core-*` packages lint with `createEslintConfig({ rootDir, universal: true })`, which blocks Node imports and globals.
- Only `apps/backend` touches the database or keyed external APIs. Business rules live in `core-domain`, not in route handlers or React components.

## Commands *(confirmed in P0-01d; rows marked with a task ID exist from that task on)*
| Task | Command |
|---|---|
| Install | `pnpm install` (CI: `pnpm install --frozen-lockfile`) |
| Dev (all) | `pnpm dev` — web http://localhost:3000, backend http://localhost:4000 |
| Dev (one app) | `pnpm --filter @projectu/web dev` / `pnpm --filter @projectu/backend dev` |
| Build | `pnpm build` (web only — the backend runs TypeScript directly on Node 26, no build step) |
| Typecheck | `pnpm typecheck` |
| Lint / format | `pnpm lint` / `pnpm format` (check only: `pnpm format:check`) |
| Unit tests | `pnpm test` (single package: `pnpm --filter @projectu/<pkg> test`) |
| Integration tests | `pnpm test:integration` (needs Docker) — P0-04b |
| Backend CLI | `node src/cli.ts <command>` in `apps/backend` (in production: `docker compose run --rm backend node src/cli.ts <command>`) — P0-04a |
| DB generate migration | `pnpm --filter @projectu/backend db:generate` — P0-04a |
| DB migrate | `pnpm --filter @projectu/backend db:migrate` — P0-04a |
| Local Postgres | `docker compose -f compose.dev.yaml up -d postgres` — P0-04a |

## Workflow rules
1. Read `docs/PLAN.md` ("How to work this plan" + your subtask) before starting; work on **one subtask at a time** (by ID, e.g. `P2-01a`), only after its *Deps* are merged.
2. Read only the docs listed in the subtask's *Ctx* and stay inside its *Files*. If the subtask is bigger than the size rule, propose a split in PLAN.md before coding.
3. For anything larger than a small fix, post a short plan (files, approach, tests) first.
4. **Never invent APIs.** External endpoints/fields must be in `docs/DATA-SOURCES.md` or verified in official docs (then add them there). Record fixtures from real responses for tests.
5. After each change run typecheck, lint and tests; fix failures before moving on.
6. Update the task checkbox in `docs/PLAN.md` (`[~]` in progress, `[x]` done) and any docs whose facts changed.
7. Small, focused changes. Don't touch unrelated code. Don't reformat files you aren't changing.
8. No new dependency without a written reason (add it to ARCHITECTURE.md §11). Prefer platform APIs (`fetch`, `Intl`, WebCrypto). Pin exact versions that are older than pnpm's minimum release age; never add `minimumReleaseAgeExclude` entries (supply-chain guard) — pick the previous release instead.
9. Definition of done: typecheck + lint + tests green, acceptance criteria met, **no placeholders, no TODOs, no commented-out code**.
10. Conventional Commits (`feat(budget): add monthly limit status`), one logical change per commit. One branch + PR per subtask: `feat/<id>-<slug>` (e.g. `feat/p0-03a-config-logger`). Commit only when the user asks.
11. Never put personal data in the repository (real locations, domain, e-mail, names): it is public. Such values live in `.env` or in app settings.

## Coding conventions
- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **No `any`. No `as` casts** (only `as const`). No non-null `!`. External data is `unknown` until parsed by zod.
- Derive types from schemas (`z.infer`, Drizzle `$inferSelect`); don't hand-copy shapes.
- `type` over `interface`; no `enum` (string-literal unions / `as const` arrays); discriminated unions for variants; `switch` ends with `assertNever`.
- Branded ids/units where mix-ups are possible (`Cents`, `EventId`).
- Functions with > 2 params take an object. Pure domain functions receive `now` explicitly — never read the clock inside `core-domain`.
- **No silent catch.** Every `catch` handles with a log entry and context, or rethrows with `cause`. Catch variables are `unknown`.
- Errors: `AppError` union in backend → one error handler; integrations return `Result`.
- Money = integer cents; time = UTC `timestamptz`, displayed in Europe/Bratislava; zone passed explicitly.
- No `console.log` in shipped code — use the Fastify/pino logger.
- UI text only via `core-i18n` (sk + en), never hard-coded strings.

## Testing
- Vitest. Test behaviour, not implementation. Domain rules get table-driven unit tests (spoiler, main matches of the round, reminders, quiet hours, budget limits, subnet math, DST cases).
- Backend integration tests use a real PostgreSQL (Testcontainers) and `app.inject`; mock only the network (local fake HTTP servers for providers) and the clock.
- Every bug fix starts with a failing test.

## Security rules
- Secrets only in env (`.env`, never committed); `.env.example` has names and comments only. Never log or return secrets.
- Validate every input at the boundary with zod; serialise responses through response schemas.
- **Every route requires a session** unless it is on the public allowlist in `docs/SECURITY.md §4`; adding one requires updating that list with a reason. The route-enumeration test must stay green.
- State-changing requests: JSON only, Origin check, never on GET.
- Telegram: verify secret header + allowlisted chat id; dedupe by `update_id`.
- Anything showing results must go through the spoiler rule (`core-domain/spoiler`). iCal never contains results.
- Never fetch user-supplied URLs server-side.
- Run the checklist in `docs/SECURITY.md §10` before marking a task done.
