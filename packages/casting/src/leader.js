// @ts-check
import { Far } from '@endo/far';
import { DEFAULT_RETRY_CALLBACK, DEFAULT_JITTER } from './defaults.js';
import { makePollingChangeFollower } from './change-follower.js';
import { makeRoundRobinEndpointMapper } from './round-robin-mapper.js';

/**
 * @param {string[]} endpoints
 * @param {import('./types').LeaderOptions} [leaderOptions]
 * @returns {import('./types').Leader}
 */
export const makeCosmJSLeader = (endpoints, leaderOptions) => {
  const { retryCallback = DEFAULT_RETRY_CALLBACK, jitter = DEFAULT_JITTER } =
    leaderOptions || {};

  const actualOptions = { ...leaderOptions, retryCallback, jitter };

  /** @type {import('./types.js').Leader} */
  const leader = Far('cosmjs leader', {
    getOptions: () => actualOptions,
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
    makeWatcher: async castingSpec => {
      const spec = await castingSpec;
      const follower = makePollingChangeFollower(leader, spec);
      return follower;
    },
    mapEndpoints: (where, callback) => {
      // eslint-disable-next-line no-use-before-define
      return mapper(where, callback);
    },
  });

  const mapper = makeRoundRobinEndpointMapper(leader, endpoints);
  return leader;
};
