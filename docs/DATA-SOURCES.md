# Data sources

Verified against official documentation on **2026-11-25**. "Unverified" means the docs did not state it; verify before relying on it (the implementing task lists the check). Never call an endpoint not listed here without first checking official docs and adding it here.

Common rules for every backend integration:
- HTTP via native `fetch` with `AbortSignal.timeout(10_000)`, `User-Agent: projectu-dashboard/<version>` (no personal data).
- Every response parsed with a zod schema in `apps/backend/src/integrations/<source>/schemas.ts`; parse failure = source failure (logged with sample, never crashes the process).
- Per-source token-bucket limiter set **below** the documented limit; respect `429` + `Retry-After`.
- Responses cached in `api_cache`; on failure serve last good data with `stale: true`.
- Health tracked in `data_source_status`; 3 consecutive failures → system notification (Telegram).

---

## 1. Open-Meteo (weather)

| | |
|---|---|
| Docs | <https://open-meteo.com/en/docs>, terms <https://open-meteo.com/en/terms>, licence <https://open-meteo.com/en/licence> |
| Auth | None (free tier) |
| Limits | < 10 000 calls/day, 5 000/h, 600/min, 300 000/month; per IP. >10 variables or >2 weeks per location counts as multiple calls |
| Pricing | Free = **non-commercial only**, no uptime guarantee |
| Licence | Data CC BY 4.0 — **UI must show "Weather data by Open-Meteo.com" linking to https://open-meteo.com/** next to weather data |
| CORS | `access-control-allow-origin: *` (tested 2026-11-25) — but we call it from the backend to cache |

Endpoints we use:
- `GET https://api.open-meteo.com/v1/forecast?latitude=<lat1>,<lat2>,<lat3>&longitude=<lon1>,<lon2>,<lon3>&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Europe/Bratislava&forecast_days=3`
  - Comma-separated coordinates → **one call for all configured locations**; response is an array in the same order (tested). Real coordinates are never stored in the repository — locations are added in the app (Settings → Weather).
  - `current` identifiers are the hourly variable names (docs list labels; identifiers confirmed by a live request).
  - `forecast_days` 0–16 → F1 weekend forecast available when the race is ≤ 16 days away.
- `GET https://geocoding-api.open-meteo.com/v1/search?name=<q>&count=5&language=sk&countryCode=SK` — for adding locations in settings. Attribution "location data based on GeoNames" (CC BY).
- WMO weather codes (0, 1–3, 45/48, 51–57, 61–67, 71–77, 80–86, 95–99) mapped to icons/text in `core-i18n`.

Cache: 30 min (current), 3 h (daily/weekend). Calls/day ≈ 50 → far below limits.
Fallback: last cached forecast with "stale" badge; brief omits weather section with a note if older than 6 h.

---

## 2. football-data.org (football)

| | |
|---|---|
| Docs | <https://docs.football-data.org/general/v4/index.html>, coverage <https://www.football-data.org/coverage>, pricing <https://www.football-data.org/pricing>, policies <https://docs.football-data.org/general/v4/policies.html> |
| Auth | Header `X-Auth-Token: <token>` (free registration) |
| Limits | Free: **10 requests/min**. Quota headers: `X-RequestsAvailable`, `X-RequestCounter-Reset` (seconds) |
| Free tier | 12 competitions: **PL, PD (La Liga), CL**, BL1, SA, FL1, DED, PPL, ELC, BSA, WC, EC. "Scores delayed", "Schedules delayed" (delay not documented). No line-ups/scorers/bookings (that is "Free + Deep Data", €29/mo) |
| Not covered | FA Cup (FAC), League Cup (FLC), Copa del Rey (CDR) — paid tiers only (exact tier unverified). **Out of scope** by user decision |
| Terms | No terms/attribution page found (unverified). Personal use, cache aggressively, show "Football data provided by football-data.org" as courtesy |

