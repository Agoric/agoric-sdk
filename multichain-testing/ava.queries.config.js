import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: ['test/queries/**/*.test.ts'],
};
