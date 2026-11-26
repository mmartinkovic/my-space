import { describe, expect, it } from 'vitest';
import { buildApp } from './app.ts';

/** `app.inject` connects from 127.0.0.1, so that address plays the reverse proxy here. */
const clientIpSeenBy = async (trustProxyCidrs: readonly string[]): Promise<string> => {
  const app = buildApp({ logger: false, trustProxyCidrs, readinessChecks: [] });
  app.get('/ip', (request) => ({ ip: request.ip }));
  const response = await app.inject({
    method: 'GET',
    url: '/ip',
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });
  const body: unknown = response.json();
  return typeof body === 'object' && body !== null && 'ip' in body ? String(body.ip) : '';
};

describe('trusted proxy', () => {
  it('ignores X-Forwarded-For when no proxy is trusted', async () => {
    expect(await clientIpSeenBy([])).toBe('127.0.0.1');
  });

  it('ignores X-Forwarded-For from an address outside the trusted CIDRs', async () => {
    expect(await clientIpSeenBy(['172.18.0.0/16'])).toBe('127.0.0.1');
  });

  it('uses X-Forwarded-For from a trusted proxy', async () => {
    expect(await clientIpSeenBy(['127.0.0.0/8'])).toBe('203.0.113.7');
  });
});
