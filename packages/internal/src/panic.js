/* global process globalThis */

import { Fail } from '@endo/errors';

export const PanicEndowmentSymbol = Symbol.for('@endo panic');

/**
 * First attempt to shim the `panic` we expect to propose as a new standard
 * intrinsic.
 *
 * @param {Error} [err]
 * @returns {never}
 */
export const panic = (err = RangeError('Panic')) => {
  console.error('Panic', err);
  if (typeof process?.exit === 'function') {
    process.exit(process.exitCode || 112);
  }
  if (typeof globalThis[PanicEndowmentSymbol] === 'function') {
    /** @type {never} */ (globalThis[PanicEndowmentSymbol](err));
  }
  for (;;); // What else can we do?
};
harden(panic);

/**
 * @typedef {typeof panic} Panic
 */

/**
 * @param {Panic} endowedPanic
 */
export const endowBackupPanic = endowedPanic => {
  const oldEndowedPanic = globalThis[PanicEndowmentSymbol];
  if (typeof oldEndowedPanic === 'function') {
    if (oldEndowedPanic === endowedPanic) {
      return;
    }
    throw Fail`Endowed backup panic already set to ${oldEndowedPanic}: ${endowedPanic}`;
  }
  globalThis[PanicEndowmentSymbol] = endowedPanic;
};
harden(endowBackupPanic);
