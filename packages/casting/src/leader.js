// @ts-check
import { Far } from '@endo/far';
import { DEFAULT_RETRY_CALLBACK, DEFAULT_JITTER } from './defaults.js';
import { makePollingChangeFollower } from './change-follower.js';
import { makeRoundRobinEndpointMapper } from './round-robin-mapper.js';

/**
 *
 * @param {import('./types').LeaderOptions} leaderOptions
 * @returns {import('./types').Leader}
 */
export const makeCosmJSLeader = leaderOptions => {
  const { retryCallback = DEFAULT_RETRY_CALLBACK, jitter = DEFAULT_JITTER } =
    leaderOptions;

  /** @type {import('./types.js').Leader} */
  const leader = Far('cosmjs leader', {
    getOptions: () => leaderOptions,
    makeClient: clientOptions => {
      const { mnemonic, keplr } = clientOptions;
      if (mnemonic) {
        return makeCosmJsMnemonicClient(leader, clientOptions);
      }
      if (keplr) {
        return makeCosmJsKeplrClient(leader, clientOptions);
      }
      return makeCosmJsReadonlyClient(leader, clientOptions);
    },
    jitter: where => jitter && jitter(where),
    retry: async (where, err, attempt) => {
      if (retryCallback) {
        return retryCallback(where, err, attempt);
      }
      throw err;
    },
    makeWatcher: castingSpec => makePollingChangeFollower(leader, castingSpec),
    mapEndpoints: (where, callback) => {
      const mapper = makeRoundRobinEndpointMapper(leader, endpoints);
      return mapper(callback);
    },
  });

  return leader;
};
