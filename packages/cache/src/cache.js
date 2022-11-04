import { E, Far } from '@endo/far';

import { makeScalarStoreCoordinator } from './store.js';

/**
 * @typedef {{ [x: PropertyKey]: any } | string | symbol | bigint | null |
 * undefined | number | ((oldValue: any) => ERef<unknown>)} Update a `newValue`
 * to update to.  If a function, then it should take an oldValue and return a
 * `newValue` or promise for `newValue`
 */

/**
 * @param {ERef<import('./types').Coordinator>} [coordinator]
 */
export const makeCache = (coordinator = makeScalarStoreCoordinator()) => {
  /**
   * The ground state for a cache key value is `undefined`.  It is impossible to
   * distinguish a set value of `undefined` from an unset key
   *
   * @param {unknown} key the cache key (any key type acceptable to the cache)
   * @param {[] | [Update] | [Update, Pattern]} optUpdateGuardPattern an optional
   */
  const cache = (key, ...optUpdateGuardPattern) => {
    if (optUpdateGuardPattern.length === 0) {
      return E(coordinator).getRecentValue(key);
    }

    const [update, guardPattern] = optUpdateGuardPattern;
    if (typeof update !== 'function') {
      return E(coordinator).setCacheValue(key, update, guardPattern);
    }

    const updater = Far('cache updater', {
      update: oldValue => {
        return update(oldValue);
      },
    });
    return E(coordinator).updateCacheValue(key, updater, guardPattern);
  };

  return cache;
};
