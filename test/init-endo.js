/**
 * Monorepo AVA preloader for Endo lockdown initialization.
 *
 * How this works:
 * - Root `ava.config.js` passes this file using AVA's `require` option.
 * - AVA loads required modules before running tests, which applies Endo setup
 *   without relying on Node's global `--import` process hook.
 * - The mode is selected with `AGORIC_AVA_LOCKDOWN`.
 *
 * Who sets AGORIC_AVA_LOCKDOWN:
 * - Default local/CI runs should not set it (defaults to `strict`).
 * - A developer, CI job, or targeted test command may set it explicitly when
 *   diagnosing compatibility issues (for example `AGORIC_AVA_LOCKDOWN=debug`).
 * - Test modules should not mutate this at runtime; choose mode at invocation.
 *
 * AGORIC_AVA_LOCKDOWN modes:
 * - strict (default): import '@endo/init'
 * - debug: import '@endo/init/debug.js'
 * - legacy: import '@endo/init/legacy.js'
 * - off|false|0: do not initialize Endo lockdown
 */

const mode = (process.env.AGORIC_AVA_LOCKDOWN || 'strict').toLowerCase();

if (mode === 'off' || mode === 'false' || mode === '0') {
  // Explicit opt-out for incompatible tests.
} else if (mode === 'legacy') {
  await import('@endo/init/legacy.js');
} else if (mode === 'debug') {
  await import('@endo/init/debug.js');
} else {
  await import('@endo/init');
}
