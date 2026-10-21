import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/**
 * Run an ES module `script` in a fresh Node.js process, outside of a
 * locked-down (SES) environment, from the package directory (so that it can
 * import the package by name). Rejects if the script throws.
 *
 * Off-chain services (e.g. the attestor or the ymax UI) author EIP-712
 * messages without running under SES, so tests use this to check that the
 * modules they rely on have no runtime dependency on Endo.
 *
 * @param script
 */
export const runWithoutLockdown = async (script: string) =>
  promisify(execFile)(
    process.execPath,
    [
      '--import=ts-blank-space/register',
      '--input-type=module',
      '-e',
      `if (typeof harden !== 'undefined') throw Error('unexpected harden');\n${script}`,
    ],
    { cwd: new URL('..', import.meta.url) },
  );
