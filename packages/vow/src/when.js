// @ts-check
import { unwrapPromise, getVowPayload, basicE } from './vow-utils.js';

/**
 * @param {() => import('./types.js').VowPromiseKit<any>} makeVowPromiseKit
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const makeWhen = (
  makeVowPromiseKit,
  rejectionMeansRetry = () => false,
) => {
  /**
   * @template T
   * @param {import('./types.js').ERef<T | import('./types.js').Vow<T>>} specimenP
   */
  const when = specimenP => {
    /** @type {import('./types.js').VowPromiseKit<T>} */
    const { settler, promise } = makeVowPromiseKit();
    // Ensure we have a presence that won't be disconnected later.
    unwrapPromise(specimenP, async (specimen, payload) => {
      // Shorten the vow chain without a watcher.
      await null;
      /** @type {any} */
      let result = specimen;
      while (payload) {
        result = await basicE(payload.vowV0)
          .shorten()
          .catch(e => {
            if (rejectionMeansRetry(e)) {
              // Shorten the same specimen to try again.
              return result;
            }
            throw e;
          });
        // Advance to the next vow.
        const nextPayload = getVowPayload(result);
        if (!nextPayload) {
          break;
        }
        payload = nextPayload;
      }
      settler.resolve(result);
    }).catch(e => settler.reject(e));

    return promise;
  };
  harden(when);

  return when;
};

harden(makeWhen);

/** @typedef {ReturnType<typeof makeWhen>} When */
