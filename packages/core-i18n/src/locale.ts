import type { Locale } from '@projectu/core-schemas';

/** Locale used before the owner chooses one in settings (ADR 0008). */
export const defaultLocale = 'sk' satisfies Locale;

/** BCP 47 tags handed to `Intl`; `en-GB` gives day-month order and a 24-hour clock. */
export const intlTags = { sk: 'sk-SK', en: 'en-GB' } as const satisfies Record<Locale, string>;
