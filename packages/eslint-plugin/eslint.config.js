import eslintPluginEslintPlugin from 'eslint-plugin-eslint-plugin';

export default [
  {
    plugins: {
      'eslint-plugin': eslintPluginEslintPlugin,
    },
    extends: ['plugin:eslint-plugin/recommended'],
  },
];
