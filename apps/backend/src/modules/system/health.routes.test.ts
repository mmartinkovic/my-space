import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import { livenessResponseSchema, readinessResponseSchema } from '@projectu/core-schemas';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app.ts';
import { healthRoutes, type ReadinessCheck } from './health.routes.ts';

const check = (name: string, isReady: () => Promise<boolean>): ReadinessCheck => ({
  name,
  isReady,
});

const appWith = (readinessChecks: readonly ReadinessCheck[]) =>
  buildApp({ logger: false, trustProxyCidrs: [], readinessChecks });

describe('GET /api/health/live', () => {
  it('answers ok without any dependency', async () => {
    const response = await appWith([check('db', () => Promise.resolve(false))]).inject({
      method: 'GET',
      url: '/api/health/live',
    });
    expect(response.statusCode).toBe(200);
    expect(livenessResponseSchema.parse(response.json())).toEqual({ status: 'ok' });
  });
});

describe('GET /api/health/ready', () => {
  it('is ready when there are no checks', async () => {
    const response = await appWith([]).inject({ method: 'GET', url: '/api/health/ready' });
    expect(response.statusCode).toBe(200);
    expect(readinessResponseSchema.parse(response.json())).toEqual({ status: 'ready' });
  });

  it('is ready when every check passes', async () => {
    const response = await appWith([
      check('db', () => Promise.resolve(true)),
      check('queue', () => Promise.resolve(true)),
    ]).inject({ method: 'GET', url: '/api/health/ready' });
    expect(response.statusCode).toBe(200);
  });

  it.each([
    ['returns false', () => Promise.resolve(false)],
    ['rejects', () => Promise.reject(new Error('connection refused to db:5432 user=projectu'))],
  ])('answers 503 without details when a check %s', async (_case, isReady) => {
    const response = await appWith([
      check('db', isReady),
      check('queue', () => Promise.resolve(true)),
    ]).inject({ method: 'GET', url: '/api/health/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'not-ready' });
    expect(response.body).not.toContain('db');
  });

  it('treats a check slower than the timeout as not ready', async () => {
    const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.register(healthRoutes, {
      checks: [check('slow', () => new Promise<boolean>(() => undefined))],
      checkTimeoutMs: 20,
    });
    const response = await app.inject({ method: 'GET', url: '/api/health/ready' });
    expect(response.statusCode).toBe(503);
  });
});
