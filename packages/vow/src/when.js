// @ts-check
import { getVowPayload, basicE } from './vow-utils.js';

/** @import { IsRetryableReason, EUnwrap } from './types.js' */

/**
 * @param {IsRetryableReason} [isRetryableReason]
 */
export const makeWhen = (
  isRetryableReason = /** @type {IsRetryableReason} */ (() => false),
) => {
  /**
   * Shorten `specimenP` until we achieve a final result.
   *
   * @template T
   * @template [TResult1=EUnwrap<T>]
   * @template [TResult2=never]
   * @param {T} specimenP value to unwrap
   * @param {(value: EUnwrap<T>) => TResult1 | PromiseLike<TResult1>} [onFulfilled]
   * @param {(reason: any) => TResult2 | PromiseLike<TResult2>} [onRejected]
   * @returns {Promise<TResult1 | TResult2>}
   */
  const when = async (specimenP, onFulfilled, onRejected) => {
    // Ensure we don't run until a subsequent turn.
    await null;

    // Ensure we have a presence that won't be disconnected later.
    let result = await specimenP;
    let payload = getVowPayload(result);
    let priorRetryValue;
    while (payload) {
      result = await basicE(payload.vowV0)
        .shorten()
        .then(
          res => {
            priorRetryValue = undefined;
            return res;
          },
          e => {
            const nextValue = isRetryableReason(e, priorRetryValue);
            if (nextValue) {
              // Shorten the same specimen to try again.
              priorRetryValue = nextValue;
              return result;
            }
            throw e;
          },
        );
      // Advance to the next vow.
      payload = getVowPayload(result);
    }

    const unwrapped = /** @type {EUnwrap<T>} */ (result);

    // We've extracted the final result.
    if (onFulfilled == null && onRejected == null) {
      return /** @type {TResult1} */ (unwrapped);
    }
    return basicE.resolve(unwrapped).then(onFulfilled, onRejected);
  };
  harden(when);

  return when;
};

harden(makeWhen);

/** @typedef {ReturnType<typeof makeWhen>} When */
