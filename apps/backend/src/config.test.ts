import { describe, expect, it } from 'vitest';
import { formatConfigIssues, loadConfig } from './config.ts';

const validEnv = { NODE_ENV: 'development' };

describe('loadConfig', () => {
  it('applies defaults for optional variables', () => {
    expect(loadConfig(validEnv)).toEqual({
      ok: true,
      config: {
        nodeEnv: 'development',
        logLevel: 'info',
        backendHost: '127.0.0.1',
        backendPort: 4000,
      },
    });
  });

  it('reads explicit values', () => {
    expect(
      loadConfig({
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
        BACKEND_HOST: '0.0.0.0',
        BACKEND_PORT: '4100',
      }),
    ).toEqual({
      ok: true,
      config: {
        nodeEnv: 'production',
        logLevel: 'warn',
        backendHost: '0.0.0.0',
        backendPort: 4100,
      },
    });
  });

  it.each([
    [{}, 'NODE_ENV', 'is required'],
    [{ NODE_ENV: '' }, 'NODE_ENV', 'is required'],
    [{ NODE_ENV: 'staging' }, 'NODE_ENV', 'must be one of: development, test, production'],
    [
      { ...validEnv, LOG_LEVEL: 'verbose' },
      'LOG_LEVEL',
      'must be one of: trace, debug, info, warn, error',
    ],
    [
      { ...validEnv, BACKEND_HOST: 'localhost' },
      'BACKEND_HOST',
      'must be an IPv4 address, e.g. 127.0.0.1 or 0.0.0.0',
    ],
    [
      { ...validEnv, BACKEND_PORT: 'abc' },
      'BACKEND_PORT',
      'must be an integer between 1 and 65535',
    ],
    [{ ...validEnv, BACKEND_PORT: '0' }, 'BACKEND_PORT', 'must be an integer between 1 and 65535'],
    [
      { ...validEnv, BACKEND_PORT: '70000' },
      'BACKEND_PORT',
      'must be an integer between 1 and 65535',
    ],
  ])('%j → %s %s', (env, variable, message) => {
    expect(loadConfig(env)).toEqual({ ok: false, issues: [{ variable, message }] });
  });

  it('reports every problem at once', () => {
    const result = loadConfig({ BACKEND_PORT: 'abc' });
    expect(result.ok ? [] : result.issues.map((issue) => issue.variable)).toEqual([
      'NODE_ENV',
      'BACKEND_PORT',
    ]);
  });

  it('never echoes received values in issues', () => {
    const secretLike = 'p4ssw0rd-should-not-appear';
    const result = loadConfig({ NODE_ENV: secretLike, BACKEND_PORT: secretLike });
    expect(JSON.stringify(result)).not.toContain(secretLike);
  });
});

describe('formatConfigIssues', () => {
  it('lists each variable on its own line', () => {
    expect(
      formatConfigIssues([
        { variable: 'NODE_ENV', message: 'is required' },
        { variable: 'BACKEND_PORT', message: 'must be an integer between 1 and 65535' },
      ]),
    ).toBe(
      [
        'Invalid environment configuration (see .env.example):',
        '  - NODE_ENV: is required',
        '  - BACKEND_PORT: must be an integer between 1 and 65535',
        '',
      ].join('\n'),
    );
  });
});
