import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: ['test/staking/**/*.test.ts'],
  timeout: '300s',
};
