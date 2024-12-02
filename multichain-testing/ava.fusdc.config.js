import mainConfig from './ava.main.config.js';

export default {
  ...mainConfig,
  files: ['test/fast-usdc/**/*.test.ts'],
};
