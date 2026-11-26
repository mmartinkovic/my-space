import { describe, expect, it } from 'vitest';
import { isInQuietHours, nextQuietHoursEnd } from './quiet-hours.ts';

const zone = 'Europe/Bratislava';

/** `'22:00-07:00'` → quiet hours starting at 22:00 and ending at 07:00. */
const parseWindow = (window: string) => {
  const [start = '', end = ''] = window.split('-');
  return { start, end };
};

const isQuiet = (window: string, now: string, timeZone = zone): boolean =>
  isInQuietHours({ now: new Date(now), zone: timeZone, quietHours: parseWindow(window) });

const endAfter = (window: string, now: string, timeZone = zone): string =>
  nextQuietHoursEnd({
    now: new Date(now),
    zone: timeZone,
    quietHours: parseWindow(window),
  }).toISOString();

describe('isInQuietHours', () => {
  // Bratislava is UTC+1 on these dates.
  it.each([
    ['just before the start', '2026-11-26T20:59:59.999Z', false],
    ['exactly at the start', '2026-11-26T21:00:00.000Z', true],
    ['before midnight', '2026-11-26T22:30:00.000Z', true],
    ['exactly at local midnight', '2026-11-26T23:00:00.000Z', true],
    ['after midnight', '2026-11-27T02:00:00.000Z', true],
    ['just before the end', '2026-11-27T05:59:59.999Z', true],
    ['exactly at the end', '2026-11-27T06:00:00.000Z', false],
    ['in the middle of the day', '2026-11-27T11:00:00.000Z', false],
  ])('handles a window wrapping midnight (%s)', (_case, now, quiet) => {
    expect(isQuiet('22:00-07:00', now)).toBe(quiet);
  });

  it.each([
    ['just before the start', '2026-11-26T11:59:59.999Z', false],
    ['exactly at the start', '2026-11-26T12:00:00.000Z', true],
    ['just before the end', '2026-11-26T13:29:59.999Z', true],
    ['exactly at the end', '2026-11-26T13:30:00.000Z', false],
    ['at night', '2026-11-26T23:00:00.000Z', false],
  ])('handles a window within one day (%s)', (_case, now, quiet) => {
    expect(isQuiet('13:00-14:30', now)).toBe(quiet);
  });

  it.each([
    ['spring 2026, before the start', '2026-03-28T20:59:00.000Z', false],
    ['spring 2026, after the jump', '2026-03-29T01:30:00.000Z', true],
    ['spring 2026, just before the end', '2026-03-29T04:59:00.000Z', true],
    ['spring 2026, at the end in summer time', '2026-03-29T05:00:00.000Z', false],
    ['spring 2027, just before the end', '2027-03-28T04:59:00.000Z', true],
    ['spring 2027, at the end in summer time', '2027-03-28T05:00:00.000Z', false],
    ['autumn 2026, at the start in summer time', '2026-10-24T20:00:00.000Z', true],
    ['autumn 2026, just before the end', '2026-10-25T05:59:00.000Z', true],
    ['autumn 2026, at the end in winter time', '2026-10-25T06:00:00.000Z', false],
    ['autumn 2027, just before the end', '2027-10-31T05:59:00.000Z', true],
    ['autumn 2027, at the end in winter time', '2027-10-31T06:00:00.000Z', false],
  ])('follows local time through a DST night (%s)', (_case, now, quiet) => {
    expect(isQuiet('22:00-07:00', now)).toBe(quiet);
  });

  it.each([
    ['start skipped: before the shifted start', '02:30-07:00', '2027-03-28T01:29:00.000Z', false],
    ['start skipped: at the shifted start', '02:30-07:00', '2027-03-28T01:30:00.000Z', true],
    ['end skipped: before the shifted end', '22:00-02:30', '2027-03-28T01:29:00.000Z', true],
    ['end skipped: at the shifted end', '22:00-02:30', '2027-03-28T01:30:00.000Z', false],
    ['window swallowed by the gap', '02:30-03:00', '2027-03-28T01:15:00.000Z', false],
    ['window swallowed by the gap, later', '02:30-03:00', '2027-03-28T01:45:00.000Z', false],
    ['end repeated: before its first pass', '22:00-02:30', '2027-10-31T00:29:00.000Z', true],
    ['end repeated: at its first pass', '22:00-02:30', '2027-10-31T00:30:00.000Z', false],
    ['end repeated: during the second pass', '22:00-02:30', '2027-10-31T01:15:00.000Z', false],
    ['start repeated: at its first pass', '02:30-07:00', '2027-10-31T00:30:00.000Z', true],
    ['start repeated: during the second pass', '02:30-07:00', '2027-10-31T01:15:00.000Z', true],
  ])('handles a boundary inside a DST transition (%s)', (_case, window, now, quiet) => {
    expect(isQuiet(window, now)).toBe(quiet);
  });

  it.each([
    ['same format', '22:00-22:00'],
    ['mixed formats', '22:00:00-22:00'],
    ['mixed formats, reversed', '22:00-22:00:00'],
  ])('treats equal start and end as no quiet hours (%s)', (_case, window) => {
    expect(isQuiet(window, '2026-11-26T20:59:00.000Z')).toBe(false);
    expect(isQuiet(window, '2026-11-26T21:00:00.000Z')).toBe(false);
    expect(isQuiet(window, '2026-11-27T09:00:00.000Z')).toBe(false);
  });

  it('accepts times with seconds, as PostgreSQL returns them', () => {
    expect(isQuiet('22:00:00-07:00:00', '2026-11-26T21:00:00.000Z')).toBe(true);
    expect(isQuiet('22:00:00-07:00:00', '2026-11-27T06:00:00.000Z')).toBe(false);
  });

  it('evaluates the window in the given zone', () => {
    const now = '2026-11-26T22:30:00.000Z';

    expect(isQuiet('22:00-07:00', now, 'Europe/Bratislava')).toBe(true);
    expect(isQuiet('22:00-07:00', now, 'America/New_York')).toBe(false);
  });

  it.each([
    ['start', '25:00-07:00', zone],
    ['end', '22:00-7:00', zone],
    ['zone', '22:00-07:00', 'Europe/Nowhere'],
  ])('rejects an invalid %s', (_case, window, timeZone) => {
    expect(() => isQuiet(window, '2026-11-26T12:00:00.000Z', timeZone)).toThrow(RangeError);
  });

  it('rejects an invalid instant', () => {
    expect(() => isQuiet('22:00-07:00', 'nope')).toThrow(RangeError);
  });
});

