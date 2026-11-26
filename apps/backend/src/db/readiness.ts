import type pg from 'pg';
import type { ReadinessCheck } from '../modules/system/health.routes.ts';

/** `/api/health/ready` dependency: the database answers a trivial query. */
export const databaseReadinessCheck = (pool: pg.Pool): ReadinessCheck => ({
  name: 'database',
  isReady: async () => {
    await pool.query('select 1');
    return true;
  },
});
