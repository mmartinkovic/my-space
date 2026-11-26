import { addLocalDays, localDateOf, toUtcInstant } from '../time/zone.ts';

export type QuietHours = {
  /** Wall-clock time, `HH:mm` or `HH:mm:ss`; the first quiet moment. */
  start: string;
  /** Wall-clock time, `HH:mm` or `HH:mm:ss`; the first moment that is no longer quiet. */
  end: string;
};

export type QuietHoursQuery = {
  now: Date;
  /** IANA zone name, e.g. `Europe/Bratislava`. */
  zone: string;
  quietHours: QuietHours;
};

const withSeconds = (localTime: string): string =>
  localTime.length === 'HH:mm'.length ? `${localTime}:00` : localTime;

/**
 * Whether `now` falls in a quiet window. A window includes its start and excludes its end,
 * wraps midnight when the start is later than the end, and is empty when both are equal.
 * Times that a DST transition makes special are resolved as in `toUtcInstant`.
 *
 * @throws RangeError for a malformed time, an unknown zone or an invalid `now`.
 */
export const isInQuietHours = ({ now, zone, quietHours }: QuietHoursQuery): boolean => {
  const today = localDateOf({ instant: now, zone });
  const wrapsMidnight = withSeconds(quietHours.start) > withSeconds(quietHours.end);
  // Only the windows opening yesterday (when wrapping) or today can contain `now`.
  return [addLocalDays(today, -1), today].some((startDate) => {
    const endDate = wrapsMidnight ? addLocalDays(startDate, 1) : startDate;
    const from = toUtcInstant({ localDate: startDate, localTime: quietHours.start, zone });
    const to = toUtcInstant({ localDate: endDate, localTime: quietHours.end, zone });
    return from <= now && now < to;
  });
};

/**
 * First time after `now` at which the wall clock reaches the end of quiet hours. While
 * `isInQuietHours` is true this is the end of the current window; call it only then to defer
 * something, because outside a window it returns the end of an upcoming one.
 *
 * @throws RangeError for a malformed time, an unknown zone or an invalid `now`.
 */
export const nextQuietHoursEnd = ({ now, zone, quietHours }: QuietHoursQuery): Date => {
  const today = localDateOf({ instant: now, zone });
  const endToday = toUtcInstant({ localDate: today, localTime: quietHours.end, zone });
  return endToday > now
    ? endToday
    : toUtcInstant({ localDate: addLocalDays(today, 1), localTime: quietHours.end, zone });
};
