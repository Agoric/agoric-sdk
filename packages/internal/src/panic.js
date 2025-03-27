/**
 * First attempt to shim the `panic` we expect to propose as a new standard
 * intrinsic.
 *
 * @param {Error} [err]
 * @returns {never}
 */
export const panic = (err = RangeError('Panic')) => {
  console.error('Panic', err);
  for (;;) {
    // See https://github.com/Agoric/agoric-sdk/issues/8955#issuecomment-2753093949
  }
};
harden(panic);

/**
 * @typedef {typeof panic} Panic
 */
