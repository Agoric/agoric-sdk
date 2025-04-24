/* global process globalThis */

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
  if (typeof globalThis[PanicEndowmentSymbol] === 'function') {
    /** @type {never} */ (globalThis[PanicEndowmentSymbol](err));
  } else if (typeof process?.exit === 'function') {
    process.exit(process.exitCode || 112);
  }
  for (;;); // What else can we do?
  // According to the JavaScript spec, it is indeed impossible for execution
  // to proceed within this so-called "agent" (vat, thread, worker) after
  // this infinite loop.
  // However, we know that some engines/hosts, such as some browsers,
  // violate the spec and somehow resume execution within the same agent.
  // TODO find out the behavior of those violations, and somehow poison
  // continued execution of this agent to minimize the danger it might do
  // damage by further computing using corrupted data.
};
harden(panic);

/**
 * @typedef {typeof panic} Panic
 */
