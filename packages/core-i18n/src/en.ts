import { formatNumber } from './format.ts';
import { pluralEn } from './plural.ts';
import type { Dictionary } from './sk.ts';

const withNumber = (count: number, noun: string): string =>
  `${formatNumber({ value: count, locale: 'en' })} ${noun}`;

export const en = {
  nav: {
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    school: 'School',
    inbox: 'Inbox',
    budget: 'Budget',
    f1: 'F1',
    tools: 'Tools',
    settings: 'Settings',
  },
  duration: {
    days: ({ count }) => withNumber(count, pluralEn(count, { one: 'day', other: 'days' })),
    hours: ({ count }) => withNumber(count, pluralEn(count, { one: 'hour', other: 'hours' })),
    minutes: ({ count }) => withNumber(count, pluralEn(count, { one: 'minute', other: 'minutes' })),
  },
} satisfies Dictionary;
