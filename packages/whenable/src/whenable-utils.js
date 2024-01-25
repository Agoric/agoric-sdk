// @ts-check
import { getTag } from '@endo/pass-style';

/**
 * @template T
 * @param {any} specimen
 * @returns {import('./types').WhenablePayload<T> | undefined}
 */
export const getWhenablePayload = specimen => {
  const isWhenable =
    typeof specimen === 'object' &&
    specimen !== null &&
    getTag(specimen) === 'Whenable';
  if (!isWhenable) {
    return undefined;
  }

  const whenable = /** @type {import('./types').Whenable<T>} */ (
    /** @type {unknown} */ (specimen)
  );
  return whenable.payload;
};

/** A unique object identity just for internal use. */
const ALREADY_WHENABLE = harden({});

/**
 * @template T
 * @template U
 * @param {T} specimenP
 * @param {(unwrapped: Awaited<T>, payload?: import('./types').WhenablePayload<any>) => U} cb
 * @returns {Promise<U>}
 */
export const unwrapPromise = async (specimenP, cb) => {
  let payload = getWhenablePayload(specimenP);

  // Take exactly 1 turn to find the first whenable, if any.
  const awaited = await (payload ? ALREADY_WHENABLE : specimenP);
  /** @type {unknown} */
  let unwrapped;
  if (awaited === ALREADY_WHENABLE) {
    // The fact that we have a whenable payload means it's not actually a
    // promise.
    unwrapped = specimenP;
  } else {
    // Check if the awaited specimen is a whenable.
    unwrapped = awaited;
    payload = getWhenablePayload(unwrapped);
  }

  return cb(/** @type {Awaited<T>} */(unwrapped), payload);
};
