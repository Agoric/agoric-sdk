const { freeze } = Object;

/**
 * @typedef {object} IntervalIO
 * @property {typeof setTimeout} setTimeout
 * @property {typeof clearTimeout} clearTimeout
 * @property {typeof Date.now} now
 */

/**
 * Creates an async iterable that emits values at specified intervals.
 * @param {number} intervalMs - The interval duration in milliseconds.
 * @param {IntervalIO} io
 * @returns {{
 *   [Symbol.asyncIterator]: () => AsyncGenerator<number, void, void>
 * }}
 */
export const makeIntervalIterable = (
  intervalMs,
  { setTimeout, clearTimeout, now },
) => {
  const self = freeze({
    /**
     * The async generator implementation.
     * @returns {AsyncGenerator<number, void, void>}
     */
    async *[Symbol.asyncIterator]() {
      let timeoutId;
      /** @type {undefined | ((x: number) => void) } */
      let resolveNext;

      await null;
      try {
        for (;;) {
          timeoutId = setTimeout(() => {
            // Promise.withResovers() would obviate this check
            if (resolveNext) {
              resolveNext(now());
            }
          }, intervalMs);
          yield await new Promise(resolve => (resolveNext = resolve));
        }
      } finally {
        // Ensure cleanup on completion
        clearTimeout(timeoutId);
      }
    },
  });
  return self;
};
