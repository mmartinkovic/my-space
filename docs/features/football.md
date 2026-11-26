# Feature: Football

Source: football-data.org free tier — PL, La Liga (PD), Champions League (CL). Domestic cups out of scope. See [DATA-SOURCES.md §2](../DATA-SOURCES.md#2-football-dataorg-football).

## User stories
- As the owner, I follow Liverpool FC and FC Barcelona: fixtures, results, notifications 1 h before kickoff and after full time (spoiler-aware).
- As the owner, I see Premier League and La Liga tables.
- As the owner, I see the two main Premier League matches of each round: Liverpool's match and the headline match of the round ("šláger kola").

## Favourites & followed events
- Favourites: Liverpool (id 64), Barcelona (id 81) — `team.is_favourite`. All their matches in PL/PD/CL are followed.
- The PL headline match of each round is followed too.
- Followed ⇒ kickoff notification (60 min before) + result notification; spoiler protection; appear in brief, sports iCal, "followed only" calendar.

## Main matches of the PL round — `core-domain/football/main-matches`
Each PL matchday has **two main matches**:
1. **Liverpool's match** — reason `favourite_team`.
2. **Headline match (šláger kola)** — reason `round_headline`, never a Liverpool match.

Inputs: matchday fixtures, top-listed teams (configurable; default **LIV, MUN, MCI, CHE, TOT, ARS**), standings before the matchday, `extraTopCount` (default **4**).
```
bigSet     = topListed ∪ (the extraTopCount highest-placed teams NOT in topListed)
candidates = matchday fixtures without Liverpool
tier1      = candidates where home ∈ bigSet AND away ∈ bigSet
pool       = tier1 if non-empty, else candidates
headline   = argmin over pool of (position(home) + position(away))
             tie-breaks: better (lower) single position of the two → earlier kickoff → lower provider id
```
- Excluding Liverpool from `candidates` implements "if Liverpool would be in the headline, pick another match by both teams' table positions".
- If Liverpool has no PL match in the round (e.g. postponed), the round has only the headline match.
- "Standings before the matchday" = table snapshot after matchday N−1. Matchday 1 uses the **previous season's final table** (`/standings?season=<prev>`); promoted teams rank below all teams from that table, ordered by provider id. *(Confirmed by owner, A3.)*
- Decisions are computed when the matchday's fixtures are first synced ≥ 24 h before its first kickoff and **frozen** per match (`is_big_match`, `big_match_reason`), so notifications don't flip mid-round. A rescheduled headline keeps its status; no replacement is chosen. *(Confirmed by owner, A2.)*
- Exactly one headline per PL matchday — enforced by a partial unique index (DATA-MODEL.md `football_match`).
- Configurable in Settings: top-listed teams (multi-select from PL teams), extra count (0–10).

## Tables
- PL and La Liga: position, team, played, W/D/L, goal difference, points; favourite rows highlighted; big-set teams marked in PL.
- Spoiler: if a followed match of that competition is hidden → table as of last fully-visible matchday (`asOf` banner) — see spoiler-mode.md.
- CL: league-phase table if available from standings endpoint (verify in P6-03); otherwise fixtures/results list only.

## Sync & polling
- See DATA-SOURCES.md for endpoints/cadence. Live polling only for followed matches; free-tier scores are delayed, so "full-time" notifications may lag (UI notes "results may be delayed").
- Result notification fires when status first becomes `FINISHED` (`dedupe_key football:result:<id>`).

## Edge cases
- Postponed (`POSTPONED`) → cancel pending notifications, keep in calendar marked postponed.
- `AWARDED` → treated as finished with the awarded score.
- Extra time / penalties → `score_duration` shown ("p. pk.").
- Team promoted mid-dataset / team id unknown → upsert team on first sight.
- Matchday with fewer than 10 fixtures (postponements) → selection runs over the fixtures present.

## Acceptance criteria
- [ ] Main-match unit tests: Liverpool match always `favourite_team`; headline from tier 1 by lowest position sum; Liverpool would be in the best pairing → next best chosen; empty tier 1 → fallback to all candidates; tie-breaks; matchday 1 with previous season and promoted teams; no Liverpool fixture in round.
- [ ] Integration: exactly one headline per matchday; decision unchanged after a later table change.
- [ ] Sync mapper tests against recorded fixtures (PL matches, standings).
- [ ] Notification planner creates kickoff + result notifications only for followed matches.
