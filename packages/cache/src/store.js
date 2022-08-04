// @ts-check
import { E, Far } from '@endo/far';
import { deeplyFulfilled, makeMarshal } from '@endo/marshal';
import { matches, makeScalarMapStore } from '@agoric/store';

import '@agoric/store/exported.js';

import { withGroundState, makeState } from './state.js';

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
 * @param {string} keyStr
 * @param {(oldValue: unknown) => unknown} txn
 * @param {Pattern} guardPattern
 * @param {(obj: unknown) => unknown} sanitize Process keys and values with
 * this function before storing them
 * @param {{
 * get(key: string): import('./types').State;
 * set(key: string, value: import('./types').State): void;
 * init(key: string, value: import('./types').State): void;
 * }} stateStore
 * @returns {Promise<unknown>} the value of the updated state
 */
const applyCacheTransaction = async (
  keyStr,
  txn,
  guardPattern,
  sanitize,
  stateStore,
) => {
  /**
   * Retrieve a potential updated state from the transaction.
   *
   * @param {import('./types').State} basisState
   * @returns {Promise<import('./types').State | null>} the updated state, or null if no longer applicable
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

  let basisState = stateStore.get(keyStr);
  let updatedState = await getUpdatedState(basisState);

  // AWAIT INTERLEAVING

  // Loop until our updated state is fresh wrt our current state.
  basisState = stateStore.get(keyStr);
  while (updatedState && updatedState.generation <= basisState.generation) {
    // eslint-disable-next-line no-await-in-loop
    updatedState = await getUpdatedState(basisState);
    // AWAIT INTERLEAVING
    basisState = stateStore.get(keyStr);
  }

  if (!updatedState) {
    // The latest store value doesn't match the guard pattern, so don't
    // update.
    return basisState.value;
  }

  // The guard pattern passes and the updated state is fresh, so update the
  // store.
  if (basisState.generation < 1n) {
    // XXX can encapsulate this logic in the caller and eliminate `init()`
    stateStore.init(keyStr, updatedState);
  } else {
    stateStore.set(keyStr, updatedState);
  }

  // Return the newly-applied value.
  return updatedState.value;
};

/**
 * Make a cache coordinator backed by a MapStore.  This coordinator doesn't
 * currently enforce any cache eviction, but that would be a useful feature.
 *
 * @param {MapStore<string, import('./types').State>} [stateStore]
 * @param {(obj: unknown) => unknown} [sanitize] Process keys and values with
 * this function before storing them. Defaults to deeplyFulfilled.
 */
export const makeScalarStoreCoordinator = (
  stateStore = makeScalarMapStore(),
  sanitize = deeplyFulfilled,
) => {
  const serializePassable = makeKeyToString(sanitize);

  const defaultStateStore = withGroundState(stateStore);

  /** @type {import('./types').Coordinator} */
  const coord = Far('store cache coordinator', {
    getRecentValue: async key => {
      const keyStr = await serializePassable(key);
      return defaultStateStore.get(keyStr).value;
    },
    setCacheValue: async (key, newValue, guardPattern) => {
      const keyStr = await serializePassable(key);
      return applyCacheTransaction(
        keyStr,
        () => newValue,
        guardPattern,
        sanitize,
        defaultStateStore,
      );
    },
    updateCacheValue: async (key, updater, guardPattern) => {
      const keyStr = await serializePassable(key);
      return applyCacheTransaction(
        keyStr,
        oldValue => E(updater).update(oldValue),
        guardPattern,
        sanitize,
        defaultStateStore,
      );
    },
  });
  return coord;
};

// TODO make this like the MapStore wrapper but handle async b/c
/**
 * Make a cache coordinator backed by a MapStore.  This coordinator doesn't
 * currently enforce any cache eviction, but that would be a useful feature.
 *
 * @param {MapStore<string, import('./types').State>} [stateStore]
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
/*
export const makeChainStorageCoordinator = (
  stateStore = makeScalarMapStore(),
  storageNode,
  marshaller,
) => {};
*/
        defaultStateStore,
      );
      return updateStorageNode(storedValue);
    },
  });
  return coord;
};
