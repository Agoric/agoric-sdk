// @ts-check
import { getVowPayload, basicE } from './vow-utils.js';

/**
 * @param {(reason: any) => boolean} [isRetryableReason]
 */
export const makeWhen = (isRetryableReason = () => false) => {
  /**
   * Shorten any vows in `specimenP` until we achieve a final result.
   *
   * @template T
   * @param {import('./types.js').ERef<T | import('./types.js').Vow<T>>} specimenP
   */
  const when = async specimenP => {
    // Ensure we don't run until a subsequent turn.
    await null;

    // Ensure we have a presence that won't be disconnected later.
    let result = await specimenP;
    let payload = getVowPayload(result);
    while (payload) {
      result = await basicE(payload.vowV0)
        .shorten()
        .catch(e => {
          if (isRetryableReason(e)) {
            // Shorten the same specimen to try again.
            return result;
          }
          throw e;
        });
      // Advance to the next vow.
      payload = getVowPayload(result);
    }

    // We've extracted the final result.
    return /** @type {Awaited<T>} */ (result);
  };
  harden(when);

  return when;
};

harden(makeWhen);

/** @typedef {ReturnType<typeof makeWhen>} When */
