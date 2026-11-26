import { localeSchema } from '@projectu/core-schemas';
import { describe, expect, it } from 'vitest';
import { defaultLocale } from './index.ts';

describe('defaultLocale', () => {
  it('is Slovak and a supported locale', () => {
    expect(defaultLocale).toBe('sk');
    expect(localeSchema.parse(defaultLocale)).toBe('sk');
  });
});
