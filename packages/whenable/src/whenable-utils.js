import { getTag } from '@endo/pass-style';

/**
 * @template T
 * @param {T} specimen
 * @returns {T extends import('./types').Whenable<infer U> ?
 *   import('./types').Whenable<U>['payload'] :
 *   undefined
 * }
 */
export const getWhenablePayload = specimen =>
  typeof specimen === 'object' &&
  specimen !== null &&
  getTag(specimen) === 'Whenable' &&
  specimen.payload;

/** A unique object identity just for internal use. */
const ALREADY_WHENABLE = harden({});

/**
 * @template T
 * @template U
 * @param {T} specimenP
 * @param {(specimen: Awaited<T>, payload: import('./types').Whenable<any>['payload']) => U} cb
 * @returns {Promise<Awaited<U>>}
 */
export const unwrapPromise = async (specimenP, cb) => {
  let payload = getWhenablePayload(specimenP);

  // Take exactly 1 turn to find the first whenable, if any.
  let specimen = await (payload ? ALREADY_WHENABLE : specimenP);
  if (specimen === ALREADY_WHENABLE) {
    // The fact that we have a whenable payload means it's not actually a
    // promise.
    specimen = specimenP;
  } else {
    // Check if the awaited specimen is a whenable.
    payload = getWhenablePayload(specimen);
  }

  return cb(specimen, payload);
};
