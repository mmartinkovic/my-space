# ADR 0005 — Authentication: passkeys + recovery codes, DB sessions

- Status: Accepted
- Date: 2026-11-25

## Context
Single user, app reachable from the internet, used from iPhone PWA and desktop. User chose recovery via a second passkey (a) and one-time recovery codes (b).

## Decision
- **WebAuthn passkeys** via `@simplewebauthn/server` + `@simplewebauthn/browser` (v14; server requires Node ≥ 22 — [docs](https://simplewebauthn.dev/docs/packages/server)). `userVerification: 'required'`, `residentKey: 'required'`. Multiple passkeys supported (iPhone/iCloud Keychain + laptop or security key).
- **Bootstrap**: registration of the first passkey requires `SETUP_TOKEN` (env) and is only possible while zero credentials exist. After that the setup endpoint returns 404.
- **Recovery codes**: 10 codes, 16 chars base32 (80 bits) each, shown once, stored as SHA-256 hashes (high entropy → slow hash unnecessary). A code creates a `recovery`-scoped session that can only register a new passkey; the code is consumed; Telegram alert is sent. Regenerating invalidates the old batch.
- **Sessions**: opaque 32-byte random token in cookie `__Host-session` (`HttpOnly; Secure; SameSite=Lax; Path=/`), stored as SHA-256 hash in `session`. 30-day sliding expiry. Sensitive actions (passkey management, recovery-code regeneration, iCal token rotation, Telegram unlink) require **step-up**: a passkey assertion within the last 10 minutes (`elevated_until`).
- **Future Expo client**: same session table, token sent as `Authorization: Bearer` (`client_kind = 'native'`); passkeys on native need Associated Domains — out of scope now.

## Alternatives
- Password + TOTP — phishable, more to manage. Rejected.
- Magic link via Telegram — depends on Telegram availability; kept as a possible later recovery option, not built.
- JWT sessions — revocation is harder; no benefit for one server. Rejected.

## Consequences
- + Phishing-resistant, no passwords stored.
- − Losing all passkeys **and** recovery codes = lockout; last resort is SSH + CLI `pnpm --filter @projectu/backend auth:reset` (documented in SECURITY.md), which requires server access.
