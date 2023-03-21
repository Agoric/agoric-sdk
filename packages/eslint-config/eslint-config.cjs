module.exports = {
  extends: [
    'airbnb-base',
    'plugin:@endo/recommended',
    'plugin:jsdoc/recommended',
    'prettier',
  ],
  rules: {
    'arrow-body-style': 'off',
    'arrow-parens': 'off',
    'no-continue': 'off',
    'implicit-arrow-linebreak': 'off',
    'function-paren-newline': 'off',
    strict: 'off',
    'prefer-destructuring': 'off',
    'no-else-return': 'off',
    'no-console': 'off',
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'no-inner-declarations': 'off',
    'no-loop-func': 'off',
    'no-param-reassign': 'off',
    'no-restricted-syntax': ['off'],
    'no-return-assign': 'off',
    'no-unused-expressions': 'off',
    'prefer-arrow-callback': 'off',

    // Work around https://github.com/import-js/eslint-plugin-import/issues/1810
    'import/no-unresolved': ['error', { ignore: ['ava'] }],
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
          '*test*/**/*.js',
          'demo*/**/*.js',
          'scripts/**/*.js',
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
  ],
};
