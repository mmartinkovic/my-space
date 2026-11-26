// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Files that frameworks/tools require to have a default export. */
export const defaultExportAllowedFiles = [
  '**/app/**/{page,layout,loading,error,global-error,not-found,template,default,route}.{ts,tsx}',
  '**/app/manifest.ts',
  '**/middleware.ts',
  '**/*.config.{js,mjs,cjs,ts,mts}',
];

/**
 * Shared flat config with the project's strict rules (see CLAUDE.md "Coding conventions").
 * @param {{ rootDir: string, ignores?: string[] }} options rootDir = directory of the consumer's tsconfig.json
 */
export const createEslintConfig = ({ rootDir, ignores = [] }) =>
  defineConfig(
    { ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/.turbo/**', ...ignores] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: rootDir },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-empty': ['error', { allowEmptyCatch: false }],
        'no-console': 'error',
        'no-restricted-syntax': [
          'error',
          {
            selector: 'TSEnumDeclaration',
            message: 'Use a string-literal union or an `as const` array instead of enum.',
          },
        ],
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@projectu/*/*', '!@projectu/core-config/*'],
                message: 'Import @projectu packages by name only (no deep imports).',
              },
            ],
          },
        ],
        'no-restricted-exports': [
          'error',
          {
            restrictDefaultExports: {
              direct: true,
              named: true,
              defaultFrom: true,
              namedFrom: true,
              namespaceFrom: true,
            },
          },
        ],
      },
    },
    {
      files: defaultExportAllowedFiles,
      rules: { 'no-restricted-exports': 'off' },
    },
  );
