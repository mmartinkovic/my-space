# Feature: Notifications (channels, routing, quiet hours)

Pipeline: [ARCHITECTURE.md §5](../ARCHITECTURE.md#5-notification-pipeline). Channels: [ADR 0006](../decisions/0006-push-strategy.md).

## User stories
- As the owner, I choose per notification type whether it goes to Web Push, Telegram, both, or nowhere.
- As the owner, I am not disturbed between 22:00 and 07:00, but nothing important is lost.
- As the owner, I enable Web Push on my iPhone from the installed Home Screen app.

## Default routing
| Type | Web Push | Telegram | Lead time / trigger | Quiet hours |
|---|---|---|---|---|
| `morning_brief` | ✅ | ✅ | `brief_time` (07:00) | exempt (explicitly scheduled) |
| `deadline_reminder` | ✅ | ✅ | D-3 and D-1 at 08:00 | deferred |
| `football_kickoff` | ✅ | ❌ | 60 min before (favourites + PL headline match) | deferred; expires at kickoff |
| `football_result` | ❌ | ✅ | when status becomes finished (favourites + PL headline match) | deferred to 07:00 |
| `f1_session_start` | ✅ | ❌ | 30 min before Q, SQ, Sprint, Race; +120 min before Race | deferred; expires at session start |
| `f1_result` | ❌ | ✅ | when results are available (Q, SQ, Sprint, Race) | deferred to 07:00 |
| `budget_limit` | ✅ | ✅ | category crosses 80 % and 100 % of monthly limit | deferred |
| `system` | ❌ | ✅ | source failing ×3, backup failed, security events | **security events exempt**, others deferred |

All of the above editable in Settings → Notifications (type × channel matrix, lead times via `event_reminder_rule`, quiet hours start/end).

## Rules
- Quiet hours window may wrap midnight (22:00–07:00). A notification due inside the window is moved to the window end; if that is after `expires_at`, it is marked `expired` (shown on the System page, not sent).
- Rendering happens at send time in the user's locale; spoiler rule applied (see spoiler-mode.md).
- Web Push payload: Declarative Web Push JSON (`web_push: 8030`, `notification.title`, `.body`, `.navigate` deep link, `.app_badge` = number of open deadlines due within 3 days). `TTL` = seconds until `expires_at` (default 12 h).
- Telegram messages use HTML parse mode with escaped dynamic text; result messages include an inline button "👀 Watched" (`callback_data = watch:<eventId>`).
- Push subscription UI: shown only when `display-mode: standalone` on iOS (otherwise explains "Add to Home Screen first"); permission requested only on button tap.
- Test button per channel ("Send test notification").

## Edge cases
- Event time changes after planning → pending notification rescheduled; already-sent kickoff notification is not resent.
- Event cancelled/postponed → pending notifications cancelled; optional Telegram info message "Match postponed".
- All push subscriptions dead (iOS evicted) → delivery fails, Telegram still delivers (for types routed to both); System page shows "no active push subscription".
- Server down over a scheduled time → after restart, overdue but unexpired notifications are sent; expired ones are not.

## Acceptance criteria
- [ ] Changing a match kickoff by 2 h moves the pending kickoff notification by 2 h (integration test).
- [ ] A notification due at 23:30 with no expiry is sent at 07:00; one expiring at 23:45 is marked expired.
- [ ] A redelivered dispatch (simulated crash after claim) does not send the same channel twice.
- [ ] iPhone receives a push while the PWA is closed (manual test, recorded in PLAN).
