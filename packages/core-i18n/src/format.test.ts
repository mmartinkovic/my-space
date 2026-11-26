import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatEuro,
  formatNumber,
  formatRelativeTime,
  formatTime,
} from './index.ts';

const timeZone = 'Europe/Bratislava';

/** `Intl` separates thousands and currency signs with a no-break space. */
const nbsp = ' ';

describe('date and time formatting', () => {
  const instant = new Date('2026-11-26T17:30:00Z');

  it.each([
    { locale: 'sk', date: '26. 11. 2026', dateTime: '26. 11. 2026, 18:30' },
    { locale: 'en', date: '26 Nov 2026', dateTime: '26 Nov 2026, 18:30' },
  ] as const)('formats in the given zone ($locale)', ({ locale, date, dateTime }) => {
    expect(formatDate({ instant, locale, timeZone })).toBe(date);
    expect(formatTime({ instant, locale, timeZone })).toBe('18:30');
    expect(formatDateTime({ instant, locale, timeZone })).toBe(dateTime);
  });

  it('moves to the next day when the zone is ahead of UTC', () => {
    const lateEvening = new Date('2026-12-31T23:30:00Z');

    expect(formatDateTime({ instant: lateEvening, locale: 'en', timeZone })).toBe(
      '1 Jan 2027, 00:30',
    );
    expect(formatDateTime({ instant: lateEvening, locale: 'en', timeZone: 'UTC' })).toBe(
      '31 Dec 2026, 23:30',
    );
  });

  it.each([
    { utc: '2027-03-28T00:59:00Z', local: '1:59' },
    { utc: '2027-03-28T01:00:00Z', local: '3:00' },
    { utc: '2027-10-31T00:30:00Z', local: '2:30' },
    { utc: '2027-10-31T01:30:00Z', local: '2:30' },
  ])('follows daylight saving time at $utc', ({ utc, local }) => {
    expect(formatTime({ instant: new Date(utc), locale: 'sk', timeZone })).toBe(local);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-11-26T12:00:00Z');
  const secondsFromNow = (seconds: number) => new Date(now.getTime() + seconds * 1000);

  it.each([
    { seconds: 0, sk: 'teraz', en: 'now' },
    { seconds: 59, sk: 'teraz', en: 'now' },
    { seconds: -59, sk: 'teraz', en: 'now' },
    { seconds: 60, sk: 'o 1 minútu', en: 'in 1 minute' },
    { seconds: 3_599, sk: 'o 59 minút', en: 'in 59 minutes' },
    { seconds: -3 * 3_600, sk: 'pred 3 hodinami', en: '3 hours ago' },
    { seconds: 47 * 3_600, sk: 'o 1 deň', en: 'in 1 day' },
    { seconds: 3 * 86_400, sk: 'o 3 dni', en: 'in 3 days' },
    { seconds: -5 * 86_400, sk: 'pred 5 dňami', en: '5 days ago' },
  ])('describes an offset of $seconds s', ({ seconds, sk, en }) => {
    const instant = secondsFromNow(seconds);

    expect(formatRelativeTime({ instant, now, locale: 'sk' })).toBe(sk);
    expect(formatRelativeTime({ instant, now, locale: 'en' })).toBe(en);
  });

  it('rejects an invalid date instead of reporting "now"', () => {
    expect(() => formatRelativeTime({ instant: new Date('nope'), now, locale: 'en' })).toThrow(
      RangeError,
    );
  });
});

describe('number and currency formatting', () => {
  it('formats numbers with the locale separators', () => {
    expect(formatNumber({ value: 12_345.5, locale: 'sk' })).toBe(`12${nbsp}345,5`);
    expect(formatNumber({ value: 12_345.5, locale: 'en' })).toBe('12,345.5');
  });

  it.each([
    { cents: 0, sk: `0,00${nbsp}€`, en: '€0.00' },
    { cents: -5, sk: `-0,05${nbsp}€`, en: '-€0.05' },
    { cents: 123_456_750, sk: `1${nbsp}234${nbsp}567,50${nbsp}€`, en: '€1,234,567.50' },
  ])('formats $cents cents as euros', ({ cents, sk, en }) => {
    expect(formatEuro({ cents, locale: 'sk' })).toBe(sk);
    expect(formatEuro({ cents, locale: 'en' })).toBe(en);
  });
});
