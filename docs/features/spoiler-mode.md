# Feature: Spoiler mode

## User stories
- As the owner, I turn on spoiler mode per sport so results stay hidden until I mark the event as watched.
- As the owner, results reveal themselves automatically 24 hours after the event ends, so old results don't stay hidden forever.

## Rule (single source: `core-domain/spoiler`)
```
visible(event) = event.finished
              AND ( !event.isFollowed
                    OR !spoilerEnabled(event.sport)
                    OR watched(event)
                    OR now >= event.finishedAt + autoRevealHours )   // default 24 h
```
Only **followed** events are protected (favourite-team matches, PL headline match, all F1 sessions). Results of other matches are always visible.
Returns a discriminated union: `visible` | `hidden { revealsAt }` | `not-finished`.

## Defaults
- Spoiler mode **on** for football and F1. Auto-reveal after **24 h** (setting `spoiler_auto_reveal_hours`).

## Where it applies
| Surface | Behaviour when hidden |
|---|---|
| Calendar / match / session detail | Score / classification absent from API JSON; UI shows "Result hidden · reveals at …" + "Watched" button |
| Football tables | If any **followed** match of that competition is hidden → table shown as of the last matchday whose followed matches are all visible (`asOf` label) |
| F1 standings & driver comparison | Snapshot as of the last round whose **race** is visible; comparison aggregates exclude hidden rounds |
| Live status | "Live" badge allowed (not a spoiler); minute/score not shown |
| Morning brief | Hidden results rendered as "hidden" lines |
| Web Push | Result notification body: "Liverpool – Arsenal skončil" (no score) |
| Telegram | Same text + "👀 Watched" button; pressing it marks watched and edits the message to include the result |
| iCal | Never contains results regardless of spoiler state |

## Rules
- "Watched" is per event (`event_watch`); for F1 it is per session (watching the race does not reveal qualifying, and vice versa — the race result reveals qualifying implicitly through the grid, which is accepted).
- "Unwatch" is allowed (row deleted).
- Turning spoiler mode off reveals everything for that sport immediately; turning it on hides finished-but-not-watched events younger than 24 h.
- Telegram "Watched" callback validates the event id and chat id; it is idempotent.
- Non-followed events (e.g. other PL matches) are never hidden and don't affect the standings snapshot.

## Edge cases
- Event without `finished_at` (provider never marked finished) → stays `not-finished`; sync job reconciles; after 24 h past `ends_at` the event is shown as "result unavailable".
- Clock skew: rule uses server time only.

## Acceptance criteria
- [ ] Table-driven unit tests for the rule (followed/not followed × spoiler on/off × watched × before/after 24 h × not finished).
- [ ] Integration test: with spoiler on, `/api/sports/events`, brief payload, push payload, Telegram text and iCal for a finished match contain no score.
- [ ] Standings snapshot logic tested with a hidden followed match on matchday N → returns matchday N−1.
