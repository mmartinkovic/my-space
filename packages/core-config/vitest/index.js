// @ts-check

/**
 * Shared Vitest options. Usage in a package's vitest.config.ts:
 * `export default defineConfig({ test: { ...vitestPreset.test, ...overrides } })`
 */
export const vitestPreset = {
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
};
