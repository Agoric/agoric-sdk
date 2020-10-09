// @ts-check

import '../types';

import { makeWeakStore } from '../weak-store';
import { makeStore } from '../store';

/**
 * @callback MakeBackingStore
 * @param {HydrateHook} hydrateHook
 * @returns {BackingStore}
 */

/**
 * This creates an external store maker for a given storage backend, supporting
 * the Closure interface that the rewriter targets.
 *
 * @template {Array<any>} A
 * @template {ExternalInstance} T
 * @param {MakeBackingStore} makeBackingStore
 * @returns {MakeHydrateExternalStore<A, T>}
 */
export const makeHydrateExternalStoreMaker = makeBackingStore => {
  const serialize = JSON.stringify;
  const unserialize = JSON.parse;

  /** @type {WeakStore<T, [string, string]>} */
  const instanceToKey = makeWeakStore('instance');

  let lastStoreKey = 0;

  // This has to be a strong store, since it is indexed by key.
  const storeKeyToHydrate = makeStore('storeKey');

  /**
   * Create a data object that queues writes to the store.
   *
   * @param {HydrateData} data
   * @param {() => void} markDirty
   */
  const makeActiveData = (data, markDirty) => {
    const activeData = {};
    // For every property in data...
    for (const prop of Object.getOwnPropertyNames(data)) {
      // Define a getter and setter on activeData.
      Object.defineProperty(activeData, prop, {
        get: () => data[prop],
        set: value => {
          data[prop] = value;
          markDirty();
        },
      });
    }
    return harden(activeData);
  };

  /**
   * @type {BackingStore}
   */
  let backing;
  const hydrateHook = {
    getKey(value) {
      return instanceToKey.get(value);
    },
    load([storeKey, instanceKey]) {
      const hydrate = storeKeyToHydrate.get(storeKey);
      const store = backing.findStore(storeKey);

      const data = unserialize(store.get(instanceKey));
      const markDirty = () => store.set(instanceKey, serialize(data));

      const activeData = makeActiveData(data, markDirty);
      const obj = hydrate(activeData);
      instanceToKey.init(obj, [storeKey, instanceKey]);
      return obj;
    },
    drop(storeKey) {
      storeKeyToHydrate.delete(storeKey);
    },
  };

  backing = makeBackingStore(hydrateHook);

  function makeHydrateExternalStore(instanceName, adaptArguments, makeHydrate) {
    let lastInstanceKey = 0;

    lastStoreKey += 1;
    const storeKey = `${lastStoreKey}`;
    const store = backing.makeStore(storeKey, instanceName);

    const initHydrate = makeHydrate(true);
    storeKeyToHydrate.init(storeKey, makeHydrate(undefined));

    /** @type {ExternalStore<(...args: A) => T>} */
    const estore = {
      makeInstance(...args) {
        const data = adaptArguments(...args);
        // Create a new object with the above guts.
        lastInstanceKey += 1;
        const instanceKey = `${lastInstanceKey}`;
        initHydrate(data);

        // We store and reload it to sanity-check the initial state and also to
        // ensure that the new object has active data.
        store.init(instanceKey, serialize(data));
        return hydrateHook.load([storeKey, instanceKey]);
      },
      makeWeakStore() {
        return store.makeWeakStore();
      },
    };
    return estore;
  }
  return harden(makeHydrateExternalStore);
};
