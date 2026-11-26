import { tzOffset } from '@date-fns/tz';

const millisecondsPerMinute = 60_000;
const millisecondsPerDay = 86_400_000;

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export type LocalDateTime = {
  /** Calendar date, `YYYY-MM-DD`. */
  localDate: string;
  /** Wall-clock time, `HH:mm` or `HH:mm:ss`. */
  localTime: string;
  /** IANA zone name, e.g. `Europe/Bratislava`. */
  zone: string;
};

export type ZonedInstant = {
  instant: Date;
  /** IANA zone name, e.g. `Europe/Bratislava`. */
  zone: string;
};

/** Offset of `zone` from UTC at the instant, positive east of Greenwich. */
const offsetAt = (zone: string, epochMs: number): number => {
  const minutes = tzOffset(zone, new Date(epochMs));
  if (Number.isNaN(minutes)) {
    throw new RangeError(`Unknown time zone or invalid instant: ${zone}`);
  }
  return Math.round(minutes * millisecondsPerMinute);
};

/** The wall-clock fields read as if they were UTC, the starting point for applying an offset. */
const parseWallClock = ({ localDate, localTime }: LocalDateTime): number => {
  const epochMs =
    localDatePattern.test(localDate) && localTimePattern.test(localTime)
      ? Date.parse(`${localDate}T${localTime}Z`)
      : Number.NaN;
  // `Date.parse` rolls impossible days over (30 February becomes March), so compare the date back.
  if (Number.isNaN(epochMs) || !new Date(epochMs).toISOString().startsWith(localDate)) {
    throw new RangeError(`Invalid local date or time: ${localDate} ${localTime}`);
  }
  return epochMs;
};

/**
 * Converts a wall-clock time in a zone to the UTC instant, following RFC 5545 §3.3.5
 * where a DST transition makes the wall-clock time special:
 * - ambiguous (clocks go back, the time happens twice): the first occurrence;
 * - non-existent (clocks go forward, the time is skipped): read with the offset in force before
 *   the gap, which lands the same distance after it (02:30 becomes 03:30).
 *
 * The result does not depend on the time zone of the machine running the code.
 *
 * @throws RangeError for a malformed or impossible date or time, or an unknown zone.
 */
export const toUtcInstant = (input: LocalDateTime): Date => {
  const wallClock = parseWallClock(input);
  // A day on either side is far enough to see the offsets before and after a nearby transition.
  const offsetBefore = offsetAt(input.zone, wallClock - millisecondsPerDay);
  const offsetAfter = offsetAt(input.zone, wallClock + millisecondsPerDay);
  const occurrences = [offsetBefore, offsetAfter]
    .map((offset) => wallClock - offset)
    .filter((candidate) => candidate + offsetAt(input.zone, candidate) === wallClock);
  return new Date(occurrences.length > 0 ? Math.min(...occurrences) : wallClock - offsetBefore);
};

const localDateOf = ({ instant, zone }: ZonedInstant): string => {
  const epochMs = instant.getTime();
  return new Date(epochMs + offsetAt(zone, epochMs)).toISOString().slice(0, 10);
};

/**
 * First instant of the zone's calendar day containing `instant`. Where DST skips midnight,
 * that is the first time after the gap.
 */
export const startOfLocalDay = (input: ZonedInstant): Date =>
  toUtcInstant({ localDate: localDateOf(input), localTime: '00:00', zone: input.zone });

/** First instant of the zone's calendar month containing `instant`. */
export const startOfLocalMonth = (input: ZonedInstant): Date =>
  toUtcInstant({
    localDate: `${localDateOf(input).slice(0, 7)}-01`,
    localTime: '00:00',
    zone: input.zone,
  });
