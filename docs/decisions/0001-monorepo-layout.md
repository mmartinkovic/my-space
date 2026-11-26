# ADR 0001 — Monorepo layout (Turborepo + pnpm workspaces)

- Status: Accepted
- Date: 2026-11-25

## Context
Two deployables (Next.js web PWA, Fastify backend) must share schemas, domain rules and an API client. A native Expo app may come later and must reuse the same logic without touching web-only code.

## Decision
Turborepo monorepo with pnpm workspaces. Package families and strict downward dependency direction:

```
apps/*  →  feature-*  →  platform-*  →  core-*
```

| Path | Role |
|---|---|
| `apps/web` | Next.js App Router PWA (composition root, UI) |
| `apps/backend` | Fastify API + background worker (composition root, server modules, DB) |
| `packages/core-config` | Shared tsconfig bases, ESLint flat config, Vitest preset |
| `packages/core-schemas` | Zod schemas for the API contract and shared entities; all shared types are `z.infer` of these |
| `packages/core-domain` | Pure business rules: spoiler visibility, main-match (Liverpool + headline) selection, reminder scheduling, quiet hours, budget limits, brief composition, Telegram command parsing |
| `packages/core-nettools` | Pure subnet calculator (IPv4/IPv6, VLSM), encoders, ports catalogue |
| `packages/core-i18n` | Typed sk/en dictionaries + `Intl` formatters (used by web **and** backend for notifications) |
| `packages/core-api-client` | Typed `fetch` client built on `core-schemas` (usable by web and Expo) |

Rules:
- `core-*` packages are platform-agnostic: no DOM, no Node-only APIs (`node:*`), no React. They run in browser, Node and React Native.
- Each package exposes one entry point (`exports: { ".": "./src/index.ts" }`); deep imports are forbidden (ESLint `no-restricted-imports`).
- Named exports only, kebab-case package names, scope `@projectu/*`.
- Packages are consumed as TypeScript source (internal packages, no build step); apps compile them (`transpilePackages` in Next, `tsc`/bundle in backend — finalised in P0-01d).

## Deviations from the generic family template (justified)
- **No `feature-*` / `platform-*` packages yet.** Web UI is React-DOM and cannot be reused by React Native, so extracting it into `feature-*` packages now adds ceremony with zero reuse. Web UI lives in `apps/web/src/features/<module>/` with the same folder discipline (`index.ts` boundary, `components/`, `hooks/`, `consts/`). When Expo arrives, shared hooks (TanStack Query hooks over `core-api-client`) move to `feature-*` packages and native-only code to `platform-*`.
- **Database schema lives in `apps/backend/src/db`**, not a package: only the backend may touch the database.

## Consequences
- + One source of truth for types; Expo can depend on `core-*` unchanged.
- + Domain rules are unit-testable without a DB or HTTP.
- − Internal packages compiled by consumers require consistent TS config (handled by `core-config`).
