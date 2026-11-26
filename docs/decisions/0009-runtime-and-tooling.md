# ADR 0009 — Runtime and tooling versions

- Status: Accepted (exact patch versions pinned in P0-01a)
- Date: 2026-11-25

## Decision (verified 2026-11-25)
| Tool | Choice | Why / source |
|---|---|---|
| Node.js | **26 LTS** (Active LTS since 2026-10-28, EOL 2029-04-30) | [nodejs.org releases](https://nodejs.org/en/about/previous-releases); satisfies pg-boss (≥22.12), SimpleWebAuthn (≥22), Next.js (≥20.9) |
| pnpm | **11** (npm `latest` tag) | pnpm 12 (Rust rewrite) is stable but not yet on `latest` ([blog](https://pnpm.io/blog/whats-different-in-pnpm-12)); re-evaluate later. Version pinned in root `package.json#packageManager` |
| Turborepo | latest 2.x | task graph + caching |
| TypeScript | **6.0.x** (6.0.3 pinned in P0-01b) | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. TS 7 (native compiler, `latest` tag since 2026) is not yet supported by typescript-eslint 8.74 (peer `>=4.8.4 <6.1.0`); upgrade when it is |
| Next.js | **16.x** (16.4 current) | App Router, `output: 'standalone'` for Docker |
| Fastify | **5.x** | `@fastify/type-provider-zod` (under the fastify org) for zod validation/serialisation. Node 26 not yet listed in Fastify's tested matrix (Node 20/22) — verify CI on Node 26 in P0-02 |
| Zod | **4.x** | schemas at every boundary |
| Vitest | **5.x** | unit + integration tests |
| Testcontainers (`@testcontainers/postgresql`) | latest | real PostgreSQL in integration tests instead of mocks |
| ESLint + typescript-eslint, Prettier | latest | lint/format |

Node is installed without corepack assumptions (corepack is no longer bundled with recent Node); CI and Dockerfiles install pnpm explicitly at the pinned version.

## Consequences
- Fastify on Node 26 is a small compatibility risk; fallback is Node 24 (Maintenance LTS until 2028-04) for the backend image.
