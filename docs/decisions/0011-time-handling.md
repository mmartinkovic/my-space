# ADR 0011 — Time and time zones

- Status: Accepted
- Date: 2026-11-25

## Decision
- All instants stored as `timestamptz` (UTC). Calendar-only values (expense date, brief date) stored as `date` interpreted in `Europe/Bratislava`.
- The zone is a setting (`app_settings.timezone`, default `Europe/Bratislava`), passed explicitly to every function — no reliance on server `TZ`.
- Zone math (local wall time → UTC instant, start of local day/month) uses **`date-fns` + `@date-fns/tz`** in `core-domain`. Reason: DST correctness is a classic bug source; the library is small, tree-shakeable and runs in browser, Node and React Native. Display formatting uses `Intl` (ADR 0008).
- Re-evaluate replacing the library with the native `Temporal` API once it is available in Node LTS **and** iOS Safari (unverified today).
- Every rule that depends on local time has tests around both DST transitions (last Sunday of March and October).

## Consequences
- + Deterministic scheduling; tests inject `now` (no hidden clock reads in `core-domain`).
