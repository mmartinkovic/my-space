import { describe, expect, it } from 'vitest';
import { assertNever } from './index.ts';

describe('assertNever', () => {
  it('throws with the unexpected value when reached at runtime', () => {
    expect(() => {
      Reflect.apply(assertNever, undefined, ['surprise']);
    }).toThrow('Unexpected value: "surprise"');
  });
});
