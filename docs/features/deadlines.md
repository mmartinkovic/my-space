# Feature: Deadlines & assignments

## User stories
- As the owner, I track assignments with subject, due date, priority and status, and see a countdown.
- As the owner, I get reminders 3 days and 1 day before (configurable globally and per deadline).

## Rules
- Fields: title (1–200), subject (optional, from `subject` list managed in Settings), `due_at` (date + time, default time 23:59 local), priority low/medium/high (default medium), status open/done, notes.
- List views: "Open" (sorted by `due_at`, overdue first in red), "Done" (last 60 days), filter by subject.
- Countdown: "in 2 d 4 h" (≥ 1 day), "in 3 h 20 min" (< 1 day), "overdue by 1 d"; via `Intl.RelativeTimeFormat`.
- **Reminder schedule** (`core-domain/reminders`): for each offset N in `reminder_offsets_days ?? settings.deadline_reminder_offsets_days`, reminder at local date `(due local date − N days)` at `settings.deadline_reminder_time` (08:00), converted to UTC. Skip a reminder if its time is in the past at planning time or not before `due_at`. `expires_at = due_at`.
- Re-planning on create/update (due date, offsets, status): pending reminders not in the new desired set → cancelled; new ones inserted; sent ones untouched.
- Marking done cancels pending reminders; re-opening re-plans.
- Reminder text: "📚 [PRPR] Zadanie 3 — o 3 dni (pi 28. 11. 23:59)".

## Edge cases
- Deadline created 2 days before due with offsets {3,1} → only D-1 is planned.
- Due at 07:30 with offset 1 → reminder previous day 08:00 (fine). Due at 06:00 same-day reminders don't exist (offsets are ≥ 1 day).
- DST weekend between reminder and due date — local times preserved (tests).
- Quiet hours don't affect 08:00 default; if the user sets reminder time to 23:00 → deferred to 07:00 next day, expired if past due.

## Acceptance criteria
- [ ] Unit tests for reminder computation (offsets, past skipping, DST, custom per-deadline offsets, empty array = none).
- [ ] Integration test: updating `due_at` reschedules pending reminders; marking done cancels them.
- [ ] Deadlines appear in the morning brief and the school iCal feed.
