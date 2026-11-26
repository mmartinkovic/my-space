/**
 * Drizzle schema barrel: every table and enum module is re-exported here so that
 * drizzle-kit (migration generation) and the typed client see the whole schema.
 */
export {
  authEventKindEnum,
  challengeKindEnum,
  clientKindEnum,
  localeEnum,
  sessionScopeEnum,
} from './enums.ts';
export { appSettings } from './settings.ts';
export { authEvent, recoveryCode, session, webauthnChallenge, webauthnCredential } from './auth.ts';
