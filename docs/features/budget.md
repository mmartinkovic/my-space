# Feature: Student budget

## User stories
- As the owner, I record income and expenses by category (app or Telegram) in EUR.
- As the owner, I set a monthly limit per expense category and get warned at 80 % and 100 %.
- As the owner, I see charts of where my money goes.

## Categories (seeded, editable)
- Expenses: Jedlo, Doprava, Internát, Škola, Zábava, Predplatné, Zdravie, Iné.
- Income: Výživné, Vreckové, Brigáda, Iné.
- Each has a slug + aliases for Telegram (`jedlo` / `food`, `skola` / `school`, …). Archiving hides a category from pickers but keeps history; deleting is only possible without transactions.

## Rules
- Amounts are integer cents (`amount_cents > 0`), currency EUR; formatted with `Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })`.
- Transaction date is a local `date` (default today); month = calendar month in Europe/Bratislava.
- Limits: `default_monthly_limit_cents` per expense category; optional per-month override. Effective limit = override ?? default ?? none.
- Monthly overview (`core-domain/budget`): per category spent, limit, remaining, % used, status `ok` (< 80 %) / `warning` (80–99 %) / `over` (≥ 100 %); totals income, expenses, balance.
- Alerts: after each expense write, compute status for its category/month; crossing into `warning` or `over` plans a `budget_limit` notification (`dedupe_key budget:<cat>:<YYYY-MM>:<80|100>`) → at most one per threshold per month. Deleting expenses doesn't "un-send".
- Charts (hand-written SVG): bar chart spent vs limit per category (current month), line chart daily cumulative spending vs month's total limit, 6-month income vs expense bars.
- Quick add form: amount (numeric keypad on iOS, accepts comma), category chips, optional note, date. Idempotency key per submit.
- CSV export of transactions (date, category, kind, amount, note) for a chosen range.

## Edge cases
- Comma vs dot decimals; rounding never via floats — parse to cents by string handling (`core-domain/money`).
- Limit 0 → any expense = over.
- Editing a past-month transaction recomputes that month; alerts only for the current month.

## Acceptance criteria
- [ ] Money parsing/formatting unit tests (`4`, `4.5`, `4,50`, `0,01`, `1 234,56`, invalid inputs).
- [ ] Limit status unit tests incl. thresholds exactly at 80 % and 100 %.
- [ ] Integration test: two expenses crossing 80 % then 100 % produce exactly two alerts; a third expense produces none.
- [ ] Telegram `/expense` and app quick add produce identical records.
