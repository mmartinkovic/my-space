# Feature: Settings & System page

## Settings (all persisted server-side)
| Section | Items |
|---|---|
| General | Language (Slovenčina / English), timezone (default Europe/Bratislava) |
| Notifications | Type × channel matrix, quiet hours, morning brief time, deadline reminder offsets + time, event lead times, push subscriptions (list, rename, remove, "Enable on this device", test), Telegram status (webhook info, test) |
| Sports | Spoiler mode per sport, auto-reveal hours, favourite teams, top-listed PL teams, extra top count |
| School | Subjects (code, name, colour, archive) |
| Budget | Categories (name, slug, aliases, default limit, order, archive), monthly overrides |
| Weather | Locations (search, add, reorder, remove), primary location, "show in brief" toggle per location |
| Calendar feeds | Sports & school feed: masked URL, rotate (step-up), last accessed |
| Security | Passkeys (list, add, rename, remove), recovery codes (remaining count, regenerate), active sessions (revoke), recent `auth_event`s |

## System page
- Data sources: last success/failure, consecutive failures, last error.
- Jobs: failed jobs in the last 7 days (name, error, time), next scheduled runs.
- Notifications: last 50 with status and per-channel delivery result; pending upcoming.
- Backups: last `backup_run`.
- App version (git SHA from image label), DB size.

## Acceptance criteria
- [ ] Every setting change validated by zod and reflected immediately in scheduling (re-plan where relevant).
- [ ] Language switch changes UI and next notification texts.
