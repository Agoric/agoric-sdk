/* eslint-env node */
const process = require('process');

const lintTypes = !!process.env.AGORIC_ESLINT_TYPES;

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
  plugins: [
    '@jessie.js/eslint-plugin',
    '@typescript-eslint',
    'eslint-plugin-import',
    'eslint-plugin-prettier',
  ],
  extends: ['@agoric'],
  rules: {
    '@typescript-eslint/prefer-ts-expect-error': 'warn',
    '@typescript-eslint/no-floating-promises': lintTypes ? 'warn' : 'off',
    // so that floating-promises can be explicitly permitted with void operator
    'no-void': ['error', { allowAsStatement: true }],
    // Not severe but the default 'warning' clutters output and it's easy to fix
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-syntax': 'error',
    'jsdoc/no-multi-asterisks': 'off',
    'jsdoc/multiline-blocks': 'off',
    // Use these rules to warn about JSDoc type problems, such as after
    // upgrading eslint-plugin-jsdoc.
    // Bump the 1's to 2's to get errors.
    // "jsdoc/valid-types": 1,
    // "jsdoc/no-undefined-types": [1, {"definedTypes": ["never", "unknown"]}],
    'jsdoc/tag-lines': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.config.js',
          '**/*.config.*.js',
          '**/*test*/**/*.js',
          '**/demo*/**/*.js',
          '**/scripts/**/*.js',
        ],
      },
    ],
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
        // TODO upgrade this to 'error'
        '@jessie.js/no-nested-await': 'warn',
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
