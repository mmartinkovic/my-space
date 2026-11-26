import { vitestPreset } from '@projectu/core-config/vitest';
import { defineConfig } from 'vitest/config';

/** Unit tests only; `*.int.test.ts` need Docker and run via vitest.integration.config.ts. */
export default defineConfig({
  test: {
    ...vitestPreset.test,
    exclude: ['**/node_modules/**', '**/*.int.test.ts'],
  },
});
