import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: ['test/fast-usdc/**/*.test.ts'],
};
