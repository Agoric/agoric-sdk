// @ts-check
import { E, Far } from '@endo/far';
import { DEFAULT_KEEP_POLLING } from './defaults.js';

/**
 * Just return an unspecified allegedValue every poll period.
 *
 * @param {import('./types').Leader} leader
 * @param {import('./types.js').CastingSpec} castingSpec
 * @returns {Promise<import('./types.js').Follower<import('./types').CastingChange>>}
 */
export const makePollingChangeFollower = async (leader, castingSpec) => {
  const { keepPolling = DEFAULT_KEEP_POLLING } = await E(leader).getOptions();
  return Far('polling change follower', {
    getLatestIterable: () =>
      Far('polling change follower iterable', {
        [Symbol.asyncIterator]: () => {
          /** @type {Promise<boolean> | undefined} */
          let nextPollPromise;
          return Far('polling change follower iterator', {
            next: async () => {
              if (!nextPollPromise) {
                nextPollPromise = keepPolling();
              }
              const keepGoing = await nextPollPromise;
              nextPollPromise = undefined;
              const change = harden({
                castingSpec,
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
