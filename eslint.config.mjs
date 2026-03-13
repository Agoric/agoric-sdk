/* eslint-disable no-underscore-dangle, import/no-extraneous-dependencies */
import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { legacySrcToToolsFiles } from './scripts/ci/tools-scope-policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '**/__generated',
      '**/codegen',
      '**/coverage/',
      '**/node_modules/',
      '**/dist/',
      '**/output/',
      '**/build/',
      '**/bundles/',
      '**/bundle-*',
      'examples/',
      'packages/orchestration/src/vendor/',
      'packages/orchestration/src/stubs/',
      'test262/',
      '**/*.html',
      '**/ava*.config.js',
      '**/.ava*.config.js',
      '**/tsup.config.ts',
      '**/vendor/**',
      'yarn.config.cjs',
      'packages/client-utils/scripts/',
      'packages/cosmic-proto/proto/',
      'packages/cosmic-proto/scripts/',
      // Cosmic-swingset specific ignores
      'packages/cosmic-swingset/t[0-9]/',
      'packages/cosmic-swingset/t[0-9].*/',
      // a3p-integration specific ignores
      'a3p-integration/agoric-sdk/',
    ],
  },
  {
    // Include both .js and .ts files for casting package
    files: ['packages/casting/**/*.{js,ts,mjs,cjs}'],
  },
  {
    // Include both .js and .ts files for cache package
    files: ['packages/cache/**/*.{js,ts,mjs,cjs}'],
  },
  ...fixupConfigRules(compat.extends('@agoric', 'plugin:@agoric/recommended')),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
      // TODO get this working by fixing jessie linter that triggers
      //   Unused inline config ('no-bitwise' is already configured to 'error')
      //   Unused inline config ('no-var' is already configured to 'error')
      // reportUnusedInlineConfigs: 'error',
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        useProjectService: true,

        projectService: {
          allowDefaultProject: ['*.js'],
          defaultProject: 'tsconfig.json',
        },

        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.cjs', '.mjs'],
      },
    },

    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unnecessary-type-constraint': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': false,
          'ts-nocheck': false,
        },
      ],

      '@typescript-eslint/no-floating-promises': 'error',

      'no-void': [
        'error',
        {
          allowAsStatement: true,
        },
      ],

      '@jessie.js/safe-await-separator': 'error',

      'no-use-before-define': 'off',
      'no-empty-function': 'off',
      'no-nested-ternary': 'off',
      'no-console': 'off',
      'import/no-default-export': 'off',
      'no-undefined': 'off',
      'import/no-relative-parent-imports': 'off',
      'no-unused-expressions': 'off',
      'unicorn/no-unnecessary-await': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'no-param-reassign': 'off',
      'import/no-unassigned-import': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/no-anonymous-default-export': 'off',
      'unicorn/prefer-number-properties': 'off',
      'no-unused-vars': 'off',
      'node/no-process-env': 'off',
      'no-eq-null': 'off',
      complexity: 'off',
      'unicorn/no-process-exit': 'off',
      'no-bitwise': 'off',
      'import/unambiguous': 'off',
      'import/no-commonjs': 'off',
      'no-shadow': 'off',
      'unicorn/require-module-specifiers': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-set-has': 'off',
      'preserve-caught-error': 'off',
      'unicorn/no-useless-spread': 'off',
      'unicorn/no-array-reverse': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/no-single-promise-in-promise-methods': 'off',
      'import/named': 'off',
      'no-plusplus': 'off',
      'unicorn/no-empty-file': 'off',
      'no-unmodified-loop-condition': 'off',
      'unicorn/prefer-array-flat-map': 'off',
      'import/no-named-as-default-member': 'off',
      'unicorn/no-await-in-promise-methods': 'off',
      'unicorn/no-abusive-eslint-disable': 'off',
      'no-unreachable': 'off',
      'unicorn/no-new-array': 'off',
      'no-useless-escape': 'off',
      'import/no-cycle': 'off',
      'unicorn/prefer-string-starts-ends-with': 'off',
      'import/no-named-as-default': 'off',
      'no-unassigned-vars': 'off',
      'unicorn/no-useless-fallback-in-spread': 'off',
      'unicorn/no-thenable': 'off',
      'unicorn/no-instanceof-builtins': 'off',
      'no-var': 'off',
      'no-unexpected-multiline': 'off',
      'unicorn/prefer-array-find': 'off',
      'unicorn/prefer-add-event-listener': 'off',
      'unicorn/no-useless-length-check': 'off',
      'import/default': 'off',
      'no-control-regex': 'off',
      'no-constant-condition': 'off',
      'default-case': 'off',
      'no-await-in-loop': 'off',
      'no-dupe-keys': 'off',
    },
  },
  {
    files: ['packages/**/*.{js,ts,mjs,cjs}'],
    ignores: ['packages/*/test/**', 'packages/wallet/api/test/**'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '**/test/**',
            '@agoric/*/test/**',
            '@aglocal/*/test/**',
            '../test/**',
            './test/**',
          ],
        },
      ],
    },
  },
  {
    files: [
      'packages/*/src/**/*.{js,ts,mjs,cjs}',
      'packages/wallet/api/src/**/*.{js,ts,mjs,cjs}',
    ],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '**/tools/**',
            '@agoric/*/tools/**',
            '@aglocal/*/tools/**',
            '../tools/**',
            './tools/**',
            '**/test/**',
            '@agoric/*/test/**',
            '@aglocal/*/test/**',
            '../test/**',
            './test/**',
          ],
        },
      ],
    },
  },
  {
    files: legacySrcToToolsFiles,

    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: [
      'packages/**/demo/**/*.js',
      'packages/*/test/**/*.*s',
      'packages/*/test/**/*.test.*s',
      'packages/wallet/api/test/**/*.js',
    ],

    rules: {
      'no-lone-blocks': 'off',
      '@jessie.js/safe-await-separator': 'off',
    },
  },
  {
    files: ['packages/boot/test/**/*.test.*s'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@endo/eventual-send', '@endo/far'],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],

    rules: {
      // TypeScript's `tsc --noEmit` catches undefined names with project-aware
      // analysis, so keep the base ESLint rule disabled to avoid duplicate noise.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.d.ts'],

    rules: {
      'no-redeclare': 'off',
    },
  },
  {
    files: ['**/*.test-d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  ...compat
    .extends('plugin:@typescript-eslint/disable-type-checked')
    .map(config => ({
      ...config,
      files: [
        '**/exported.*',
        '**/types-index.*',
        '**/types-ambient.*',
        '**/types.*',
      ],
    })),
  {
    files: ['**/*.html'],

    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        project: false,
      },
    },
  },
  ...compat
    .extends('plugin:@typescript-eslint/disable-type-checked')
    .map(config => ({
      ...config,
      files: ['a3p-integration/**'],
    })),
  {
    files: ['a3p-integration/**'],

    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        useProjectService: false,
        project: false,
      },
    },

    rules: {
      '@jessie.js/safe-await-separator': 'off',
    },
  },
  {
    files: ['**/types*.js'],

    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
