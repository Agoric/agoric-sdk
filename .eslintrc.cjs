/* eslint-disable no-restricted-syntax */
/* eslint-env node */
const process = require('process');

const lintTypes = !!process.env.AGORIC_ESLINT_TYPES;

const loanContractDeprecated = [
  ['currency', 'brand, asset or another descriptor'],
  ['blacklist', 'denylist'],
  ['whitelist', 'allowlist'],
  ['RUN', 'IST', '/RUN/'],
];
const allDeprecated = [...loanContractDeprecated, ['loan', 'debt']];

const deprecatedTerminology = Object.fromEntries(
  Object.entries({
    all: allDeprecated,
    loanContract: loanContractDeprecated,
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

    // The rule is “safe await separator" which implements the architectural
    // goal of “clearly separate an async function's synchronous prelude from
    // the part that runs in a future turn”. That is our architectural rule. It
    // can be trivially satisfied by inserting a non-nested `await null` in an
    // appropriate place to ensure the rest of the async function runs in a
    // future turn.  “sometimes synchronous" is a bug farm for particularly
    // pernicious bugs in which you can combine two correct pieces of code to
    // have emergent incorrect behavior.  It’s absolutely critical for shared
    // service code. That means contracts, but it also means kernel components
    // that are used by multiple clients. So we enable it throughout the repo
    // and aim for no exceptions.
    //
    // TODO the default is 'warn', but upgrade this to 'error' when possible
    // '@jessie.js/safe-await-separator': 'error',

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
      files: [
        'packages/*/src/**/*.js',
        'packages/*/tools/**/*.js',
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
        'packages/*/test/**/*.js',
        'packages/wallet/api/test/**/*.js',
      ],
      rules: {
        // NOTE: This rule is enabled for the repository in general.  We turn it
        // off for test code for now.
        '@jessie.js/safe-await-separator': 'off',
      },
    },
    {
      // Allow "loan" contracts to mention the word "loan".
      files: ['packages/zoe/src/contracts/loan/*.js'],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...deprecatedTerminology.loanContract,
        ],
      },
    },
    {
      files: ['*.ts'],
      rules: {
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
  ],
};
