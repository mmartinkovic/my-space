# ADR 0003 — Query layer: Drizzle ORM + node-postgres

- Status: Accepted (version pin to be confirmed in P0-04a)
- Date: 2026-11-25

## Context
Need type-safe queries with types derived from the schema, SQL migrations checked into git, zod schemas derivable from tables, and no heavy runtime engine (2 GB RAM).

## Decision
- **Drizzle ORM** for schema-as-code and typed queries; **drizzle-kit** to generate SQL migrations (`generate`) and apply them (`migrate`). `push` is forbidden outside throwaway local DBs.
- Driver: **`pg` (node-postgres)** — the same driver pg-boss uses, so one connection stack.
- Version: as of 2026-11-25 Drizzle 1.0 is at **1.0.0-rc.6** ([releases](https://orm.drizzle.team/docs/latest-releases)); 1.0 ships zod generation built-in as `drizzle-orm/zod` ([docs](https://orm.drizzle.team/docs/zod)). In P0-04a: if 1.0 is GA, use it; otherwise use the latest stable 0.x with `drizzle-zod` and plan the upgrade as a separate task. Never depend on an RC in production.
- Migrations are reviewed SQL files; every migration is forward-only and applied by a one-off container before the new backend starts.

## Alternatives
- **Prisma** — mature, but generated client + engine adds weight and a second schema language. Rejected.
- **Kysely** — excellent typed query builder, but no schema-as-code/migration generation; types would be hand-maintained or introspected. Fallback if Drizzle 1.0 migration proves painful.
- **Raw SQL + zod** — maximum control, most boilerplate. Rejected.

## Consequences
- + Row types come from the schema (`$inferSelect`), API types from zod → no hand-written duplicates.
- − Drizzle is mid-major-transition; pinning and an explicit upgrade task mitigate.
