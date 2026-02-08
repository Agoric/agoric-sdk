/**
 * Monorepo AVA preloader for Endo lockdown initialization.
 *
 * This file is intended to be loaded once by a centralized AVA config.
 * Default is strict lockdown. Opt-out/relaxation is controlled explicitly by
 * environment variable so tests can declare intent.
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
