/* eslint-env node */
const tseslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const prettierPlugin = require('eslint-plugin-prettier');
const requireExtensionsPlugin = require('eslint-plugin-require-extensions');
const agoricConfig = require('@agoric/eslint-config');
const githubPlugin = require('eslint-plugin-github');
const jsdocPlugin = require('eslint-plugin-jsdoc');
const avaPlugin = require('eslint-plugin-ava');
const importPlugin = require('eslint-plugin-import');
const jessiePlugin = require('@jessie.js/eslint-plugin');
const js = require('@eslint/js');
const globals = require('globals');

// Keep existing deprecated terminology configuration
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

const resumable = [
  {
    selector:
      'FunctionExpression[async=true]:not(Property[key.name="connectionHandler"] > ObjectExpression > Property[key.name=/^(onOpen|onClose)$/] > FunctionExpression[async=true])',
    message: 'Non-immediate functions must return vows, not promises',
  },
  {
    selector: 'ArrowFunctionExpression[async=true]',
    message: 'Non-immediate functions must return vows, not promises',
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
];

const baseConfig = {
  files: ['**/*.{js,ts,cjs,mjs}'],
  ignores: [
    // General ignores
    '**/node_modules/**',
    '**/coverage/**',
    '**/dist/**',
    '**/output/**',
    '**/proto/**',
    '**/src/codegen/**',
    '**/codegen/**',
    'bundles/**',
    'bundle-*',
    'examples/**',
    'test262/**',
    '*.html',
    'ava*.config.js',
  ],
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      useProjectService: true,
      sourceType: 'module',
      project: ['./tsconfig.json', './packages/*/tsconfig.json'],
      tsconfigRootDir: __dirname,
      ecmaVersion: 2022,
      ecmaFeatures: {
        jsx: false,
      },
    },
    globals: {
      ...globals.es2021,
      ...globals.node,
      harden: 'readonly',
      assert: 'readonly',
      WeakRef: 'readonly',
      FinalizationRegistry: 'readonly',
      globalThis: 'readonly',
    },
  },
  plugins: {
    '@typescript-eslint': tseslint,
    'prettier': prettierPlugin,
    'require-extensions': requireExtensionsPlugin,
    'ava': avaPlugin,
    'github': githubPlugin,
    'jsdoc': jsdocPlugin,
    'import': importPlugin,
    '@jessie.js': jessiePlugin,
  },
  rules: {
    'no-redeclare': ['error', { builtinGlobals: false }],
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_|^e$',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      args: 'none',
    }],
    'import/order': ['warn', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'ignore',
      'alphabetize': {
        'order': 'asc',
        'caseInsensitive': true
      }
    }],
    // Disable eslint-disable directive warnings
    'eslint-comments/no-unused-disable': 'off',
    // Allow empty lines between import groups
    'import/newline-after-import': 'off',
    // More lenient import rules
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': 'off',
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_|^e$',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      args: 'none',
    }],
  },
};

const sourceFilesConfig = {
  files: [
    'packages/*/src/**/*.js',
    'packages/*/tools/**/*.js',
    'packages/*/*.js',
    'packages/wallet/api/src/**/*.js',
  ],
  rules: {
    'no-restricted-syntax': ['error', ...deprecatedTerminology.all],
  },
};

const testFilesConfig = {
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
};

// Package-specific configurations
const swingsetXsnapSupervisorConfig = {
  files: ['packages/swingset-xsnap-supervisor/**/*.js'],
  rules: {
    'import/no-extraneous-dependencies': 'off',
  },
};

// TypeScript specific configuration
const typescriptConfig = {
  files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      useProjectService: true,
      project: ['./tsconfig.json', './packages/*/tsconfig.json'],
      tsconfigRootDir: __dirname,
      sourceType: 'module',
      ecmaVersion: 2022,
    },
  },
  plugins: {
    '@typescript-eslint': tseslint,
  },
  rules: {
    ...tseslint.configs.recommended.rules,
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
  },
};

module.exports = [
  js.configs.recommended,
  baseConfig,
  sourceFilesConfig,
  testFilesConfig,
  swingsetXsnapSupervisorConfig,
  typescriptConfig,
];