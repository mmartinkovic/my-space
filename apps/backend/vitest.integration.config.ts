import { vitestPreset } from '@projectu/core-config/vitest';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests against a real PostgreSQL (Testcontainers, needs Docker): one container per
 * run, one fresh migrated database per test file (test/db.ts).
 */
export default defineConfig({
  test: {
    ...vitestPreset.test,
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['./test/setup-integration.ts'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
