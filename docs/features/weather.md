# Feature: Weather

Source: Open-Meteo ([DATA-SOURCES.md §1](../DATA-SOURCES.md#1-open-meteo-weather)).

## User stories
- As the owner, I see current weather and a 3-day outlook for my configured locations on the dashboard.
- As the owner, I can add, remove and reorder locations in Settings, mark one as **primary** and toggle **show in brief** per location.

## Rules
- One Open-Meteo request for all locations every 30 min (`weather.refresh`), stored in `api_cache`; API reads only from cache.
- Locations added via Open-Meteo geocoding search (backend proxy endpoint, results limited to 5).
- Max 6 locations (keeps one request ≤ 10 variables × locations within "one call" rule as far as practical; exact call cost logged via `x-ratelimit-cost`).
- No seeded locations (personal data stays out of the repository). The first added location becomes primary; deleting the primary promotes the next one by `sort_order`.
- Primary location is always shown first on the dashboard and always included in the morning brief; other locations appear in the brief only when `show_in_brief` is on (default off).
- WMO code → icon + localised label (`core-i18n`).
- Attribution "Weather data by Open-Meteo.com" (link) visible on every weather widget.

## Edge cases
- Source down → last data with "updated HH:MM" and stale badge; > 24 h old → widget shows unavailable.
- Duplicate location name → 409.
- No locations configured → widget shows an "Add a location in Settings" prompt; brief omits the weather section.

## Acceptance criteria
- [ ] Widget shows all configured locations, primary first, then by `sort_order`, with stale indicator when applicable.
- [ ] Exactly one primary location whenever at least one location exists (DB constraint + service test).
- [ ] Mapper unit test against a recorded multi-location response fixture.
