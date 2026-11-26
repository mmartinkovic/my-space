# Feature: iCal feeds

## User stories
- As the owner, I subscribe to my sports schedule and my school deadlines in iOS Calendar via `webcal://` links.
- As the owner, I can rotate a feed's secret if a link leaks.

## Feeds
| Feed | URL | Content |
|---|---|---|
| Sports | `webcal://<domain>/ical/sports/<token>.ics` | followed football matches + all F1 sessions, from −30 days to +180 days |
| School | `webcal://<domain>/ical/school/<token>.ics` | open deadlines (+ done ones from the last 30 days) |

## Rules
- Token: 32 random bytes, base64url; stored as SHA-256 hash; exactly one active token per feed. Settings shows the URL once after rotation (copy button + "Open in Calendar" link) — afterwards only a masked version (raw token not retrievable; rotate to see a new one).
- **Schedule only — never results, never notes or amounts.** Football `SUMMARY`: `⚽ Liverpool – Arsenal (PL)`; F1: `🏎️ Kvalifikácia · VC Monaka`; school: `📚 [PRPR] Zadanie 3`.
- RFC 5545 subset written by hand: `VCALENDAR` (`PRODID`, `VERSION:2.0`, `CALSCALE:GREGORIAN`, `X-WR-CALNAME`, `REFRESH-INTERVAL;VALUE=DURATION:PT6H`, `X-PUBLISHED-TTL:PT6H`), `VEVENT` (`UID` stable `<kind>-<id>@<domain>`, `DTSTAMP`, `DTSTART`/`DTEND` in UTC `Z`, `SUMMARY`, `STATUS:CANCELLED` for cancelled, `LAST-MODIFIED`). CRLF line endings, line folding at 75 octets, escaping of `\ ; , \n`.
- Deadlines: event from `due_at − 30 min` to `due_at`, with `VALARM` none (reminders come from the app).
- Language of summaries follows `app_settings.locale`.
- Response: `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: private, max-age=900`; `last_accessed_at` updated (max once per 10 min).
- Invalid/revoked token → 404 (no distinction). Rate limited.

## Edge cases
- iOS refreshes on its own schedule (hints only); document in README that changes may take hours.
- Postponed match without new date → excluded until rescheduled; cancelled → `STATUS:CANCELLED`.

## Acceptance criteria
- [ ] Output validates against an RFC 5545 parser in tests (folding, escaping, CRLF) — use a known-good fixture and round-trip assertions.
- [ ] A finished match in the feed contains no score anywhere in the file.
- [ ] Rotating the token makes the old URL return 404 immediately.
- [ ] Subscribed successfully on iPhone (manual check).