describe('nextQuietHoursEnd', () => {
  it.each([
    ['before midnight → next morning', '2026-11-26T22:30:00.000Z', '2026-11-27T06:00:00.000Z'],
    ['after midnight → same morning', '2026-11-27T02:00:00.000Z', '2026-11-27T06:00:00.000Z'],
    ['just before the end', '2026-11-27T05:59:59.999Z', '2026-11-27T06:00:00.000Z'],
    ['exactly at the end → a day later', '2026-11-27T06:00:00.000Z', '2026-11-28T06:00:00.000Z'],
    ['outside the window → upcoming end', '2026-11-27T11:00:00.000Z', '2026-11-28T06:00:00.000Z'],
    ['across new year', '2026-12-31T22:30:00.000Z', '2027-01-01T06:00:00.000Z'],
  ])('finds the end of the window (%s)', (_case, now, end) => {
    expect(endAfter('22:00-07:00', now)).toBe(end);
  });

  it.each([
    ['spring 2026', '2026-03-28T22:00:00.000Z', '2026-03-29T05:00:00.000Z'],
    ['spring 2027', '2027-03-27T22:00:00.000Z', '2027-03-28T05:00:00.000Z'],
    ['autumn 2026', '2026-10-24T21:00:00.000Z', '2026-10-25T06:00:00.000Z'],
    ['autumn 2027', '2027-10-30T21:00:00.000Z', '2027-10-31T06:00:00.000Z'],
  ])('keeps the local end time on a DST night (%s)', (_case, now, end) => {
    expect(endAfter('22:00-07:00', now)).toBe(end);
  });

  it.each([
    ['skipped end moves past the gap', '2027-03-27T22:00:00.000Z', '2027-03-28T01:30:00.000Z'],
    ['repeated end uses the first pass', '2027-10-30T21:00:00.000Z', '2027-10-31T00:30:00.000Z'],
    ['no second end in the repeated hour', '2027-10-31T01:15:00.000Z', '2027-11-01T01:30:00.000Z'],
  ])('handles an end inside a DST transition (%s)', (_case, now, end) => {
    expect(endAfter('22:00-02:30', now)).toBe(end);
  });

  it('finds the end of a window within one day', () => {
    expect(endAfter('13:00-14:30', '2026-11-26T12:15:00.000Z')).toBe('2026-11-26T13:30:00.000Z');
  });

  it('returns an instant outside quiet hours', () => {
    const quietHours = { start: '22:00', end: '07:00' };
    const end = nextQuietHoursEnd({ now: new Date('2027-03-27T23:00:00.000Z'), zone, quietHours });

    expect(isInQuietHours({ now: end, zone, quietHours })).toBe(false);
  });
});
