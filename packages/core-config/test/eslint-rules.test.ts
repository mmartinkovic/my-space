import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { createEslintConfig } from '../eslint/index.js';

const fixturesDir = path.join(import.meta.dirname, 'fixtures');

const eslint = new ESLint({
  cwd: fixturesDir,
  overrideConfigFile: true,
  overrideConfig: createEslintConfig({ rootDir: fixturesDir }),
});

const universalEslint = new ESLint({
  cwd: fixturesDir,
  overrideConfigFile: true,
  overrideConfig: createEslintConfig({ rootDir: fixturesDir, universal: true }),
});

const ruleIdsFor = async (fixture: string, linter: ESLint = eslint): Promise<string[]> => {
  const [result] = await linter.lintFiles([path.join(fixturesDir, fixture)]);
  if (result === undefined) {
    throw new Error(`No lint result for ${fixture}`);
  }
  return result.messages.map((message) => message.ruleId ?? `fatal: ${message.message}`);
};

describe('shared ESLint config', () => {
  it.each([
    ['bad-any.ts', '@typescript-eslint/no-explicit-any'],
    ['bad-as-cast.ts', '@typescript-eslint/consistent-type-assertions'],
    ['bad-non-null.ts', '@typescript-eslint/no-non-null-assertion'],
    ['bad-default-export.ts', 'no-restricted-exports'],
    ['bad-deep-import.ts', 'no-restricted-imports'],
    ['bad-empty-catch.ts', 'no-empty'],
    ['bad-switch.ts', '@typescript-eslint/switch-exhaustiveness-check'],
    ['bad-floating-promise.ts', '@typescript-eslint/no-floating-promises'],
    ['bad-enum.ts', 'no-restricted-syntax'],
  ])('%s is rejected by %s', async (fixture, ruleId) => {
    expect(await ruleIdsFor(fixture)).toContain(ruleId);
  });

  it('allows `as const`', async () => {
    expect(await ruleIdsFor('good-as-const.ts')).toEqual([]);
  });

  it('allows default exports in Next.js special files', async () => {
    expect(await ruleIdsFor('app/page.ts')).toEqual([]);
  });

  it.each([
    ['uses-node-import.ts', 'no-restricted-imports'],
    ['uses-node-global.ts', 'no-restricted-globals'],
  ])('universal mode rejects %s via %s', async (fixture, ruleId) => {
    expect(await ruleIdsFor(fixture, universalEslint)).toContain(ruleId);
  });

  it('allows Node imports when universal mode is off', async () => {
    expect(await ruleIdsFor('uses-node-import.ts')).not.toContain('no-restricted-imports');
  });

  it('still forbids deep imports in universal mode', async () => {
    expect(await ruleIdsFor('bad-deep-import.ts', universalEslint)).toContain(
      'no-restricted-imports',
    );
  });
});
