import { describe, expect, it, vi } from 'vitest';
import { startOfLocalDay, startOfLocalMonth, toUtcInstant } from './zone.ts';

const zone = 'Europe/Bratislava';

const convert = (local: string, timeZone = zone): string => {
  const [localDate = '', localTime = ''] = local.split(' ');
  return toUtcInstant({ localDate, localTime, zone: timeZone }).toISOString();
};

describe('toUtcInstant', () => {
  it.each([
    ['winter', '2026-01-15 12:00', '2026-01-15T11:00:00.000Z'],
    ['summer', '2026-07-15 12:00', '2026-07-15T10:00:00.000Z'],
    ['with seconds', '2026-07-15 23:59:30', '2026-07-15T21:59:30.000Z'],
    ['previous UTC day', '2027-01-01 00:00', '2026-12-31T23:00:00.000Z'],
    ['leap day', '2028-02-29 08:00', '2028-02-29T07:00:00.000Z'],
  ])('converts a regular time (%s)', (_case, local, utc) => {
    expect(convert(local)).toBe(utc);
  });

  it.each([
    ['2026-03-29 01:59', '2026-03-29T00:59:00.000Z'],
    ['2026-03-29 03:00', '2026-03-29T01:00:00.000Z'],
    ['2027-03-28 01:59', '2027-03-28T00:59:00.000Z'],
    ['2027-03-28 03:00', '2027-03-28T01:00:00.000Z'],
    ['2026-10-25 01:59', '2026-10-24T23:59:00.000Z'],
    ['2026-10-25 03:00', '2026-10-25T02:00:00.000Z'],
    ['2027-10-31 01:59', '2027-10-30T23:59:00.000Z'],
    ['2027-10-31 03:00', '2027-10-31T02:00:00.000Z'],
  ])('converts %s next to a DST transition', (local, utc) => {
    expect(convert(local)).toBe(utc);
  });

  it.each([
    ['2026-03-29 02:00', '2026-03-29T01:00:00.000Z'],
    ['2026-03-29 02:30', '2026-03-29T01:30:00.000Z'],
    ['2027-03-28 02:00', '2027-03-28T01:00:00.000Z'],
    ['2027-03-28 02:59', '2027-03-28T01:59:00.000Z'],
  ])('moves the non-existent time %s past the spring gap', (local, utc) => {
    expect(convert(local)).toBe(utc);
  });

  it.each([
    ['2026-10-25 02:00', '2026-10-25T00:00:00.000Z'],
    ['2026-10-25 02:30', '2026-10-25T00:30:00.000Z'],
    ['2027-10-31 02:00', '2027-10-31T00:00:00.000Z'],
    ['2027-10-31 02:59', '2027-10-31T00:59:00.000Z'],
  ])('picks the first occurrence of the ambiguous time %s', (local, utc) => {
    expect(convert(local)).toBe(utc);
  });

  it.each([
    ['America/New_York', '2027-03-14 02:30', '2027-03-14T07:30:00.000Z'],
    ['America/New_York', '2027-11-07 01:30', '2027-11-07T05:30:00.000Z'],
    ['Asia/Kolkata', '2027-03-28 02:30', '2027-03-27T21:00:00.000Z'],
    ['UTC', '2027-03-28 02:30', '2027-03-28T02:30:00.000Z'],
  ])('applies the same rules in %s at %s', (timeZone, local, utc) => {
    expect(convert(local, timeZone)).toBe(utc);
  });

  it.each(['UTC', 'Europe/Bratislava', 'America/New_York', 'Pacific/Auckland'])(
    'gives the same result on a host in %s',
    (hostZone) => {
      vi.stubEnv('TZ', hostZone);
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(hostZone);

      expect(convert('2027-03-28 02:30')).toBe('2027-03-28T01:30:00.000Z');
      expect(convert('2027-10-31 02:30')).toBe('2027-10-31T00:30:00.000Z');
    },
  );

  it.each([
    '2027-02-29 12:00',
    '2027-04-31 12:00',
    '2027-13-01 12:00',
    '2027-1-5 12:00',
    '2027-01-05 24:00',
    '2027-01-05 12:60',
    '2027-01-05 9:00',
    '2027-01-05 ',
  ])('rejects the invalid input "%s"', (local) => {
    expect(() => convert(local)).toThrow(RangeError);
  });

  it('rejects an unknown zone', () => {
    expect(() => convert('2027-01-05 12:00', 'Europe/Nowhere')).toThrow(RangeError);
  });
});

describe('startOfLocalDay', () => {
  it.each([
    ['just before local midnight', '2026-11-26T22:59:59.999Z', '2026-11-25T23:00:00.000Z'],
    ['exactly local midnight', '2026-11-26T23:00:00.000Z', '2026-11-26T23:00:00.000Z'],
    ['spring day, after the jump', '2026-03-29T12:00:00.000Z', '2026-03-28T23:00:00.000Z'],
    ['day after the spring jump', '2027-03-29T12:00:00.000Z', '2027-03-28T22:00:00.000Z'],
    ['spring 2027', '2027-03-28T12:00:00.000Z', '2027-03-27T23:00:00.000Z'],
    ['autumn day, after the change', '2026-10-25T12:00:00.000Z', '2026-10-24T22:00:00.000Z'],
    ['autumn 2027', '2027-10-31T22:59:00.000Z', '2027-10-30T22:00:00.000Z'],
    ['day after the autumn change', '2027-11-01T12:00:00.000Z', '2027-10-31T23:00:00.000Z'],
  ])('finds local midnight (%s)', (_case, instant, start) => {
    expect(startOfLocalDay({ instant: new Date(instant), zone }).toISOString()).toBe(start);
  });

  it.each([
    ['skipped midnight', '2027-03-14T12:00:00.000Z', '2027-03-14T05:00:00.000Z'],
    ['repeated midnight', '2027-11-07T12:00:00.000Z', '2027-11-07T04:00:00.000Z'],
  ])('returns the first instant of a day with a %s', (_case, instant, start) => {
    const result = startOfLocalDay({ instant: new Date(instant), zone: 'America/Havana' });

    expect(result.toISOString()).toBe(start);
  });

  it('rejects an invalid instant', () => {
    expect(() => startOfLocalDay({ instant: new Date('nope'), zone })).toThrow(RangeError);
  });
});

describe('startOfLocalMonth', () => {
  it.each([
    ['month already started locally', '2026-11-30T23:30:00.000Z', '2026-11-30T23:00:00.000Z'],
    ['last moment of the month', '2026-11-30T22:59:59.999Z', '2026-10-31T23:00:00.000Z'],
    ['March, across the spring jump', '2027-03-31T12:00:00.000Z', '2027-02-28T23:00:00.000Z'],
    ['April, in summer time', '2027-04-15T12:00:00.000Z', '2027-03-31T22:00:00.000Z'],
    ['October, across the autumn change', '2027-10-31T12:00:00.000Z', '2027-09-30T22:00:00.000Z'],
    ['November, in winter time', '2027-11-15T12:00:00.000Z', '2027-10-31T23:00:00.000Z'],
    ['new year', '2026-12-31T23:00:00.000Z', '2026-12-31T23:00:00.000Z'],
  ])('finds the local start of the month (%s)', (_case, instant, start) => {
    expect(startOfLocalMonth({ instant: new Date(instant), zone }).toISOString()).toBe(start);
  });
});
