import { describe, expect, it } from 'vitest';
import { isIpv4Address } from './index.ts';

describe('isIpv4Address', () => {
  it.each(['0.0.0.0', '192.168.1.1', '255.255.255.255', '10.0.0.10'])('accepts %s', (text) => {
    expect(isIpv4Address(text)).toBe(true);
  });

  it.each(['256.0.0.1', '1.2.3', '1.2.3.4.5', '01.2.3.4', '1.2.3.-4', 'a.b.c.d', '', ' 1.2.3.4'])(
    'rejects %j',
    (text) => {
      expect(isIpv4Address(text)).toBe(false);
    },
  );
});
