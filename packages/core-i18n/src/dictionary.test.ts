import { describe, expect, it } from 'vitest';
import { getDictionary } from './index.ts';

describe('getDictionary', () => {
  it('returns the dictionary of the requested language', () => {
    expect(getDictionary('sk').nav.settings).toBe('Nastavenia');
    expect(getDictionary('en').nav.settings).toBe('Settings');
  });

  it.each([
    { count: 0, days: '0 dní', hours: '0 hodín', minutes: '0 minút' },
    { count: 1, days: '1 deň', hours: '1 hodina', minutes: '1 minúta' },
    { count: 2, days: '2 dni', hours: '2 hodiny', minutes: '2 minúty' },
    { count: 4, days: '4 dni', hours: '4 hodiny', minutes: '4 minúty' },
    { count: 5, days: '5 dní', hours: '5 hodín', minutes: '5 minút' },
    { count: 22, days: '22 dní', hours: '22 hodín', minutes: '22 minút' },
    { count: 1.5, days: '1,5 dňa', hours: '1,5 hodiny', minutes: '1,5 minúty' },
  ])('uses the Slovak plural forms for $count', ({ count, days, hours, minutes }) => {
    const { duration } = getDictionary('sk');

    expect(duration.days({ count })).toBe(days);
    expect(duration.hours({ count })).toBe(hours);
    expect(duration.minutes({ count })).toBe(minutes);
  });

  it.each([
    { count: 0, days: '0 days', hours: '0 hours', minutes: '0 minutes' },
    { count: 1, days: '1 day', hours: '1 hour', minutes: '1 minute' },
    { count: 2, days: '2 days', hours: '2 hours', minutes: '2 minutes' },
    { count: 1.5, days: '1.5 days', hours: '1.5 hours', minutes: '1.5 minutes' },
  ])('uses the English plural forms for $count', ({ count, days, hours, minutes }) => {
    const { duration } = getDictionary('en');

    expect(duration.days({ count })).toBe(days);
    expect(duration.hours({ count })).toBe(hours);
    expect(duration.minutes({ count })).toBe(minutes);
  });
});