IDs: Liverpool FC = **64** (TLA `LIV`), FC Barcelona = **81** (TLA `FCB`) — from doc examples; confirm via `/v4/teams/64` in P3-01b.
Big-list teams (PL): IDs resolved at runtime from `/v4/competitions/PL/teams` by TLA (`LIV, MUN, MCI, CHE, TOT, ARS`) and stored in `team`.

Endpoints (base `https://api.football-data.org/v4`):
| Purpose | Endpoint | Cadence |
|---|---|---|
| Fixtures + results window | `GET /competitions/{PL\|PD\|CL}/matches?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` (`dateTo` exclusive) | daily 04:00 UTC, window −7 d … +60 d → 3 requests |
| Matchday polling | `GET /matches?competitions=PL,PD,CL&dateFrom=<today>&dateTo=<tomorrow>` | every 5 min while a followed match is in `[kickoff, kickoff+3h]`, then every 15 min until `FINISHED` (max +8 h) |
| Standings | `GET /competitions/{PL\|PD}/standings` (current); `?matchday=N` for snapshots; `?season=YYYY` for previous season | daily + after last match of a matchday |
| Teams | `GET /competitions/PL/teams` | weekly |
| Single match | `GET /matches/{id}` | on demand (rare) |

Match `status` enum: `SCHEDULED, TIMED, IN_PLAY, PAUSED, EXTRA_TIME, PENALTY_SHOOTOUT, FINISHED, SUSPENDED, POSTPONED, CANCELLED, AWARDED` → mapped to our `event_status` (see DATA-MODEL.md). Fields used: `id, utcDate, status, matchday, stage, homeTeam{id,name,shortName,tla}, awayTeam{…}, score.fullTime{home,away}, score.duration, competition{code}`.

Budget: ≈ 5 req/day baseline + ≈ 40 per match-day window → well under 10/min with limiter at 8/min.
Fallback: cached data, "stale" badge. If delay is unacceptable: "Free w/ Livescores" €12/mo (same API, 20 req/min) — config change only.
Unverified: whether `competitions` filter works on `/teams/{id}/matches` (not needed — we use competition endpoints).

---

## 3. Jolpica F1 API (schedule, results, standings)

| | |
|---|---|
| Docs | <https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md>, rate limits <https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md>, terms <https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md> |
| Base | `https://api.jolpi.ca/ergast/f1/` (JSON) |
| Auth | None (token auth "in progress"). **Custom User-Agent required** |
| Limits | 4 req/s burst, **500 req/h** sustained; "will decrease in the future"; 429 on excess |
| Licence | Data CC BY-NC-SA 4.0, non-commercial; volunteer project, no uptime guarantee |
| Pagination | `limit` (default 30, max 100), `offset`; `MRData.total` |

Endpoints:
| Purpose | Endpoint | Cadence |
|---|---|---|
| Season schedule incl. sessions | `GET /{season}/races/` → `FirstPractice, SecondPractice, ThirdPractice, Qualifying, Sprint, SprintQualifying` each `{date, time}` (UTC, `Z`) | daily |
| Race results | `GET /{season}/{round}/results/` | after race, poll every 30 min up to +12 h |
| Qualifying | `GET /{season}/{round}/qualifying/` (`Q1,Q2,Q3`) | after qualifying |
| Sprint | `GET /{season}/{round}/sprint/` | after sprint |
| Driver standings | `GET /{season}/driverstandings/`, snapshot `GET /{season}/{round}/driverstandings/` | after race |
| Constructor standings | `GET /{season}/constructorstandings/`, `/{season}/{round}/constructorstandings/` | after race |
| Circuits | `GET /{season}/circuits/` → `circuitId, circuitName, url, Location{lat,long,locality,country}` | weekly |
| Past winners at circuit | `GET /circuits/{circuitId}/results/1/?limit=100` | weekly — **unverified route on Jolpica (Ergast had it); check in P7-04a** |

