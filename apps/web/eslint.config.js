// @ts-check
import { createEslintConfig } from '@projectu/core-config/eslint';

export default createEslintConfig({ rootDir: import.meta.dirname, ignores: ['next-env.d.ts'] });
