// @ts-check
import { E, Far } from '@endo/far';
import { deeplyFulfilled, makeMarshal } from '@endo/marshal';
import { matches, makeScalarMapStore } from '@agoric/store';

import '@agoric/store/exported.js';

import { GROUND_STATE, makeState } from './state.js';

/**
 * @param {(obj: unknown) => unknown} [sanitize]
 * @returns {(key: Passable) => Promise<string>}
 */
const makeKeyToString = (sanitize = obj => obj) => {
  let lastNonce = 0;
  const valToNonce = new WeakMap();
  const valToSlot = val => {
    let slot = valToNonce.get(val);
    if (!slot) {
      lastNonce += 1;
      slot = lastNonce;
      valToNonce.set(val, slot);
    }
    return slot;
  };

  const { serialize: keyToJsonable } = makeMarshal(valToSlot);
  const keyToString = async keyP => {
    const key = await sanitize(keyP);
    const obj = keyToJsonable(key);
    return JSON.stringify(obj);
  };
  return keyToString;
};

/**
 * Make a cache coordinator backed by a MapStore.  This coordinator doesn't
 * currently enforce any cache eviction, but that would be a useful feature.
 *
 * @param {MapStore<string, import('./types').State>} [stateStore]
 * @param {(obj: unknown) => unknown} [sanitize] Process keys and values with
 * this function before storing them
 */
export const makeScalarStoreCoordinator = (
  stateStore = makeScalarMapStore(),
  sanitize = deeplyFulfilled,
) => {
  const keyToString = makeKeyToString(sanitize);

  const getCurrentState = keyStr => {
    if (!stateStore.has(keyStr)) {
      return GROUND_STATE;
    }
    return stateStore.get(keyStr);
  };

  /**
   * @param {string} keyStr
   * @param {(oldValue: unknown) => unknown} txn
   * @param {Pattern} guardPattern
   * @returns {ERef<unknown>} the updated state
   */
  const applyCacheTransaction = async (keyStr, txn, guardPattern) => {
    /**
     * Retrieve a potential updated state from the transaction.
     *
     * @param {import('./types').State} basisState
     * @returns {ERef<import('./types').State | null>} the updated state, or null if no longer applicable
     */
    const getUpdatedState = async basisState => {
      const { value } = basisState;
      if (!matches(value, guardPattern)) {
        // value doesn't match, so don't apply the update.
        return null;
      }

      const newValue = await sanitize(txn(value));
      return makeState(newValue, basisState);
    };

    let basisState = getCurrentState(keyStr);
    let updatedState = await getUpdatedState(basisState);

    // AWAIT INTERLEAVING

    // Loop until our updated state is fresh wrt our current state.
    basisState = getCurrentState(keyStr);
    while (updatedState && updatedState.generation <= basisState.generation) {
      // eslint-disable-next-line no-await-in-loop
      updatedState = await getUpdatedState(basisState);
      // AWAIT INTERLEAVING
      basisState = getCurrentState(keyStr);
    }

    if (!updatedState) {
      // The latest store value doesn't match the guard pattern, so don't
      // update.
      return basisState.value;
    }

    // The guard pattern passes and the updated state is fresh, so update the
    // store.
    if (basisState.generation < 1n) {
      stateStore.init(keyStr, updatedState);
    } else {
      stateStore.set(keyStr, updatedState);
    }

    // Return the newly-applied value.
    return updatedState.value;
  };

  /** @type {import('./types').Coordinator} */
  const coord = Far('store cache coordinator', {
    getRecentValue: async key => {
      const keyStr = await keyToString(key);
      return getCurrentState(keyStr).value;
    },
    setCacheValue: async (key, newValue, guardPattern) => {
      const keyStr = await keyToString(key);
      return applyCacheTransaction(keyStr, () => newValue, guardPattern);
    },
    updateCacheValue: async (key, updater, guardPattern) => {
      const keyStr = await keyToString(key);
      return applyCacheTransaction(
        keyStr,
        oldValue => E(updater).update(oldValue),
        guardPattern,
      );
    },
  });
  return coord;
};