Gaps: **no circuit length, no lap count** in the circuit object. Lap count = `laps` of the winner in the last race at the circuit. Circuit length = curated file `apps/backend/src/modules/f1/data/circuit-facts.ts` (facts, no images), reviewed each season.
Budget: < 50 req/day (schedule + results), well under 500/h; limiter at 2 req/s.

---

## 4. OpenF1 (laps, stints, positions, track outline)

| | |
|---|---|
| Docs | <https://openf1.org/docs>, auth <https://openf1.org/auth.html> |
| Base | `https://api.openf1.org/v1/` (JSON; `csv=true` for CSV) |
| Free | **Historical data from 2023**, no key. Data becomes "historical" **30 min after a session ends** |
| Live | Paid (€9.90/mo, OAuth2 token, MQTT/WebSocket) — **not used** |
| Limits | Free: **3 req/s, 30 req/min** |
| Licence | CC BY-NC-SA 4.0, personal/non-commercial; credit not required (we credit anyway) |

Endpoints (filters: any attribute, operators `= < <= > >=`, `session_key=latest`):
| Purpose | Endpoint |
|---|---|
| Map our sessions → OpenF1 | `GET /sessions?year=YYYY&country_name=…` → `session_key, meeting_key, session_name, date_start, date_end` |
| Fast session result | `GET /session_result?session_key=K` (`position, driver_number, dnf, dns, dsq, gap_to_leader`) |
| Laps | `GET /laps?session_key=K&driver_number=N` (`lap_number, lap_duration, sectors, is_pit_out_lap`) |
| Tyre strategy | `GET /stints?session_key=K` (`compound, lap_start, lap_end, tyre_age_at_start`) |
| Track outline | `GET /location?session_key=K&driver_number=N&date>=T1&date<T2` (x,y,z ≈ 3.7 Hz, arbitrary origin) — one fast lap of one driver |
| Drivers (number ↔ name) | `GET /drivers?session_key=K` |

Usage: fetched on demand when the user opens a comparison/track view, then cached **permanently** (historical data is immutable). Circuit outline computed once per circuit (≈ 300–400 points for one lap), downsampled, stored in `f1_circuit_outline`.
Unverified (docs page partly truncated during research): exact field lists of `session_result`, `stints`, `sessions`; pagination/result-size limits. Verify with a live request in P7-01 and update this file.
Fallback: comparison falls back to Jolpica-only metrics (points, quali H2H, avg finish); track view shows no outline.

---

## 5. DNS-over-HTTPS (network tools, client-side)

| | Cloudflare | Google |
|---|---|---|
| Docs | <https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/> | <https://developers.google.com/speed/public-dns/docs/doh/json> |
| Endpoint | `GET https://cloudflare-dns.com/dns-query?name=<n>&type=<t>` + header `Accept: application/dns-json` | `GET https://dns.google/resolve?name=<n>&type=<t>` |
| Params | `name`, `type`, `do`, `cd` | `name`, `type`, `cd`, `do`, `edns_client_subnet` |
| Response | `Status, TC, RD, RA, AD, CD, Question[], Answer[{name,type,TTL,data}]` | same schema |
| CORS | `Access-Control-Allow-Origin: *` (**tested 2026-11-25**) | `Access-Control-Allow-Origin: *` (**tested**) |
| Limits | not documented | 429 + `Retry-After` |

Called directly from the browser (no backend involvement, no key). CSP `connect-src` must allow both hosts. Primary Cloudflare, fallback Google on network error/5xx. Response parsed with zod in `core-nettools`.

---

## 6. Telegram Bot API

