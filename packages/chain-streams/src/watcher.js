// @ts-check
import { E, Far } from '@endo/far';
import { DEFAULT_KEEP_POLLING } from './defaults.js';

/**
 * Just return an unspecified allegedValue every poll period.
 *
 * @param {import('./types').ChainLeader} leader
 * @param {import('./types.js').ChainStoreKey} storeKey
 * @returns {Promise<import('./types.js').ChainStream<import('./types').ChainStoreChange>>}
 */
export const makePollingWatcher = async (leader, storeKey) => {
  const { keepPolling = DEFAULT_KEEP_POLLING } = await E(leader).getOptions();
  return Far('key watcher stream', {
    getLatestIterable: () =>
      Far('key watcher iterable', {
        [Symbol.asyncIterator]: () => {
          /** @type {Promise<boolean> | undefined} */
          let nextPollPromise;
          return Far('key watcher iterator', {
            next: async () => {
              if (!nextPollPromise) {
                nextPollPromise = keepPolling();
              }
              const keepGoing = await nextPollPromise;
              nextPollPromise = undefined;
              const change = harden({
                storeKey,
                // Make no warrant as to the values.
                values: [],
              });
              return harden({
                value: change,
                done: !keepGoing,
              });
            },
          });
        },
      }),
  });
};
