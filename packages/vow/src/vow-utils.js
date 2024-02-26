// @ts-check
import { E as basicE } from '@endo/eventual-send';
import { getTag, passStyleOf } from '@endo/pass-style';

// TODO: `isPassable` should come from @endo/pass-style
import { isPassable } from '@agoric/base-zone';

export { basicE };

/**
 * A vow is a passable tagged as 'Vow'.  Its payload is a record with
 * API-versioned remotables.  payload.vowV0 is the API for the `watch` and
 * `when` operators to use for retriable shortening of the vow chain.
 *
 * If the specimen is a Vow, return its payload, otherwise undefined.
 *
 * @template T
 * @param {any} specimen any value to verify as a vow
 * @returns {import('./types').VowPayload<T> | undefined} undefined if specimen is not a vow, otherwise the vow's payload.
 */
export const getVowPayload = specimen => {
  const isVow =
    isPassable(specimen) &&
    passStyleOf(specimen) === 'tagged' &&
    getTag(specimen) === 'Vow';
  if (!isVow) {
    return undefined;
  }

  const vow = /** @type {import('./types').Vow<T>} */ (
    /** @type {unknown} */ (specimen)
  );
  return vow.payload;
};
