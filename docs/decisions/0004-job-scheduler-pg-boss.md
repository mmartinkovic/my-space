# ADR 0004 — Jobs and scheduling: pg-boss + notification table

- Status: Accepted
- Date: 2026-11-25

## Context
All scheduling must run on the server (iOS suspends PWAs, no background sync). Needs: periodic data syncs, retries with backoff, durable one-off jobs that survive restarts, visibility of failures, and exact-time notifications in Europe/Bratislava across DST changes. No Redis on a 2 GB box.

## Decision
1. **pg-boss** (v12, requires Node ≥ 22.12 and PostgreSQL ≥ 13 — [repo](https://github.com/timgit/pg-boss), [docs](https://pgboss.io/)) for:
   - cron-scheduled jobs (data syncs, `notifications.dispatch` tick every minute, cleanup),
   - retries with exponential backoff, singleton keys, failed-job archive.
   Cron expressions are written in **UTC** only; anything defined in local time is not a cron (see 3).
2. **`notification` table is the source of truth for user-facing notifications** (not pg-boss jobs). Planners upsert rows keyed by a unique `dedupe_key` with `scheduled_for` (UTC). The dispatcher tick claims due rows with `FOR UPDATE SKIP LOCKED`. Reasons: rescheduling (kickoff moved) is a single `UPDATE`, cancellation is a status change, the UI can list upcoming notifications, and duplicates are impossible by constraint.
3. **Local-time rules** (morning brief at 07:00, reminders at 08:00, quiet hours 22:00–07:00) are converted to UTC instants by pure functions in `core-domain` using an explicit IANA zone, with DST tests. The next morning brief is materialised as a `notification` row after each send and on settings change.

## Alternatives
- **node-cron / setTimeout** — no persistence, lost on restart. Rejected.
- **BullMQ** — needs Redis. Rejected.
- **Graphile Worker** — comparable; pg-boss chosen for built-in cron + dashboard and wider usage.

## Consequences
- + One datastore; jobs and business writes can share a transaction.
- + Restart-safe: missed ticks are caught up; stale notifications are expired via `expires_at`.
- − Polling granularity of 1 minute (acceptable).
