import { describe, expect, it } from 'vitest';
import { errorResponseSchema } from './index.ts';

describe('errorResponseSchema', () => {
  it('accepts an error with and without validation issues', () => {
    expect(
      errorResponseSchema.safeParse({ error: { code: 'not-found', message: 'Not found' } }).success,
    ).toBe(true);
    expect(
      errorResponseSchema.safeParse({
        error: {
          code: 'validation',
          message: 'Invalid input',
          issues: [{ path: 'limit', message: 'Too small' }],
        },
      }).success,
    ).toBe(true);
  });

  it.each([{}, { error: { code: '', message: 'x' } }, { error: { code: 'x' } }])(
    'rejects %j',
    (value) => {
      expect(errorResponseSchema.safeParse(value).success).toBe(false);
    },
  );
});
