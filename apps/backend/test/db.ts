import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { inject } from 'vitest';
import { createDatabase, type DatabaseHandle } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';

export type TestDatabase = DatabaseHandle & {
  /** Connection URL of this test file's own database. */
  readonly url: string;
  /** Closes the pool and drops the database. */
  readonly drop: () => Promise<void>;
};

const withAdminClient = async (run: (client: pg.Client) => Promise<unknown>): Promise<void> => {
  const client = new pg.Client({ connectionString: inject('postgresAdminUrl') });
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.end();
  }
};

/**
 * Creates a fresh, fully migrated database in the shared test container, so every test file
 * is isolated from the others. Call `drop()` in `afterAll`.
 */
export const createTestDatabase = async (): Promise<TestDatabase> => {
  // Generated name (uuid hex), safe to interpolate as an identifier.
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  await withAdminClient((client) => client.query(`CREATE DATABASE "${name}"`));

  const url = new URL(inject('postgresAdminUrl'));
  url.pathname = `/${name}`;
  const handle = createDatabase({
    url: url.toString(),
    maxConnections: 5,
    onPoolError: (error) => {
      throw new Error(`Test database pool error in ${name}`, { cause: error });
    },
  });
  await runMigrations(handle.db);

  return {
    ...handle,
    url: url.toString(),
    drop: async () => {
      await handle.close();
      await withAdminClient((client) =>
        client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`),
      );
    },
  };
};
