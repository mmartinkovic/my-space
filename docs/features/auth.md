# Feature: Authentication & sessions

Design: [ADR 0005](../decisions/0005-auth-passkeys.md), [SECURITY.md §3](../SECURITY.md#3-authentication-design).

## User stories
- As the owner, I sign in with Face ID (passkey) on my iPhone and with a passkey on my laptop.
- As the owner, I can recover access with a second passkey or a one-time recovery code if I lose a device.
- As the owner, I see and revoke active sessions and passkeys.

## Rules
- First passkey only via `/setup` with `SETUP_TOKEN` while no credential exists.
- 10 recovery codes per batch, shown once (copy + download as `.txt`), each single-use.
- Sessions: 30 days sliding (`last_seen_at` refreshed at most once per hour), cookie `__Host-session`.
- Step-up (assertion ≤ 10 min old) required for: add/remove passkey, regenerate recovery codes, rotate iCal tokens, revoke other sessions.
- The last remaining passkey cannot be deleted.
- Security events → `auth_event` + Telegram system notification (setup, new passkey, recovery code used, codes regenerated, iCal rotated).

## Edge cases
- Passkey registered in iCloud Keychain syncs to other Apple devices — counts as one credential (`backed_up = true`).
- Recovery code entered with spaces/dashes/lower-case → normalised before hashing.
- Expired/consumed challenge → 400 `challenge-expired`, client restarts ceremony.
- PWA standalone mode on iOS: WebAuthn works in Home Screen apps; test both Safari and standalone.

## Acceptance criteria
- [ ] Setup impossible without the token and impossible once a credential exists.
- [ ] Login with a passkey creates a session; logout deletes it.
- [ ] Recovery code yields a recovery-scoped session that can only register a passkey; reuse of the code fails.
- [ ] All non-public routes return 401 without a session (route-enumeration test).
- [ ] Sensitive actions return 403 `step-up-required` without recent assertion.
