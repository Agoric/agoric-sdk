import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: ['test/xcs-swap-anything/**/*.test.ts'],
  timeout: '300s',
};
