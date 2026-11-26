import { sql } from 'drizzle-orm';
import { bigint, boolean, check, index, inet, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { bytea, createdAt, instant, primaryId } from './columns.ts';
import { authEventKindEnum, challengeKindEnum, clientKindEnum, sessionScopeEnum } from './enums.ts';

/** Registered passkeys. "At least one remains" is enforced by the auth service. */
export const webauthnCredential = pgTable(
  'webauthn_credential',
  {
    id: primaryId(),
    credentialId: bytea().notNull().unique('webauthn_credential_credential_id_unique'),
    publicKey: bytea().notNull(),
    signCount: bigint({ mode: 'number' }).notNull(),
    transports: text().array().notNull(),
    deviceType: text({ enum: ['singleDevice', 'multiDevice'] }).notNull(),
    backedUp: boolean().notNull(),
    nickname: text().notNull(),
    createdAt: createdAt(),
    /** NULL = never used since registration. */
    lastUsedAt: instant(),
  },
  (table) => [
    check('webauthn_credential_sign_count_check', sql`${table.signCount} >= 0`),
    check(
      'webauthn_credential_device_type_check',
      sql`${table.deviceType} IN ('singleDevice', 'multiDevice')`,
    ),
    check(
      'webauthn_credential_nickname_check',
      sql`char_length(${table.nickname}) BETWEEN 1 AND 60`,
    ),
  ],
);

/** One-time recovery codes, stored hashed; regeneration replaces the whole batch. */
export const recoveryCode = pgTable(
  'recovery_code',
  {
    id: primaryId(),
    batchId: uuid().notNull(),
    codeHash: bytea().notNull().unique('recovery_code_code_hash_unique'),
    createdAt: createdAt(),
    /** NULL = unused. */
    usedAt: instant(),
  },
  (table) => [
    index('recovery_code_unused_batch_idx')
      .on(table.batchId)
      .where(sql`${table.usedAt} IS NULL`),
  ],
);

/** Server-side sessions; only the SHA-256 hash of the cookie token is stored (ADR 0005). */
export const session = pgTable(
  'session',
  {
    id: primaryId(),
    tokenHash: bytea().notNull().unique('session_token_hash_unique'),
    scope: sessionScopeEnum().notNull(),
    clientKind: clientKindEnum().notNull().default('web'),
    createdAt: createdAt(),
    lastSeenAt: instant().notNull().defaultNow(),
    expiresAt: instant().notNull(),
    /** NULL = no step-up. */
    elevatedUntil: instant(),
    userAgent: text().notNull(),
    ip: inet().notNull(),
  },
  (table) => [
    check('session_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'session_recovery_lifetime_check',
      sql`${table.scope} <> 'recovery' OR ${table.expiresAt} <= ${table.createdAt} + interval '15 minutes'`,
    ),
    index('session_expires_at_idx').on(table.expiresAt),
  ],
);

/** Pending WebAuthn challenges; deleted on the first verification attempt. */
export const webauthnChallenge = pgTable(
  'webauthn_challenge',
  {
    id: primaryId(),
    kind: challengeKindEnum().notNull(),
    challenge: bytea().notNull(),
    /** Set for step-up and recovery registrations; NULL for setup and login ceremonies. */
    sessionId: uuid().references(() => session.id, { onDelete: 'cascade' }),
    expiresAt: instant().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('webauthn_challenge_expires_at_idx').on(table.expiresAt),
    index('webauthn_challenge_session_id_idx').on(table.sessionId),
  ],
);

/** Append-only security audit log, kept for one year. */
export const authEvent = pgTable(
  'auth_event',
  {
    id: primaryId(),
    kind: authEventKindEnum().notNull(),
    /** NULL for events raised by the CLI. */
    ip: inet(),
    /** NULL for events raised by the CLI or requests without the header. */
    userAgent: text(),
    /** Extra context such as a passkey nickname; NULL when there is none. */
    detail: text(),
    createdAt: createdAt(),
  },
  (table) => [index('auth_event_created_at_idx').on(table.createdAt.desc())],
);
