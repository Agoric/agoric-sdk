/** @file YMax deploy-check tests */
import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: ['test/ymax0/**/*.test.ts'],
  timeout: '300s',
};
