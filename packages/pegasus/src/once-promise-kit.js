// @ts-check
import { assert } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';

/**
 * Should be
 * at-import {DetailsToken} from '@endo/errors'
 * but somehow @endo/errors is not exporting that type.
 * See https://github.com/endojs/endo/issues/2339
 * In the meantime...
 *
 * @typedef {{}} DetailsToken
 */

/**
 * Create a promise kit that will throw an exception if it is resolved or
 * rejected more than once.
 *
 * @param {DetailsToken} reinitDetails
 */
export const makeOncePromiseKit = reinitDetails => {
  const { promise, resolve, reject } = makePromiseKit();

  let resolved = false;
  /**
   * @template {any[]} A
   * @template R
   * @param {(...args: A) => R} fn
   * @returns {(...args: A) => R}
   */
  const onceOnly =
    fn =>
    (...args) => {
      assert(!resolved, reinitDetails);
      resolved = true;
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
