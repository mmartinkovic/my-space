# Feature: Telegram bot

Source facts: [DATA-SOURCES.md §6](../DATA-SOURCES.md#6-telegram-bot-api).

## User stories
- As the owner, I receive notifications in Telegram as a reliable second channel.
- As the owner, I quickly capture notes and expenses from Telegram.

## Setup
1. Create the bot with @BotFather → `TELEGRAM_BOT_TOKEN`.
2. Find own chat id (send `/start` to the bot; `cli telegram:whoami` prints the last chat id from `getUpdates` *before* the webhook is set) → `TELEGRAM_ALLOWED_CHAT_ID`.
3. `cli telegram:set-webhook` → `setWebhook(url, secret_token=TELEGRAM_WEBHOOK_SECRET, allowed_updates=["message","callback_query"], drop_pending_updates=true)` + `setMyCommands`.

## Commands (Slovak and English aliases; reply language = app locale)
| Command | Example | Effect |
|---|---|---|
| `/note <text>` (`/n`) | `/note pozrieť VLSM cvičenie https://…` | Inbox item (`source=telegram`); URL extracted |
| plain text (no command) | `kúpiť lístky` | Same as `/note` |
| `/expense <amount> <category> [note]` (`/e`, `/vydavok`) | `/expense 4,50 jedlo obed` | Expense today; reply with confirmation + "↩️ Undo" button |
| `/income <amount> <category> [note]` (`/prijem`) | `/income 120 brigada` | Income today |
| `/today` (`/dnes`) | | Today's brief (re-rendered now) |
| `/deadlines` (`/terminy`) | | Open deadlines next 14 days |
| `/budget` (`/rozpocet`) | | This month: spent vs limit per category |
| `/help` | | Command list |

Parsing lives in `core-domain/telegram-commands` (pure, unit-tested): amount accepts `4.50`, `4,50`, `4`, `€4.50`, `4.50€`; rejects ≤ 0, > 100 000, more than 2 decimals. Category matched by slug or alias, case- and diacritics-insensitive (`skola` = `škola`). Unknown category → reply with the list of categories.

## Webhook handling
1. Constant-time compare of `X-Telegram-Bot-Api-Secret-Token`; mismatch → 401.
2. zod-parse a minimal `Update` subset (`update_id`, `message{chat.id, from.id, text, date}`, `callback_query{id, from.id, data, message{message_id, chat.id}}`); unknown update types → 200 ignored.
3. `chat.id`/`from.id` ≠ allowlisted → 200, no reply, log at `warn` (counter).
4. `INSERT telegram_update(update_id) ON CONFLICT DO NOTHING` — if not inserted, it's a redelivery → 200.
5. Execute command in the same transaction as its DB writes; the Telegram reply is sent after commit (failure to reply is logged; the write stands).
6. Always return 200 quickly (< 2 s); heavy work (e.g. `/today` rendering) is fine inline because it reads DB only.
- Expense idempotency: `budget_transaction.idempotency_key` = UUIDv5(update_id).
- Callback data: `watch:<eventUuid>`, `undo-tx:<txUuid>` (undo allowed within 10 min).

## Edge cases
- Message edited → `edited_message` not subscribed; ignored.
- Telegram 429 on send → retry after `retry_after` (from response `parameters`), max 3.
- Bot blocked by user → delivery fails, System page shows it.

## Acceptance criteria
- [ ] Forged request without/with wrong secret → 401; correct secret but foreign chat → ignored, nothing stored.
- [ ] Same `update_id` delivered twice → one inbox item / one expense.
- [ ] Parser unit tests cover all formats above and error replies.
- [ ] Inline "Watched" reveals the result by editing the original message.
