import { expect } from 'vitest';

/**
 * Asserts that a query fails on the named PostgreSQL constraint. Drizzle wraps the driver error,
 * so the constraint name is on the `cause`.
 */
export const expectViolation = async (
  query: PromiseLike<unknown>,
  constraint: string,
): Promise<void> => {
  await expect(query).rejects.toMatchObject({ cause: { constraint } });
};
