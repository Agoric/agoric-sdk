/* eslint-env node */

const orchestrationFlowRestrictions = [
  {
    selector: "Identifier[name='heapVowE']",
    message: 'Eventual send is not yet supported within an orchestration flow',
  },
  {
    selector: "Identifier[name='E']",
    message: 'Eventual send is not yet supported within an orchestration flow',
  },
];

module.exports = {
  extends: [
    'airbnb-base',
    'plugin:@endo/recommended',
    'plugin:jsdoc/recommended',
    'prettier',
  ],
  plugins: ['import', 'github'],
  rules: {
    'arrow-body-style': 'off',
    'arrow-parens': 'off',
    'no-continue': 'off',
    'no-await-in-loop': 'off',
    'implicit-arrow-linebreak': 'off',
    'function-paren-newline': 'off',
    strict: 'off',
    'prefer-destructuring': 'off',
    'prefer-regex-literals': 'off',
    'no-else-return': 'off',
    'no-console': 'off',
    'no-lone-blocks': 'off',
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none', // Needed now that in ESLint v9.0.0, varsIgnorePattern no longer applies to errors in catch clauses
      },
    ],
    'no-inner-declarations': 'off',
    'no-loop-func': 'off',
    'no-param-reassign': 'off',
    'no-promise-executor-return': 'off', // common to return setTimeout(), we know the value won't be accessible
    'no-restricted-syntax': ['off'],
    'no-return-assign': 'off',
    'no-unused-expressions': 'off',
    'prefer-arrow-callback': 'off',
    'default-param-last': 'off', // unaware of TS type annotations
    'consistent-return': 'off', // unaware of throws. TS detects more reliably.
    'no-fallthrough': 'warn', // unaware of throws.
    'no-redeclare': ['error', { builtinGlobals: false }], // Allow redeclaration of built-in globals when explicitly declared
    'spaced-comment': [
      'error',
      'always',
      {
        line: {
          // 'region' for code folding and '/' for TS '///' directive
          markers: ['#region', '#endregion', 'region', 'endregion', '/'],
        },
      },
    ],

    'github/array-foreach': 'warn',

    // it doesn't support exports maps https://github.com/import-js/eslint-plugin-import/issues/1810
    // and most of our code is covered by tsc which does
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',

    'jsdoc/no-multi-asterisks': ['warn', { allowWhitespace: true }],
    'jsdoc/no-undefined-types': 'off',
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-property-description': 'off',
    'jsdoc/require-param-description': 'off',
    'jsdoc/require-returns': 'off',
    'jsdoc/require-returns-check': 'off', // TS checks
    'jsdoc/require-returns-description': 'off',
    'jsdoc/require-yields': 'off',
    'jsdoc/tag-lines': 'off',
    'jsdoc/valid-types': 'off',
    // Not severe but the default 'warning' clutters output and it's easy to fix
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-syntax': 'error',

    'import/extensions': ['warn', 'ignorePackages'],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.config.js',
          '**/*.config.*.js',
          // leading wildcard to work in CLI (package path) and IDE (repo path)
          '**/test/**',
          '**/demo*/**',
          '**/scripts/**',
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        // Handled better by tsc
        'import/no-unresolved': 'off',
        'no-unused-vars': 'off',
      },
    },
    {
      // Zoe contract module
      files: ['**/*.contract.js'],
      rules: {
        '@endo/harden-exports': 'error',
      },
    },
    {
      // Orchestration flows
      files: ['**/*.flows.js'],
      rules: {
        'no-restricted-syntax': ['error', ...orchestrationFlowRestrictions],
        '@endo/harden-exports': 'error',
      },
    },
  ],
};
