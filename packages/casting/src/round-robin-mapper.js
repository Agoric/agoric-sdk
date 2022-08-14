// @ts-check
import { E } from '@endo/far';

/**
 * Modern version of Fisher-Yates shuffle algorithm (in-place).
 *
 * @template T
 * @param {Array<T>} a
 */
export const shuffle = a => {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
};

/**
 * Create an endpoint mapper that rotates through a list of endpoints.
 *
 * @param {import('./types.js').Leader} leader
 * @param {string[]} endpoints
 */
export const makeRoundRobinEndpointMapper = (leader, endpoints) => {
  // Shuffle the RPC addresses, so that we don't always hit the same one as all
  // our peers.
  shuffle(endpoints);

  let lastRespondingEndpointIndex = 0;
  let thisAttempt = 0;

  /**
   * @template T
   * @param {string} where
   * @param {(where: string, endpoint: string) => Promise<T>} callback
   */
  const mapEndpoints = async (where, callback) => {
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
          .then(() => callback(where, endpoints[endpointIndex]))
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
  };

  return mapEndpoints;
};
