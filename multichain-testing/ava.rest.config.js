import mainConfig from './ava.config.js';

/**
 * XXX Ensure glob patterns are properly maintained.
 * If this omits a glob tests will be repeated and we won't get an error. If it
 * gets an extra ignore (or a glob is removed somewhere else but not here) the
 * tests simply won't run.
 */
export default {
  ...mainConfig,
  files: [
    'test/**/*.test.*',
    '!test/fast-usdc/**/*.test.*',
    '!test/queries/**/*.test.*',
    '!test/staking/**/*.test.*',
    '!test/xcs-swap-anything/**/*.test.*',
    '!test/ymax0/**/*.test.*',
  ],
};
