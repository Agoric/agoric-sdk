// @ts-check
import { E } from '@endo/far';

import { prepareWhenableKit } from './whenable.js';
import { getFirstWhenable } from './whenable-utils.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {() => import('./types.js').WhenableKit<any>} makeWhenableKit
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const prepareWhen = (
  zone,
  makeWhenableKit,
  rejectionMeansRetry = () => false,
) => {
  const makeKit = makeWhenableKit || prepareWhenableKit(zone);

  /**
   * @param {any} specimenP
   */
  const when = specimenP => {
    const { settler, promise } = makeKit();
    // Ensure we have a presence that won't be disconnected later.
    getFirstWhenable(specimenP, async (specimen, whenable0) => {
      // Shorten the whenable chain without a watcher.
      await null;
      while (whenable0) {
        specimen = await E(whenable0)
          .shorten()
          .catch(e => {
            if (rejectionMeansRetry(e)) {
              // Shorten the same specimen to try again.
              return specimen;
            }
            throw e;
          });
        // Advance to the next whenable.
        whenable0 = specimen && specimen.whenable0;
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
