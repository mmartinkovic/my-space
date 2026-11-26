# ADR 0006 — Notification channels: Web Push + Telegram

- Status: Accepted
- Date: 2026-11-25

## Context
iOS Web Push only works for Home Screen web apps (iOS 16.4+), requires a user gesture to subscribe, forbids silent pushes, and ITP may delete service-worker registrations of rarely visited sites ([WebKit 13878](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [WebKit 16535](https://webkit.org/blog/16535/meet-declarative-web-push/)). Telegram is more reliable but is a third-party channel.

## Decision
- Two channels, routed per notification type × channel in `notification_preference` (defaults in docs/features/notifications.md). Both channels are fed from the same `notification` row, rendered at send time (spoiler filter + i18n applied then).
- **Web Push** sent from the backend with the `web-push` npm library (VAPID + RFC 8291 payload encryption). Payload uses the **Declarative Web Push** JSON format (`"web_push": 8030`, `notification.title`, `notification.navigate`), which iOS/iPadOS 18.4+ displays even without a service worker; the service worker also handles the `push` event for other browsers and older iOS. Every push shows a visible notification (never silent).
- Subscriptions returning 404/410 are deleted; other failures increment `failure_count`.
- **Telegram** via plain `fetch` to the Bot API (no SDK — we use ~5 methods). Result notifications carry an inline "Watched" button that reveals the result by editing the message.
- Quiet hours 22:00–07:00 (configurable) defer notifications; notifications with `expires_at` before the deferred time are expired instead.

## Alternatives
- Telegram only — loses native iOS feel and app badge. Rejected.
- ntfy / Pushover — extra app and service. Rejected.

## Consequences
- + Redundancy: critical types (brief, deadline reminders) default to both channels.
- − Two renderers to maintain (plain text with Telegram HTML subset, push title/body).
