import js from '@eslint/js';
import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/.nx/**',
      '**/.skein/**',
      '**/.artifacts/**',
      '.husky/_/**',
    ],
  },
  ...nx.configs['flat/base'],
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,js,mjs,cjs}'],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'no-duplicate-imports': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({ ...config, files: ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [
          'apps/desktop/tsconfig.app.json',
          'apps/renderer/tsconfig.app.json',
          'libs/core/tsconfig.lib.json',
          'libs/contracts/tsconfig.lib.json',
          'tsconfig.tools.json',
          'tsconfig.spec.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'platform:web',
              onlyDependOnLibsWithTags: ['platform:web', 'platform:shared'],
            },
            {
              sourceTag: 'platform:node',
              onlyDependOnLibsWithTags: ['platform:node', 'platform:shared'],
            },
            { sourceTag: 'platform:shared', onlyDependOnLibsWithTags: ['platform:shared'] },
          ],
        },
      ],
    },
  },
  {
    files: ['libs/core/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: ['electron'] }] },
  },
  {
    files: ['apps/renderer/**/*.ts', 'libs/contracts/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'node:*',
            'electron',
            'better-sqlite3',
            '@skein-js/*',
            '@langchain/*',
            '@selvedge/core',
          ],
        },
      ],
    },
  },
  prettier,
];
