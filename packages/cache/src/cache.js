// @ts-check
import { E } from '@endo/far';
import { M } from '@agoric/store';

import { makeState } from './state.js';
import { makeStoreCoordinator } from './store.js';

/** @template T @typedef {import('@endo/far').ERef<T>} ERef */

/**
 * @param {ERef<import('./types').Coordinator>} [coordinator]
 */
export const makeCache = (coordinator = makeStoreCoordinator()) => {
  /**
   * The ground state for a cache key value is `undefined`.  It is impossible to
   * distinguish a set value of `undefined` from an unset key
   *
   * @param {unknown} key the cache key (any key type acceptable to the cache)
   * @param {object | string | bigint | null | undefined | number | ((oldValue: any) => ERef<unknown>)} [update] a
   * function that returns a `newValue` or promise for `newValue`
   * @param {Pattern[]} optGuardPattern don't update unless this pattern matches
   */
  const cache = (key, update, ...optGuardPattern) => {
    if (!update) {
      return E.get(E(coordinator).getRecentState(key)).value;
    }
    const guardPattern =
      optGuardPattern.length > 0 ? optGuardPattern[0] : M.any();
    return new Promise((resolve, reject) => {
      const retryTransaction = async recentState => {
        const updatedValue = await (typeof update === 'function'
          ? update(recentState.value)
          : update);
        const nextState = makeState(updatedValue, recentState);
        const updatedState = await E(coordinator).tryUpdateState(
          key,
          nextState,
          guardPattern,
        );
        if (updatedState.generation <= nextState.generation) {
          resolve(updatedState.value);
          return;
        }
        retryTransaction(updatedState).catch(reject);
      };
      // Start the transaction loop until it fails or we update successfully.
      E(coordinator).getRecentState(key).then(retryTransaction).catch(reject);
    });
  };
  return cache;
};
