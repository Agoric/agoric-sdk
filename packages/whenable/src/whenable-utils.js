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
const PUMPKIN = harden({});

/**
 * @template T
 * @template U
 * @param {T} specimenP
 * @param {(specimen: Awaited<T>, payload: import('./types').Whenable<any>['payload']) => U} cb
 * @returns {Promise<Awaited<U>>}
 */
export const getFirstWhenable = (specimenP, cb) =>
  Promise.resolve().then(async () => {
    let payload = getWhenablePayload(specimenP);

    // Take exactly 1 turn to find the first whenable, if any.
    let specimen = await (payload ? PUMPKIN : specimenP);
    if (specimen === PUMPKIN) {
      specimen = specimenP;
    } else {
      payload = getWhenablePayload(specimen);
    }

    return cb(specimen, payload);
  });
