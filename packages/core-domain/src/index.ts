export { startOfLocalDay, startOfLocalMonth, toUtcInstant } from './time/zone.ts';
export type { LocalDateTime, ZonedInstant } from './time/zone.ts';

/**
 * Exhaustiveness guard for `switch` over unions (CLAUDE.md): passing anything but `never`
 * is a type error, and reaching it at runtime throws.
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
};
