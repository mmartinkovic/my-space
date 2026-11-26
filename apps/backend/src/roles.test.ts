import { describe, expect, it } from 'vitest';
import { backendRolesSchema, cidrListSchema } from './roles.ts';

describe('backendRolesSchema', () => {
  it.each([
    ['api,worker', ['api', 'worker']],
    ['api', ['api']],
    ['worker', ['worker']],
    [' worker , api ', ['worker', 'api']],
    ['api,api', ['api']],
    ['api,,worker,', ['api', 'worker']],
  ])('%j → %j', (text, expected) => {
    expect(backendRolesSchema.parse(text)).toEqual(expected);
  });

  it.each(['', ' , ', 'web', 'api,scheduler', 'API'])('rejects %j', (text) => {
    expect(backendRolesSchema.safeParse(text).success).toBe(false);
  });
});

describe('cidrListSchema', () => {
  it.each([
    ['', []],
    ['172.18.0.0/16', ['172.18.0.0/16']],
    ['172.18.0.0/16, 10.0.0.0/8', ['172.18.0.0/16', '10.0.0.0/8']],
    ['fd00::/8', ['fd00::/8']],
  ])('%j → %j', (text, expected) => {
    expect(cidrListSchema.parse(text)).toEqual(expected);
  });

  it.each(['172.18.0.1', '172.18.0.0/33', 'caddy', '0.0.0.0/0x'])('rejects %j', (text) => {
    expect(cidrListSchema.safeParse(text).success).toBe(false);
  });
});
