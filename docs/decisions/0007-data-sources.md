# ADR 0007 — External data sources

- Status: Accepted
- Date: 2026-11-25
- Details and endpoints: [DATA-SOURCES.md](../DATA-SOURCES.md)

## Decision
| Domain | Primary | Secondary / fallback |
|---|---|---|
| Weather | Open-Meteo (free, non-commercial, CC BY 4.0) | Last cached forecast, marked stale |
| Football | football-data.org **free tier** (PL, PD, CL; 10 req/min; delayed scores) | Last cached data; paid "Free w/ Livescores" (€12/mo) only if delay proves annoying |
| F1 schedule/results/standings | Jolpica F1 API (CC BY-NC-SA, 4 req/s, 500 req/h) | OpenF1 `sessions`/`session_result`/`championship_*` (2023+) |
| F1 laps/stints/positions/track outline | OpenF1 historical (free from ~30 min after session end, 3 req/s, 30 req/min) | Feature hidden when unavailable |
| Circuit length | Curated static data in repo (Jolpica has no length/laps) | — |
| DNS lookups | Cloudflare DoH JSON, called **from the browser** (CORS `*` verified) | Google `dns.google/resolve` (CORS `*` verified) |

Rules: all keyed/rate-limited sources are called only from the backend; responses are cached in `api_cache`; each source has a per-source rate limiter and `data_source_status`; a failing source degrades only its module. Domestic cups are out of scope (not in free tier; user accepted).

## Consequences
- + Zero recurring cost.
- − Non-commercial licences (Open-Meteo free, Jolpica, OpenF1) — fine for personal use; the app must never be monetised without switching sources.
- − Free football scores are delayed (delay undocumented) → "full time" notifications may lag.
