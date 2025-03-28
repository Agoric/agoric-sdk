import mainConfig from './ava.config.js';

export default {
  ...mainConfig,
  files: [
    'test/**/*.test.*',
    '!test/fast-usdc/**/*.test.*',
    '!test/staking/**/*.test.*',
  ],
};
