// @ts-check
import { unwrapPromise, getWhenablePayload, basicE } from './whenable-utils.js';

/**
 * @param {() => import('./types.js').WhenablePromiseKit<any>} makeWhenablePromiseKit
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const makeWhen = (
  makeWhenablePromiseKit,
  rejectionMeansRetry = () => false,
) => {
  /**
   * @template T
   * @param {import('./types.js').ERef<T | import('./types.js').Whenable<T>>} specimenP
   */
  const when = specimenP => {
    /** @type {import('./types.js').WhenablePromiseKit<T>} */
    const { settler, promise } = makeWhenablePromiseKit();
    // Ensure we have a presence that won't be disconnected later.
    unwrapPromise(specimenP, async (specimen, payload) => {
      // Shorten the whenable chain without a watcher.
      await null;
      /** @type {any} */
      let result = specimen;
      while (payload) {
        result = await basicE(payload.whenableV0)
          .shorten()
          .catch(e => {
            if (rejectionMeansRetry(e)) {
              // Shorten the same specimen to try again.
              return result;
            }
            throw e;
          });
        // Advance to the next whenable.
        const nextPayload = getWhenablePayload(result);
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
