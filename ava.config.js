/**
 * Monorepo AVA configuration.
 *
 * Centralized defaults:
 * - strict Endo lockdown preloader (see test/init-endo.js)
 * - TypeScript support via ts-blank-space
 * - conservative default timeout; slow tests should use explicit per-test timeout
 */
const initEndo = new URL('./test/init-endo.js', import.meta.url).pathname;

export default {
  files: [
    'test/**/*.test.*',
    'test/**/*.test-noendo.*',
    'packages/*/test/**/*.test.*',
    'packages/*/test/**/*.test-noendo.*',
    'services/*/test/**/*.test.*',
    'services/*/test/**/*.test-noendo.*',
    'a3p-integration/proposals/*/test/**/*.test.*',
    'a3p-integration/proposals/*/test/**/*.test-noendo.*',
  ],
  timeout: '10m',
  extensions: {
    js: true,
    ts: 'module',
  },
  // Endo preload depends on AVA worker metadata; keep this enabled so
  // `test/init-endo.js` can determine the test file reliably.
  require: [initEndo],
  nodeArguments: ['--import=ts-blank-space/register', '--no-warnings'],
};