| | |
|---|---|
| Docs | <https://core.telegram.org/bots/api>, webhooks <https://core.telegram.org/bots/webhooks>, FAQ <https://core.telegram.org/bots/faq> |
| Auth | Bot token in URL path `https://api.telegram.org/bot<token>/<method>` (secret) |
| Webhook | `setWebhook{url, secret_token (1–256 chars, A-Z a-z 0-9 _ -), allowed_updates: ["message","callback_query"], drop_pending_updates, max_connections}`; Telegram sends header **`X-Telegram-Bot-Api-Secret-Token`** |
| Ports / TLS | Only **443, 80, 88, 8443**; TLS ≥ 1.2; no redirects; CN/SAN must match; **IPv4 only** (no IPv6 webhooks) |
| Source IPs | 149.154.160.0/20, 91.108.4.0/22 ("might change") — logged, not enforced |
| Retries | Non-2xx → retried "a reasonable number of attempts"; updates kept ≤ 24 h. `update_id` is sequential → used for dedupe |
| Rate limits | ~1 msg/s per chat (bursts OK, then 429) |
| Limits | Message text 1–4096 chars after entity parsing |

Methods used: `setWebhook`, `getWebhookInfo`, `sendMessage` (`parse_mode: "HTML"`), `editMessageText`, `answerCallbackQuery`, `setMyCommands`.
Unverified: exact HTML-subset escaping rules (read "Formatting options" section in P1-03a); `BotCommand` constraints.

---

## 7. Web Push / Apple requirements

| Requirement | Source |
|---|---|
| iOS/iPadOS **16.4+**, only for **Home Screen web apps**; manifest `display: standalone` (or `fullscreen`) | [WebKit 13878](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |
| Permission request must follow a **user gesture** (tap "Enable notifications") | WebKit 13878 |
| `userVisibleOnly: true`; **every push must display a notification** — violations revoke the subscription | [WebKit 12945](https://webkit.org/blog/12945/meet-web-push/), [16535](https://webkit.org/blog/16535/meet-declarative-web-push/) |
| Uses APNs; no Apple Developer account needed; allow `*.push.apple.com` outbound | WebKit 13878 |
| Badging API (`setAppBadge`) supported | WebKit 13878 |
| **Declarative Web Push** (iOS/iPadOS 18.4+): JSON payload `{"web_push":8030,"notification":{"title","navigate","body","app_badge"}}` shown without a service worker; SW `push` handler still works and may replace it | WebKit 16535 |
| ITP may delete service-worker registrations of sites not visited for a while → classic push breaks; declarative push still shows notifications | WebKit 16535 |
| Focus modes apply; multiple installs allowed | WebKit 13878 |
| HTTPS required (secure context for Service Worker/Push API) | general W3C requirement; Apple doc page not machine-readable — verify manually in P1-01c |
| VAPID (RFC 8292) + payload encryption (RFC 8291) | handled by `web-push` library; Next.js PWA guide also uses `web-push` ([guide](https://nextjs.org/docs/app/guides/progressive-web-apps)) |

Unverified: APNs web-push payload size limit, TTL/Urgency header handling. Keep payloads < 2 KB and set `TTL` per notification (`expires_at − now`).

---

## 8. Backup storage (ops, not app)

**Chosen (D6): Backblaze B2** — owner already has an account. First **10 GB free**, free egress up to 3× stored, class A/B/C API calls free, lifecycle rules supported ([pricing](https://www.backblaze.com/cloud-storage/pricing), [lifecycle](https://www.backblaze.com/docs/cloud-storage-lifecycle-rules)). Accessed via `rclone` (B2 backend, tier 1). Encryption with `age` (`apt install age` on Ubuntu 22.04+).

## 9. Healthchecks.io (ops monitoring)

**Chosen (D6).** Free hosted dead-man's switch: a check expects a ping every *period*; after *period + grace* without a ping it e-mails the owner. Two checks: `heartbeat` (period 5 min, grace 10 min — pinged by `system.heartbeat`) and `backup` (period 1 day, grace 2 h — pinged by `ops/backup.sh`). Ping URLs are secrets-light but kept in `.env` (`HEALTHCHECKS_HEARTBEAT_URL`, `HEALTHCHECKS_BACKUP_URL`).
Ping endpoints (success `GET <ping-url>`, start `<ping-url>/start`, failure `<ping-url>/fail`) — **verify against <https://healthchecks.io/docs/http_api/> in P0-09b** and update this section.
