import type { Locale } from '@projectu/core-schemas';
import { intlTags } from './locale.ts';

type ZonedInput = {
  instant: Date;
  locale: Locale;
  /** IANA zone name, e.g. `Europe/Bratislava`. */
  timeZone: string;
};

const formatZoned = (
  { instant, locale, timeZone }: ZonedInput,
  style: Pick<Intl.DateTimeFormatOptions, 'dateStyle' | 'timeStyle'>,
): string => new Intl.DateTimeFormat(intlTags[locale], { ...style, timeZone }).format(instant);

export const formatDate = (input: ZonedInput): string =>
  formatZoned(input, { dateStyle: 'medium' });

export const formatTime = (input: ZonedInput): string => formatZoned(input, { timeStyle: 'short' });

export const formatDateTime = (input: ZonedInput): string =>
  formatZoned(input, { dateStyle: 'medium', timeStyle: 'short' });

const relativeUnits = [
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
] as const;

/**
 * Elapsed time between `now` and `instant` in the largest whole unit (days, hours, minutes),
 * rounded towards zero; under a minute it reads as "now". It counts elapsed time, not calendar
 * days, so it never says "tomorrow".
 */
export const formatRelativeTime = ({
  instant,
  now,
  locale,
}: {
  instant: Date;
  now: Date;
  locale: Locale;
}): string => {
  const offset = (instant.getTime() - now.getTime()) / 1000;
  if (Number.isNaN(offset)) {
    throw new RangeError('Invalid time value');
  }
  const largest = relativeUnits.find(({ seconds }) => Math.abs(offset) >= seconds);
  if (largest === undefined) {
    return new Intl.RelativeTimeFormat(intlTags[locale], { numeric: 'auto' }).format(0, 'second');
  }
  return new Intl.RelativeTimeFormat(intlTags[locale]).format(
    Math.trunc(offset / largest.seconds),
    largest.unit,
  );
};

export const formatNumber = ({ value, locale }: { value: number; locale: Locale }): string =>
  new Intl.NumberFormat(intlTags[locale]).format(value);

/** Money is stored as integer cents; the only currency is EUR. */
export const formatEuro = ({ cents, locale }: { cents: number; locale: Locale }): string =>
  new Intl.NumberFormat(intlTags[locale], { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
