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

const { fileURLToPath, pathToFileURL } = await import('node:url');
const { dirname, resolve } = await import('node:path');
// Resolve AVA entrypoint, then locate the internal options module by path.
const avaEntryUrl = await import.meta.resolve('ava');
const avaEntryPath = fileURLToPath(avaEntryUrl);
const avaRoot = resolve(dirname(avaEntryPath), '..');
const optionsPath = resolve(avaRoot, 'lib', 'worker', 'options.cjs');
const { get } = await import(pathToFileURL(optionsPath));
const testFile = get().file;
if (!testFile) {
  throw new Error(
    'AVA worker options did not provide a test file path. ' +
      'Unable to select Endo lockdown mode safely.',
  );
}

const isNoEndoTest = testFile.includes('.test-noendo.');

// No global coordination: each AVA worker handles one test file.

if (isNoEndoTest) {
  // Tests marked with `.test-noendo.` handle Endo lockdown themselves.
} else if (mode === 'off' || mode === 'false' || mode === '0') {
  // Explicit opt-out for incompatible tests.
} else if (mode === 'legacy') {
  await import('@endo/init/legacy.js');
} else {
  await import('@endo/init/debug.js');
}
