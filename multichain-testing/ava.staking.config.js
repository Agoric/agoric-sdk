import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: ['test/staking/**/*.test.ts'],
};
