// @ts-check
import { createEslintConfig } from './eslint/index.js';

export default createEslintConfig({
  rootDir: import.meta.dirname,
  ignores: ['test/fixtures/**'],
});
