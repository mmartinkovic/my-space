# ADR 0002 — Database: PostgreSQL 18

- Status: Accepted
- Date: 2026-11-25

## Context
Single user, small data volume (thousands of rows/year), relational data (events, teams, deadlines, transactions), need for durable job queue and constraints. Server has 2 GB RAM.

## Decision
PostgreSQL **18** (official `postgres:18` Docker image).

- 18 is the newest major with a year of patch releases (19.0 shipped 2026-11-19 — too fresh for "boring"). Supported until 2030-11 ([versioning policy](https://www.postgresql.org/support/versioning/)).
- Native `uuidv7()` (added in 18) for time-ordered primary keys without an extension.
- Also hosts the job queue (ADR 0004) → no Redis.
- Tuned for low memory: `shared_buffers=128MB`, `max_connections=30`, `work_mem=4MB` (see DEPLOYMENT.md).

## Alternatives
- **SQLite** — lighter, but no `pg-boss`, weaker concurrent-writer story between API and worker, fewer constraint/types features (`timestamptz`, enums, partial unique indexes). Rejected.
- **PostgreSQL 19** — revisit after 19.2+.

## Consequences
- + Constraints (CHECK, partial unique, FK) enforce invariants in the DB.
- − ~100–200 MB RSS on the server; acceptable.
