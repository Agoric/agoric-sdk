import eslintPluginEslintPlugin from 'eslint-plugin-eslint-plugin';

exports.default = [
  {
    plugins: {
      'eslint-plugin': eslintPluginEslintPlugin,
    },
    extends: ['plugin:eslint-plugin/recommended'],
  },
];
