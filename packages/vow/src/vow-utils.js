// @ts-check
import { E as basicE } from '@endo/eventual-send';
import { isPassable } from '@endo/pass-style';
import { M, matches } from '@endo/patterns';

/** @import {VowPayload, Vow} from './types' */

export { basicE };

export const VowShape = M.tagged(
  'Vow',
  M.splitRecord({
    vowV0: M.remotable('VowV0'),
  }),
);

export const isVow = specimen =>
  isPassable(specimen) && matches(specimen, VowShape);
harden(isVow);

/**
 * A vow is a passable tagged as 'Vow'.  Its payload is a record with
 * API-versioned remotables.  payload.vowV0 is the API for the `watch` and
 * `when` operators to use for retriable shortening of the vow chain.
 *
 * If the specimen is a Vow, return its payload, otherwise undefined.
 *
 * @template T
 * @param {any} specimen any value to verify as a vow
 * @returns {VowPayload<T> | undefined} undefined if specimen is not a vow, otherwise the vow's payload.
 */
export const getVowPayload = specimen => {
  if (!isVow(specimen)) {
    return undefined;
  }

  const vow = /** @type {Vow<T>} */ (/** @type {unknown} */ (specimen));
  return vow.payload;
};
harden(getVowPayload);
