/**
 * Monorepo AVA configuration.
 *
 * Centralized defaults:
 * - TypeScript support via ts-blank-space
 * - conservative default timeout; slow tests should use explicit per-test timeout
 */

export default {
  files: [
    // When run within a package
    'test/**/*.test.*',
    // When run from the monorepo root
    'packages/*/test/**/*.test.*',
    'services/*/test/**/*.test.*',
  ],
  // The default timeout is 10s; slower tests should use t.timeout() to extend it.
  // https://github.com/avajs/ava/blob/main/docs/07-test-timeouts.md
  extensions: {
    js: true,
    ts: 'module',
  },
  nodeArguments: ['--import=ts-blank-space/register', '--no-warnings'],
};
