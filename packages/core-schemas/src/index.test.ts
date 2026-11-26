import { describe, expect, it } from 'vitest';
import { localeSchema } from './index.ts';

describe('localeSchema', () => {
  it.each(['sk', 'en'])('accepts %s', (value) => {
    expect(localeSchema.safeParse(value).success).toBe(true);
  });

  it.each(['de', 'SK', '', 'sk-SK'])('rejects %j', (value) => {
    expect(localeSchema.safeParse(value).success).toBe(false);
  });
});
