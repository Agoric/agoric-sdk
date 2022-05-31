/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@jessie.js/eslint-plugin',
    '@typescript-eslint',
    'eslint-plugin-import',
    'eslint-plugin-prettier',
  ],
  extends: ['@agoric'],
  rules: {
    '@typescript-eslint/prefer-ts-expect-error': 'warn',
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
    'ava*.config.js',
  ],
};
