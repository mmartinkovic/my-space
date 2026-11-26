import { errorResponseSchema } from '@projectu/core-schemas';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildApp } from './app.ts';
import { AppError, type AppErrorDetail } from './errors.ts';

const internalSecret = 'db-password=hunter2';

/** App with throwaway routes that exercise each error path. */
const createTestApp = () => {
  const app = buildApp({ logger: false, trustProxyCidrs: [], readinessChecks: [] });

  app.get(
    '/items',
    { schema: { querystring: z.object({ limit: z.coerce.number().int().min(1) }) } },
    (request) => ({ limit: request.query.limit }),
  );
  app.post(
    '/items',
    { schema: { body: z.object({ name: z.string().min(1), tags: z.array(z.string()) }) } },
    (request) => ({ name: request.body.name }),
  );
  app.get('/boom', () => {
    throw new Error(internalSecret);
  });
  app.get('/bad-response', { schema: { response: { 200: z.object({ id: z.uuid() }) } } }, () => ({
    id: 'not-a-uuid',
  }));
  app.post('/app-error', { schema: { body: z.object({ kind: z.string() }) } }, (request) => {
    const detail = appErrorDetails.find((candidate) => candidate.kind === request.body.kind);
    if (detail === undefined) {
      throw new Error(`unknown kind ${request.body.kind}`);
    }
    throw new AppError(detail);
  });

  return app;
};

const appErrorDetails: readonly AppErrorDetail[] = [
  { kind: 'validation', message: 'Bad dates', issues: [{ path: 'from', message: 'After to' }] },
  { kind: 'unauthorized', message: 'Sign in first' },
  { kind: 'forbidden', message: 'Step-up required', code: 'step-up-required' },
  { kind: 'not-found', message: 'No such deadline' },
  { kind: 'conflict', message: 'Last passkey', code: 'last-passkey' },
  { kind: 'rate-limited', message: 'Slow down' },
  { kind: 'upstream-unavailable', message: 'Provider down' },
];

const parseError = (body: string) => errorResponseSchema.parse(JSON.parse(body));

describe('error responses', () => {
  it('answers unknown routes with a 404 error body', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/nope' });
    expect(response.statusCode).toBe(404);
    expect(parseError(response.body)).toEqual({
      error: { code: 'not-found', message: 'Route not found' },
    });
  });

  it('reports query validation issues with dotted paths', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/items?limit=0' });
    expect(response.statusCode).toBe(400);
    const { error } = parseError(response.body);
    expect(error.code).toBe('validation');
    expect(error.issues?.map((issue) => issue.path)).toEqual(['limit']);
  });

  it('reports nested body validation issues', async () => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/items',
      payload: { name: '', tags: ['ok', 3] },
    });
    expect(response.statusCode).toBe(400);
    expect(
      parseError(response.body)
        .error.issues?.map((issue) => issue.path)
        .sort(),
    ).toEqual(['name', 'tags.1']);
  });

  it('passes valid input through', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/items?limit=5' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ limit: 5 });
  });

  it.each([
    ['validation', 400, 'validation'],
    ['unauthorized', 401, 'unauthorized'],
    ['forbidden', 403, 'step-up-required'],
    ['not-found', 404, 'not-found'],
    ['conflict', 409, 'last-passkey'],
    ['rate-limited', 429, 'rate-limited'],
    ['upstream-unavailable', 503, 'upstream-unavailable'],
  ])('maps AppError %s to %i with code %s', async (kind, status, code) => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/app-error',
      payload: { kind },
    });
    expect(response.statusCode).toBe(status);
    expect(parseError(response.body).error.code).toBe(code);
  });

  it('keeps validation issues of an AppError', async () => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/app-error',
      payload: { kind: 'validation' },
    });
    expect(parseError(response.body).error.issues).toEqual([{ path: 'from', message: 'After to' }]);
  });

  it('hides internal error details and stack traces', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/boom' });
    expect(response.statusCode).toBe(500);
    expect(parseError(response.body)).toEqual({
      error: { code: 'internal', message: 'Internal server error' },
    });
    expect(response.body).not.toContain('hunter2');
    expect(response.body).not.toContain('stack');
    expect(response.body).not.toContain('.ts');
  });

  it('turns a response that violates its schema into a generic 500', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/bad-response' });
    expect(response.statusCode).toBe(500);
    expect(parseError(response.body).error.code).toBe('internal');
    expect(response.body).not.toContain('not-a-uuid');
  });

  it.each([
    ['malformed JSON', 'application/json', '{"name":', 400, 'bad-request'],
    [
      'a content type without a parser',
      'application/x-www-form-urlencoded',
      'name=x',
      415,
      'unsupported-media-type',
    ],
  ])('rejects %s', async (_case, contentType, payload, status, code) => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/items',
      headers: { 'content-type': contentType },
      payload,
    });
    expect(response.statusCode).toBe(status);
    expect(parseError(response.body).error.code).toBe(code);
  });
});
