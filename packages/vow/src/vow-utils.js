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
  let payload = getVowPayload(specimenP);

  // Take exactly 1 turn to find the first vow, if any.
  const awaited = await (payload ? ALREADY_VOW : specimenP);
  /** @type {unknown} */
  let unwrapped;
  if (awaited === ALREADY_VOW) {
    // The fact that we have a vow payload means it's not actually a
    // promise.
    unwrapped = specimenP;
  } else {
    // Check if the awaited specimen is a vow.
    unwrapped = awaited;
    payload = getVowPayload(unwrapped);
  }

  return cb(/** @type {Awaited<T>} */ (unwrapped), payload);
};
