import { defineConfig } from 'vitest/config';
import { vitestPreset } from './vitest/index.js';

export default defineConfig({
  test: { ...vitestPreset.test, testTimeout: 60_000 },
});
