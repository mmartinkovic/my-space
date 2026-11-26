import { intlTags } from './locale.ts';

/** `one`: 1 · `few`: 2–4 · `many`: decimals · `other`: 0 and 5+. */
type SlovakForms = { one: string; few: string; many: string; other: string };

type EnglishForms = { one: string; other: string };

const slovakRules = new Intl.PluralRules(intlTags.sk);
const englishRules = new Intl.PluralRules(intlTags.en);

export const pluralSk = (count: number, forms: SlovakForms): string => {
  const category = slovakRules.select(count);
  return category === 'one' || category === 'few' || category === 'many'
    ? forms[category]
    : forms.other;
};

export const pluralEn = (count: number, forms: EnglishForms): string =>
  englishRules.select(count) === 'one' ? forms.one : forms.other;
