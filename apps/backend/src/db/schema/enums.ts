import { localeSchema } from '@projectu/core-schemas';
import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * PostgreSQL enums used by the tables that exist so far (DATA-MODEL.md "Enums").
 * An enum that is also part of the API contract takes its values from `core-schemas`.
 */
export const localeEnum = pgEnum('locale', localeSchema.enum);

export const sessionScopeEnum = pgEnum('session_scope', ['full', 'recovery']);

export const clientKindEnum = pgEnum('client_kind', ['web', 'native']);

export const challengeKindEnum = pgEnum('challenge_kind', ['registration', 'authentication']);

export const authEventKindEnum = pgEnum('auth_event_kind', [
  'setup_completed',
  'login_succeeded',
  'login_failed',
  'passkey_added',
  'passkey_removed',
  'recovery_code_used',
  'recovery_codes_regenerated',
  'session_revoked',
  'ical_token_rotated',
]);
