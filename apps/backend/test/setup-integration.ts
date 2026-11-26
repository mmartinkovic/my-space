import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  // Module augmentation of Vitest's ProvidedContext only works with an interface.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export interface ProvidedContext {
    /** Superuser URL of the shared test PostgreSQL; test files create their own databases. */
    postgresAdminUrl: string;
  }
}

/**
 * Vitest global setup for integration tests: one PostgreSQL 18 container per run
 * (same major as production, ADR 0002). Returns the teardown that stops it.
 */
export const setup = async (project: TestProject): Promise<() => Promise<void>> => {
  const container = await new PostgreSqlContainer('postgres:18').start();
  project.provide('postgresAdminUrl', container.getConnectionUri());
  return async () => {
    await container.stop();
  };
};
