# Feature: Unified sports calendar

## User stories
- As the owner, I see one timeline of football matches and F1 sessions in local time, filterable by sport, competition and "followed only".
- As the owner, I see countdowns to the next followed events on the dashboard.

## Rules
- Data from `sport_event` (+ subtypes); never fetched from providers inside a request.
- Default view: from today 00:00 local, next 14 days, "followed only" on. List grouped by local day; infinite scroll forward (keyset pagination on `(starts_at, id)`), "past" toggle for previous 14 days.
- Filters: sport (football / F1), competition (PL, La Liga, CL, F1), followed only. Filter state kept in URL search params.
- Each item: local time, competition badge, title (`LIV – ARS`, `F1 · Kvalifikácia · Monaco`), status (scheduled / live / finished / postponed), headline-match marker, result **only if visible** per spoiler rule, "Watched" toggle for finished events.
- F1 weekend grouped as a card with its sessions.
- Countdown widget: next 3 followed events; live-updating client-side.

## Edge cases
- Kickoff time "TBD" (football-data uses a placeholder time for unscheduled matches) — mark as "time TBC" when status is `SCHEDULED` rather than `TIMED` (verify field semantics in P3-01b).
- Postponed matches stay visible with strike-through until a new date arrives.
- Events across midnight are grouped by local start day.

## Acceptance criteria
- [ ] `GET /api/sports/events` returns events in range with filters; hidden results absent from JSON (integration test).
- [ ] Times rendered in Europe/Bratislava, including across DST (unit test of formatter).
- [ ] Filter combination persists in URL and survives reload.
