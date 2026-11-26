import { Writable } from 'node:stream';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { createLoggerOptions, maskUrl, redactedValue } from './logger.ts';

const createCapturingApp = () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString('utf8'));
      callback();
    },
  });
  const app = Fastify({ logger: { ...createLoggerOptions({ logLevel: 'info' }), stream } });
  app.get('/ical/:feed/:file', () => 'ok');
  app.get('/echo', () => 'ok');
  return { app, output: () => lines.join('') };
};

describe('maskUrl', () => {
  it.each([
    ['/ical/sports/abcDEF123.ics', `/ical/sports/${redactedValue}.ics`],
    ['/ical/school/xyz.ics?x=1', `/ical/school/${redactedValue}.ics?x=1`],
    ['/api/x?token=abc&y=2', `/api/x?token=${redactedValue}&y=2`],
    ['/api/x?a=1&token=abc', `/api/x?a=1&token=${redactedValue}`],
    ['/api/sports/events?from=2026-01-01', '/api/sports/events?from=2026-01-01'],
  ])('%s → %s', (url, expected) => {
    expect(maskUrl(url)).toBe(expected);
  });
});

describe('logger redaction', () => {
  it('never writes secrets passed in log objects', async () => {
    const { app, output } = createCapturingApp();
    await app.ready();
    app.log.info(
      {
        token: 'tok-secret-1',
        user: { password: 'pw-secret-2' },
        headers: {
          authorization: 'Bearer auth-secret-3',
          cookie: '__Host-session=cookie-secret-4',
          'x-telegram-bot-api-secret-token': 'tg-secret-5',
        },
      },
      'diagnostics',
    );
    await app.close();

    const logged = output();
    for (const secret of [
      'tok-secret-1',
      'pw-secret-2',
      'auth-secret-3',
      'cookie-secret-4',
      'tg-secret-5',
    ]) {
      expect(logged).not.toContain(secret);
    }
    expect(logged).toContain(redactedValue);
  });

  it('masks iCal tokens and token query params in request logs', async () => {
    const { app, output } = createCapturingApp();
    await app.inject({ method: 'GET', url: '/ical/sports/feed-secret-6.ics' });
    await app.inject({ method: 'GET', url: '/echo?token=query-secret-7' });
    await app.close();

    const logged = output();
    expect(logged).not.toContain('feed-secret-6');
    expect(logged).not.toContain('query-secret-7');
    expect(logged).toContain(`/ical/sports/${redactedValue}.ics`);
  });
});
