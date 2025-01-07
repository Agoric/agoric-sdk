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
    'coverage/**',
    '**/output/**',
    'bundles/**',
    'bundle-*',
    'dist/**',
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
      projectService: {
        allowDefaultProject: ['*.js'],
        defaultProject: 'tsconfig.json',
      },
      tsconfigRootDir: __dirname,
      extraFileExtensions: ['.cjs'],
    },
    globals: {
      ...globals.node,
      harden: 'readonly',
      Compartment: 'readonly',
      globalThis: 'readonly',
      assert: 'readonly',
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
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
  },
  rules: {
    ...agoricConfig.rules,
    'no-redeclare': ['error', { builtinGlobals: false }],
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      caughtErrors: 'none',
      vars: 'all',
      args: 'none',
    }],
    '@typescript-eslint/no-unused-vars': 'off',
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
    'no-void': ['error', { allowAsStatement: true }],
    'ava/no-skip-test': 'off',
    'ava/use-test': 'off',
    '@jessie.js/safe-await-separator': 'error',
    'prettier/prettier': 'warn',
    'no-use-before-define': 'off',
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

module.exports = [
  js.configs.recommended,
  baseConfig,
  sourceFilesConfig,
  testFilesConfig,
];