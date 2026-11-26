# ADR 0011 — Time and time zones

- Status: Accepted
- Date: 2026-11-25

## Decision
- All instants stored as `timestamptz` (UTC). Calendar-only values (expense date, brief date) stored as `date` interpreted in `Europe/Bratislava`.
- The zone is a setting (`app_settings.timezone`, default `Europe/Bratislava`), passed explicitly to every function — no reliance on server `TZ`.
- Zone math (local wall time → UTC instant, start of local day/month) lives in `core-domain` and takes zone offsets from **`@date-fns/tz`** (`tzOffset`). Reason: the library is small and runs in browser, Node and React Native. Display formatting uses `Intl` (ADR 0008).
- `TZDate` wall-clock constructors are **not** used: with `@date-fns/tz` 1.5.0 an ambiguous time resolved differently on a host in `Europe/Bratislava` and on a host in UTC (observed 2026-11-26). `date-fns` is therefore not a dependency.
- Re-evaluate replacing the library with the native `Temporal` API once it is available in Node LTS **and** iOS Safari (unverified today).
- Every rule that depends on local time has tests around both DST transitions (last Sunday of March and October).

## Assumptions
- Wall-clock times that a DST transition makes special follow RFC 5545 §3.3.5: an ambiguous time (autumn) means its first occurrence; a non-existent time (spring) is shifted forward by the length of the gap (02:30 becomes 03:30). Anything scheduled for such a time therefore happens exactly once.

## Consequences
- + Deterministic scheduling; tests inject `now` (no hidden clock reads in `core-domain`).
