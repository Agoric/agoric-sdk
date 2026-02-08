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
    'packages/*/test/**/*.test.*',
    'services/*/test/**/*.test.*',
    'a3p-integration/proposals/*/test/**/*.test.*',
  ],
  timeout: '10m',
  extensions: {
    js: true,
    ts: 'module',
  },
  require: [initEndo],
  nodeArguments: ['--import=ts-blank-space/register', '--no-warnings'],
};
