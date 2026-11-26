import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.ts';

export type DatabaseOptions = {
  readonly url: string;
  /** Pool size; keep small on the 2 GB server (Postgres `max_connections=30`, pg-boss uses its own). */
  readonly maxConnections: number;
  /**
   * Errors of idle pooled clients (e.g. the server restarted). pg emits them as an `error` event,
   * which would crash the process if nobody listened.
   */
  readonly onPoolError: (error: Error) => void;
};

/** Creates the connection pool and the typed Drizzle client (snake_case columns in SQL). */
export const createDatabase = ({ url, maxConnections, onPoolError }: DatabaseOptions) => {
  const pool = new pg.Pool({ connectionString: url, max: maxConnections });
  pool.on('error', onPoolError);
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  return { db, pool, close: () => pool.end() };
};

export type DatabaseHandle = ReturnType<typeof createDatabase>;
export type Database = DatabaseHandle['db'];
