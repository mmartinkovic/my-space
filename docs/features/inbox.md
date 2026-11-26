# Feature: Quick capture (inbox)

## User stories
- As the owner, I capture a thought or link in two taps (app) or one message (Telegram).
- As the owner, I triage the inbox later: turn an item into a deadline or an expense, or archive it.

## Rules
- Item = `body` (1–4000 chars) + optional first `http(s)` URL extracted from the body. Source `app` | `telegram`.
- Capture UI: floating "+" button on every screen → single textarea, Enter (desktop) / "Save" (mobile). Optimistic insert.
- Inbox list: open items, newest first; badge with count on the nav item.
- Triage actions:
  - **→ Deadline**: opens the deadline form pre-filled (title = first line of body, notes = body); on save, item `status=converted`, `converted_deadline_id` set — in one transaction.
  - **→ Expense**: opens the expense form; body parsed with the same amount/category parser as Telegram for pre-fill.
  - **Archive**: `status=archived`.
  - **Delete**: hard delete.
- Archived/converted list available under a "History" tab (last 90 days).
- Links are displayed (`rel="noopener noreferrer"`), never fetched by the server (no previews — SSRF avoidance).

## Edge cases
- Converting fails validation → item stays open.
- Target deadline later deleted → item keeps `converted` status with null reference ("target deleted").

## Acceptance criteria
- [ ] Capture from app and Telegram both appear in the inbox.
- [ ] Conversion is atomic (integration test: failing deadline insert leaves item open).
- [ ] URL extraction unit-tested (no URL, one URL, multiple URLs → first, non-http schemes ignored).
