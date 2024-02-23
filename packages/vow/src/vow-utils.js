// @ts-check
import { E as basicE } from '@endo/eventual-send';
import { getTag, passStyleOf } from '@endo/pass-style';

// TODO: `isPassable` should come from @endo/pass-style
import { isPassable } from '@agoric/base-zone';

export { basicE };

/**
 * @template T
 * @param {any} specimen
 * @returns {import('./types').VowPayload<T> | undefined}
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

/** A unique object identity just for internal use. */
const ALREADY_VOW = harden({});

/**
 * @template T
 * @template U
 * @param {T} specimenP
 * @param {(unwrapped: Awaited<T>, payload?: import('./types').VowPayload<any>) => U} cb
 * @returns {Promise<U>}
 */
export const unwrapPromise = async (specimenP, cb) => {
  // Take exactly 1 turn to find the first vow, if any.
  const payload = getVowPayload(specimenP);
  const awaited = await (payload ? ALREADY_VOW : specimenP);

  if (awaited === ALREADY_VOW) {
    return cb(/** @type {Awaited<T>} */ (specimenP), payload);
  }
  // The awaited specimen may be a vow.
  return cb(/** @type {Awaited<T>} */ (awaited), getVowPayload(awaited));
};
