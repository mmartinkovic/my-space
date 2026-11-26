import { readinessResponseSchema } from '@projectu/core-schemas';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db.ts';
import { buildApp } from '../app.ts';
import { createDatabase } from './client.ts';
import { databaseReadinessCheck } from './readiness.ts';

const database = await createTestDatabase();

afterAll(async () => {
  await database.drop();
});

const readyStatusWith = async (pool: Parameters<typeof databaseReadinessCheck>[0]) => {
  const app = buildApp({
    logger: false,
    trustProxyCidrs: [],
    readinessChecks: [databaseReadinessCheck(pool)],
  });
  const response = await app.inject({ method: 'GET', url: '/api/health/ready' });
  await app.close();
  return { status: response.statusCode, body: readinessResponseSchema.parse(response.json()) };
};

describe('database readiness', () => {
  it('is ready when the database answers', async () => {
    expect(await readyStatusWith(database.pool)).toEqual({
      status: 200,
      body: { status: 'ready' },
    });
  });

  it('is not ready when the database is unreachable', async () => {
    const unreachable = createDatabase({
      url: 'postgres://projectu:unused@127.0.0.1:1/projectu',
      maxConnections: 1,
      onPoolError: () => undefined,
    });
    try {
      expect(await readyStatusWith(unreachable.pool)).toEqual({
        status: 503,
        body: { status: 'not-ready' },
      });
    } finally {
      await unreachable.close();
    }
  });

  it('gives every test file its own database', async () => {
    const result = await database.pool.query<{ name: string }>('select current_database() as name');
    expect(result.rows[0]?.name).toMatch(/^test_[0-9a-f]{32}$/);
  });
});
