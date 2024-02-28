// @ts-check
import { unwrapPromise, getVowPayload, basicE } from './vow-utils.js';

/**
 * @param {() => import('./types.js').VowKit<any>} makeVowKit
 * @param {(resolver: import('./types').VowResolver) => Promise<any>} providePromiseForVowResolver
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const makeWhen = (
  makeVowKit,
  providePromiseForVowResolver,
  rejectionMeansRetry = () => false,
) => {
  /**
   * @template T
   * @param {import('./types.js').ERef<T | import('./types.js').Vow<T>>} specimenP
   */
  const when = specimenP => {
    /** @type {import('./types.js').VowKit<T>} */
    const { resolver } = makeVowKit();
    const promise = providePromiseForVowResolver(resolver);
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
      resolver.resolve(result);
    }).catch(e => resolver.reject(e));

    return promise;
  };
  harden(when);

  return when;
};

harden(makeWhen);

/** @typedef {ReturnType<typeof makeWhen>} When */
