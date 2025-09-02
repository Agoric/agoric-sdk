import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: ['test/staking/**/*.test.ts'],
  // Was timing out at 300s limit
  timeout: '400s',
};
