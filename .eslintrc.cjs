/* eslint-disable no-restricted-syntax */
/* eslint-env node */
const process = require('process');

const lintTypes = !!process.env.AGORIC_ESLINT_TYPES;

const notLoanDeprecated = [
  ['currency', 'brand, asset or another descriptor'],
  ['blacklist', 'denylist'],
  ['whitelist', 'allowlist'],
  ['RUN', 'IST', '/RUN/'],
];
const allDeprecated = [...notLoanDeprecated, ['loan', 'debt']];

const deprecatedTerminology = Object.fromEntries(
  Object.entries({
    all: allDeprecated,
    notLoan: notLoanDeprecated,
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

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: lintTypes
    ? {
        sourceType: 'module',
        project: [
          './packages/*/jsconfig.json',
          './packages/*/tsconfig.json',
          './packages/wallet/*/jsconfig.json',
          './tsconfig.json',
        ],
        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.cjs'],
      }
    : undefined,
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['@agoric'],
  rules: {
    '@typescript-eslint/prefer-ts-expect-error': 'warn',
    '@typescript-eslint/no-floating-promises': lintTypes ? 'warn' : 'off',
    // so that floating-promises can be explicitly permitted with void operator
    'no-void': ['error', { allowAsStatement: true }],

    // CI has a separate format check but keep this warn to maintain that "eslint --fix" prettifies
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/4339
    'prettier/prettier': 'warn',
  },
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
  },
  ignorePatterns: [
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
  overrides: [
    {
      // Tighten rules for exported code.
      files: ['packages/*/src/**/*.js'],
      rules: {
        // The rule is “no nested awaits” but the architectural goal is
        // “no possibility of ‘awaits sometimes but not always’”. That is our
        // architectural rule. If it’s too constraining you have to fall back to
        // promise.then or get a reviewed exception.  “sometimes awaits” is a
        // bug farm for particularly pernicious bugs in which you can combine
        // two correct pieces of code to have emergent incorrect behavior.
        // It’s absolutely critical for shared service code. That means
        // contracts, but it also means kernel components that are used by
        // multiple clients. So we enable it throughout the repo and exceptions
        // are code-reviewed.
        '@jessie.js/no-nested-await': 'off', // remove after endojs/Jessie#107
        // TODO(https://github.com/endojs/Jessie/issues/107): use the following
        // instead, and upgrade to 'error' when possible
        // '@jessie.js/safe-await-separator': 'warn',
        // TODO upgrade this (or a subset) to 'error'
        'no-restricted-syntax': ['warn', ...deprecatedTerminology.all],
      },
    },
    {
      // Allow "loan" contracts to mention the word "loan".
      files: ['packages/zoe/src/contracts/loan/*.js'],
      rules: {
        'no-restricted-syntax': ['warn', ...deprecatedTerminology.notLoan],
      },
    },
    {
      files: ['*.ts'],
      rules: {
        'jsdoc/require-param-type': 'off',
        // TS has this covered and eslint gets it wrong
        'no-undef': 'off',
      },
    },
    {
      // disable type-aware linting in HTML
      files: ['*.html'],
      parserOptions: {
        project: false,
      },
    },
    {
      files: ['packages/**/upgrade-test-scripts/**/*.*js'],
      rules: {
        // NOTE: This rule is enabled for the repository in general.  We turn it
        // off for test code for now.
        '@jessie.js/safe-await-separator': 'off',
      },
    },
  ],
};
