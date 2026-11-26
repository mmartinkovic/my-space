import type { Locale } from '@projectu/core-schemas';
import { en } from './en.ts';
import { sk, type Dictionary } from './sk.ts';

const dictionaries: Record<Locale, Dictionary> = { sk, en };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];
