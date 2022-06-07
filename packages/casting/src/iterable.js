// @ts-check
import { E } from '@endo/far';

/**
 * Consume a notifier, only returning next when there is a new publication.
 *
 * @template T
 * @param {Notifier<T>} notifier
 */
export const makeAsyncIterableFromNotifier = notifier =>
  harden({
    [Symbol.asyncIterator]: () => {
      /** @type {UpdateCount} */
      let lastUpdateCount = 0;
      return harden({
        next: async () => {
          const { value, updateCount } = await notifier.getUpdateSince(
            lastUpdateCount,
          );
          lastUpdateCount = updateCount;
          return {
            value,
            done: lastUpdateCount === undefined,
          };
        },
      });
    },
  });

/**
 * @template T
 * @param {ERef<import('./types').Follower<T>>} follower
 */
export const iterateLatest = follower => {
  // For now, just pass through the iterable.
  return harden({
    /** @returns {AsyncIterator<T>} */
    [Symbol.asyncIterator]: () => {
      const latestIterable = E(follower).getLatestIterable();
      const iterator = E(latestIterable)[Symbol.asyncIterator]();
      return harden({
        next: () => E(iterator).next(),
      });
    },
  });
};
