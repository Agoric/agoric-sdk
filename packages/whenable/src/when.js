// @ts-check
import { E } from '@endo/far';

import { unwrapPromise, getWhenablePayload } from './whenable-utils.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {() => import('./types.js').WhenablePromiseKit<any>} makeWhenablePromiseKit
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const prepareWhen = (
  zone,
  makeWhenablePromiseKit,
  rejectionMeansRetry = () => false,
) => {
  /**
   * @param {any} specimenP
   */
  const when = specimenP => {
    const { settler, promise } = makeWhenablePromiseKit();
    // Ensure we have a presence that won't be disconnected later.
    unwrapPromise(specimenP, async (specimen, payload) => {
      // Shorten the whenable chain without a watcher.
      await null;
      while (payload) {
        specimen = await E(payload.whenableV0)
          .shorten()
          .catch(e => {
            if (rejectionMeansRetry(e)) {
              // Shorten the same specimen to try again.
              return specimen;
            }
            throw e;
          });
        // Advance to the next whenable.
        const nextPayload = getWhenablePayload(specimen);
        if (!nextPayload) {
          break;
        }
        payload = nextPayload;
      }
      settler.resolve(specimen);
    }).catch(e => settler.reject(e));

    return promise;
  };
  harden(when);

  return when;
};

harden(prepareWhen);

/** @typedef {ReturnType<typeof prepareWhen>} When */
