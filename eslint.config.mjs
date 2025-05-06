import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'module';

// Workaround for https://github.com/anza-xyz/eslint-plugin-require-extensions/issues/18
const require = createRequire(import.meta.url);
const requireExtensions = require('eslint-plugin-require-extensions');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const deprecatedForLoanContract = [
  ['currency', 'brand, asset or another descriptor'],
  ['blacklist', 'denylist'],
  ['whitelist', 'allowlist'],
  ['RUN', 'IST', '/RUN/'],
];

const allDeprecated = [...deprecatedForLoanContract, ['loan', 'debt']];

const deprecatedTerminology = Object.fromEntries(
  Object.entries({
    all: allDeprecated,
    loanContract: deprecatedForLoanContract,
  }).map(([category, deprecated]) => [
    category,
    deprecated.flatMap(([bad, good, badRgx = `/${bad}/i`]) =>
      [
        ['Literal', 'value'],
        ['TemplateElement', 'value.raw'],
        ['Identifier', 'name'],
      ].map(([selectorType, field]) => ({
        selector: `${selectorType}[${field}=${badRgx}]`,
        message: `Use '${good}' instead of deprecated '${bad}'`,
      })),
    ),
  ]),
);

export default [
  {
    ignores: [
      '**/coverage/',
      '**/node_modules/',
      '**/dist/',
      '**/output/',
      '**/build/',
      '**/bundles/',
      '**/bundle-*',
      'examples/',
      'test262/',
      '**/*.html',
      '**/ava*.config.js',
      '**/.ava*.config.js',
      'packages/cosmic-proto/proto/',
      'packages/cosmic-proto/src/codegen/',
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
  ...fixupConfigRules(
    compat.extends(
      '@agoric',
      'plugin:ava/recommended',
      'plugin:require-extensions/recommended',
    ),
  ),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier,
      'require-extensions': fixupPluginRules(requireExtensions),
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

    settings: {
      jsdoc: {
        mode: 'typescript',
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

      'ava/no-skip-test': 'off',
      'ava/use-test': 'off',
      '@jessie.js/safe-await-separator': 'error',

      'jsdoc/check-tag-names': [
        'error',
        {
          definedTags: [
            'alpha',
            'beta',
            'category',
            'categoryDescription',
            'defaultValue',
            'document',
            'group',
            'groupDescription',
            'internal',
            'privateRemarks',
            'remarks',
          ],
        },
      ],

      'prettier/prettier': 'warn',
      'no-use-before-define': 'off',
    },
  },
  {
    // Tighten rules for exported code.
    files: [
      'packages/*/src/**/*.js',
      'packages/*/tools/**/*.js',
      'packages/*/tools/**/*.mjs',
      'packages/*/*.js',
      'packages/wallet/api/src/**/*.js',
    ],

    rules: {
      'no-restricted-syntax': ['error', ...deprecatedTerminology.all],
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

      'no-restricted-properties': [
        'error',
        {
          object: 'test',
          property: 'only',
          message:
            'Do not commit .only tests - they prevent other tests from running',
        },
      ],
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
    files: ['packages/*/src/exos/**'],

    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Exclusions are for handlers that return prompt promises
          selector:
            'FunctionExpression[async=true]:not(Property[key.name=/^(connectionHandler|tap)$/] > ObjectExpression > Property[key.name=/^(onOpen|onClose|receiveUpcall)$/] > FunctionExpression[async=true])',
          message: 'Non-immediate functions must return vows, not promises',
        },
        {
          selector: 'ArrowFunctionExpression[async=true]',
          message:
            'Non-immediate arrow functions must return vows, not promises',
        },
        {
          selector: "Identifier[name='callWhen']",
          message:
            'callWhen wraps the function in a promise; instead immediately return a vow',
        },
        {
          selector: "Identifier[name='heapVowE']",
          message:
            'heapVowE shortens vows to promises; instead use `E` from `@endo/far` with `watch` from durable vowTools',
        },
        {
          selector: "Identifier[name='heapVowTools']",
          message:
            'heapVowTools are not durable; instead use `prepareVowTools` with a durable zone',
        },
      ],
    },
  },
  {
    // Allow "loan" contracts to mention the word "loan".
    files: ['packages/zoe/src/contracts/loan/*.js'],

    rules: {
      'no-restricted-syntax': ['error', ...deprecatedTerminology.loanContract],
    },
  },
  {
    files: ['**/*.ts'],

    rules: {
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-type': 'off',
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
