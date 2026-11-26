# Feature: Morning brief

## User stories
- As the owner, at 07:00 I get one message with today's weather, deadlines and sport, on my phone (push + Telegram), and I can open the same brief in the app.

## Content (in order)
1. **Weather** for the primary location plus every location with `show_in_brief` on: current temperature + icon, today's min/max, max precipitation probability. Attribution line in the app view.
2. **Deadlines**: due today (with time), overdue open deadlines, and next 7 days (max 5, sorted by `due_at`, priority as tie-breaker).
3. **Today's sport** (local day): followed football matches (favourites + PL headline match) and F1 sessions with local times; headline match marked.
4. **Yesterday's results** of followed events — each subject to the spoiler rule (hidden → "Result hidden — tap to reveal" in app; omitted in push; "hidden" line with Watched button in Telegram).
5. Empty sections are omitted; if everything is empty: "Nothing scheduled today."

## Rules
- Scheduled as a `morning_brief` notification for the next `brief_time` in `Europe/Bratislava`; after each send, the next day's row is planned. Changing `brief_time` re-plans the pending row.
- Content snapshot is stored in `morning_brief` (`local_date` PK) at generation; results are not stored — redaction applied whenever it is rendered (send time and in-app view).
- Push version: title "Dobré ráno · 3 termíny · 2 zápasy", body ≤ 180 chars summary, navigates to `/brief/<date>`.
- Telegram version: full brief, ≤ 4096 chars (truncate lists with "+N more").
- Weather older than 6 h → section shows "weather unavailable"; brief is still sent.
- Brief time is exempt from quiet hours (it is explicitly chosen).

## Edge cases
- DST change day: 07:00 local is still 07:00 local (UTC offset differs) — tested.
- Server down at 07:00 and back at 09:30 → brief sent at 09:30 (expires at 12:00 local); after 12:00 it is expired and only visible in-app.
- Football source down → sport section uses cached events with "may be outdated" marker.

## Acceptance criteria
- [ ] Brief generated for a fixed clock contains exactly the expected sections (unit tests on `composeBrief` in core-domain).
- [ ] Spoiler-hidden result never appears in push or Telegram payloads (test).
- [ ] Changing brief time to 06:30 reschedules tomorrow's pending notification.
- [ ] `/brief/today` and `/brief/<date>` render the stored snapshot.
