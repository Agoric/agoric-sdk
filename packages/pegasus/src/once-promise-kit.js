import { assert } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';

/**
 * Create a promise kit that will throw an exception if it is resolved or
 * rejected more than once.
 *
 * @param {() => Details} makeReinitDetails
 */
export const makeOncePromiseKit = makeReinitDetails => {
  const { promise, resolve, reject } = makePromiseKit();

  let initialized = false;
  /**
   * @template {any[]} A
   * @template R
   * @param {(...args: A) => R} fn
   * @returns {(...args: A) => R}
   */
  const onceOnly = fn => (...args) => {
    assert(!initialized, makeReinitDetails());
    initialized = true;
    return fn(...args);
  };

  /** @type {PromiseRecord<any>} */
  const oncePK = harden({
    promise,
    resolve: onceOnly(resolve),
    reject: onceOnly(reject),
  });
  return oncePK;
};
