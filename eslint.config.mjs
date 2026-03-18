/* eslint-disable no-underscore-dangle */
import { fixupConfigRules } from '@eslint/compat';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

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
      '**/*.d.ts',
      '**/*.test-d.ts',
      // Has its own eslint config
      'multichain-testing/',
      // XXX outside the project service
      'packages/eslint-config',
      'packages/eslint-plugin',
      'services/ymax-planner/esbuild.config.mjs',
      '.github',
      '.yarn',
      '**/__generated',
      '**/codegen',
      '**/coverage/',
      '**/node_modules/',
      '**/dist/',
      '**/output/',
      '**/build/',
      '**/bundles/',
      '**/bundle-*',
      '**/demo/',
      'examples/',
      'packages/orchestration/src/vendor/',
      'packages/orchestration/src/stubs/',
      '**/*.html',
      '**/ava*.config.js',
      '**/.ava*.config.js',
      '**/tsup.config.ts',
      '**/scripts/**',
      '**/vendor/**',
      'yarn.config.cjs',
      'packages/client-utils/scripts/',
      'packages/cosmic-proto/proto/',
      'packages/cosmic-proto/scripts/',
      'packages/xsnap/moddable/',
      'packages/xsnap/xsnap-native/',
      // Cosmic-swingset specific ignores
      'packages/cosmic-swingset/t[0-9]/',
      'packages/cosmic-swingset/t[0-9].*/',
      // a3p-integration specific ignores
      'a3p-integration/agoric-sdk/',
      'a3p-integration/proposals/*/local-packages/',
      'golang/',
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
    },

    rules: {
      'no-void': [
        'error',
        {
          allowAsStatement: true,
        },
      ],

      'ava/no-skip-test': 'off',
      'ava/use-test': 'off',

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
    files: [
      'packages/**/demo/**/*.js',
      'packages/*/test/**/*.*s',
      'packages/*/test/**/*.test.*s',
      'packages/wallet/api/test/**/*.js',
    ],

    rules: {
      'no-lone-blocks': 'off',
    },
  },
  {
    files: ['**/*.ts'],

    rules: {
      // TypeScript's `tsc --noEmit` catches undefined names with project-aware
      // analysis, so keep the base ESLint rule disabled to avoid duplicate noise.
      'no-undef': 'off',
    },
  },
  {
    files: ['a3p-integration/**'],

    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
    },
  },
];
