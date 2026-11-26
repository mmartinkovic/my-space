import { formatNumber } from './format.ts';
import { pluralSk } from './plural.ts';

type Count = { count: number };

const withNumber = (count: number, noun: string): string =>
  `${formatNumber({ value: count, locale: 'sk' })} ${noun}`;

/** Source dictionary: its shape is the `Dictionary` type every other language must satisfy. */
export const sk = {
  nav: {
    dashboard: 'Prehľad',
    calendar: 'Kalendár',
    school: 'Škola',
    inbox: 'Schránka',
    budget: 'Rozpočet',
    f1: 'F1',
    tools: 'Nástroje',
    settings: 'Nastavenia',
  },
  duration: {
    days: ({ count }: Count) =>
      withNumber(count, pluralSk(count, { one: 'deň', few: 'dni', many: 'dňa', other: 'dní' })),
    hours: ({ count }: Count) =>
      withNumber(
        count,
        pluralSk(count, { one: 'hodina', few: 'hodiny', many: 'hodiny', other: 'hodín' }),
      ),
    minutes: ({ count }: Count) =>
      withNumber(
        count,
        pluralSk(count, { one: 'minúta', few: 'minúty', many: 'minúty', other: 'minút' }),
      ),
  },
};

export type Dictionary = typeof sk;
