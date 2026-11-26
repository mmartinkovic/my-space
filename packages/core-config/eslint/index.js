// @ts-check
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Root-level tool config files; linted through the tooling tsconfig (Node types), not the package tsconfig. */
export const toolingFiles = ['*.config.js', '*.config.ts'];

const toolingTsconfig = fileURLToPath(new URL('../tsconfig/tooling.json', import.meta.url));

/** Node built-ins and globals forbidden in platform-agnostic (`core-*`) runtime code. */
const nodeOnlyGlobals = [
  'process',
  'Buffer',
  'global',
  '__dirname',
  '__filename',
  'require',
  'module',
];

/** Files that frameworks/tools require to have a default export. */
export const defaultExportAllowedFiles = [
  '**/app/**/{page,layout,loading,error,global-error,not-found,template,default,route}.{ts,tsx}',
  '**/app/manifest.ts',
  '**/middleware.ts',
  '**/*.config.{js,mjs,cjs,ts,mts}',
];

/**
 * Shared flat config with the project's strict rules (see CLAUDE.md "Coding conventions").
 * @param {{ rootDir: string, ignores?: string[], universal?: boolean }} options
 *   rootDir = directory of the consumer's tsconfig.json;
 *   universal = code must run in browser, Node and React Native (no Node APIs) — set for runtime `core-*` packages.
 */
export const createEslintConfig = ({ rootDir, ignores = [], universal = false }) =>
  defineConfig(
    { ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/.turbo/**', ...ignores] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: { allowDefaultProject: toolingFiles, defaultProject: toolingTsconfig },
          tsconfigRootDir: rootDir,
        },
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
        // Undefined identifiers are reported by TypeScript (also in JS via checkJs).
        'no-undef': 'off',
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
    universal
      ? {
          ignores: toolingFiles,
          rules: {
            'no-restricted-globals': [
              'error',
              ...nodeOnlyGlobals.map((name) => ({
                name,
                message:
                  'core-* code must not use Node APIs (it runs in browser, Node and React Native).',
              })),
            ],
            'no-restricted-imports': [
              'error',
              {
                patterns: [
                  {
                    group: ['@projectu/*/*', '!@projectu/core-config/*'],
                    message: 'Import @projectu packages by name only (no deep imports).',
                  },
                  {
                    group: ['node:*'],
                    message:
                      'core-* code must not use Node APIs (it runs in browser, Node and React Native).',
                  },
                ],
              },
            ],
          },
        }
      : {},
    {
      files: defaultExportAllowedFiles,
      rules: { 'no-restricted-exports': 'off' },
    },
  );
