/**
 * Monorepo AVA configuration.
 *
 * Centralized defaults for every workspace package; each package has an
 * `ava.config.js` that spreads this base and applies its own overrides
 * (timeout, workerThreads, etc.).
 *
 * The `files` globs support both invocation styles: running `ava` within a
 * package directory and running from the monorepo root (the basis for a
 * future "test affected" command).
 */
export default {
  files: [
    // When run within a package
    'test/**/*.test.*',
    // When run from the monorepo root
    'packages/*/test/**/*.test.*',
    'services/*/test/**/*.test.*',
  ],
  extensions: ['js', 'ts'],
  nodeArguments: ['--import=ts-blank-space/register', '--no-warnings'],
  // Generous idle timeout for whole-repo runs; packages override with their
  // own stricter values (10s AVA default pinned where none was set).
  timeout: '30m',
};
