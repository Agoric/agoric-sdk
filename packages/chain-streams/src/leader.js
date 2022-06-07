// @ts-check
import { E, Far } from '@endo/far';
import { DEFAULT_RETRY_CALLBACK } from './defaults.js';
import { shuffle } from './shuffle.js';
import { makePollingWatcher } from './watcher.js';

/**
 * Create a chain leader that rotates through a list of endpoints.
 *
 * @param {string[]} endpoints
 * @param {import('./types.js').ChainLeaderOptions} leaderOptions
 */
export const makeRoundRobinLeader = (endpoints, leaderOptions = {}) => {
  const { retryCallback = DEFAULT_RETRY_CALLBACK } = leaderOptions;

  // Shuffle the RPC addresses, so that we don't always hit the same one as all
  // our peers.
  shuffle(endpoints);

  let lastRespondingEndpointIndex = 0;
  let thisAttempt = 0;

  /** @type {import('./types.js').ChainLeader} */
  const leader = Far('round robin leader', {
    getOptions: () => leaderOptions,
    retry: async (err, attempt) => {
      if (retryCallback) {
        return retryCallback(err, attempt);
      }
      throw err;
    },
    watchStoreKey: storeKey => makePollingWatcher(leader, storeKey),
    /**
     * @template T
     * @param {(endpoint: string) => Promise<T>} callback
     */
    mapEndpoints: async callback => {
      /** @type {Promise<T[]>} */
      const p = new Promise((resolve, reject) => {
        let endpointIndex = lastRespondingEndpointIndex;

        const retry = async err => {
          endpointIndex = (endpointIndex + 1) % endpoints.length;

          // eslint-disable-next-line no-use-before-define
          E(leader).retry(err, thisAttempt).then(applyOne, reject);
          thisAttempt += 1;
        };

        const applyOne = () => {
          Promise.resolve()
            .then(() => callback(endpoints[endpointIndex]))
            .then(res => {
              resolve(harden([res]));
              lastRespondingEndpointIndex = endpointIndex;
              thisAttempt = 0;
            }, retry);

          // Don't return to prevent a promise chain.
        };

        applyOne();
      });
      return p;
    },
  });
  return leader;
};
