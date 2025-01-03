const { freeze } = Object;

/**
 * @typedef {object} IntervalIO
 * @property {typeof setInterval} setInterval
 * @property {typeof clearInterval} clearInterval
 * @property {typeof Date.now} now
 */

/**
 * Creates an async generator that emits values at specified intervals, with immediate cancellation support.
 * @param {number} intervalMs - The interval duration in milliseconds.
 * @param {IntervalIO} io
 * @returns {{
 *   cancel: () => void,
 *   [Symbol.asyncIterator]: () => AsyncGenerator<number, void, void>
 * }}
 */
export const intervalAsyncGenerator = (
  intervalMs,
  { setInterval, clearInterval, now },
) => {
  let intervalId = null;
  let resolveNext = null;
  let done = false;

  const self = freeze({
    /**
     * Cancels the interval and stops the generator immediately.
     */
    cancel() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      done = true;
      if (resolveNext) {
        resolveNext({ done: true });
        resolveNext = null;
      }
    },

    /**
     * The async generator implementation.
     * @returns {AsyncGenerator<number, void, void>}
     */
    async *[Symbol.asyncIterator]() {
      intervalId = setInterval(() => {
        if (resolveNext) {
          resolveNext({ value: now(), done: false });
          resolveNext = null;
        }
      }, intervalMs);

      await null;
      try {
        while (!done) {
          yield await new Promise(resolve => (resolveNext = resolve)).then(
            r => r.value,
          );
        }
      } finally {
        self.cancel(); // Ensure cleanup on completion
      }
    },
  });
  return self;
};
