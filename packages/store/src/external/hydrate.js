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
  /** @type {WeakStore<T, HydrateKey>} */
  const instanceToKey = makeWeakStore('instance');

  let lastStoreId = 0;

  // This has to be a strong store, since it is indexed by ID.
  const storeIdToHydrate = makeStore('storeId');

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

  /** @type {BackingStore} */
  let backing;

  /** @type {HydrateHook} */
  const hydrateHook = {
    getKey(value) {
      return instanceToKey.get(value);
    },
    load([storeId, instanceId]) {
      const hydrate = storeIdToHydrate.get(storeId);
      const store = backing.getHydrateStore(storeId);

      const data = store.get(instanceId);
      const markDirty = () => store.set(instanceId, data);

      const activeData = makeActiveData(data, markDirty);
      const obj = hydrate(activeData);
      instanceToKey.init(obj, [storeId, instanceId]);
      return obj;
    },
    drop(storeId) {
      storeIdToHydrate.delete(storeId);
    },
  };

  backing = makeBackingStore(hydrateHook);

  /** @type {MakeHydrateExternalStore<A, T>} */
  function makeHydrateExternalStore(keyName, adaptArguments, makeHydrate) {
    let lastInstanceId = 0;

    lastStoreId += 1;
    const storeId = lastStoreId;
    const hstore = backing.makeHydrateStore(storeId, keyName);

    const initHydrate = makeHydrate(true);
    storeIdToHydrate.init(storeId, makeHydrate());

    /** @type {ExternalStore<(...args: A) => T>} */
    const estore = {
      makeInstance(...args) {
        const data = adaptArguments(...args);
        // Create a new object with the above guts.
        lastInstanceId += 1;
        const instanceId = lastInstanceId;
        initHydrate(data);

        // We store and reload it to sanity-check the initial state and also to
        // ensure that the new object has active data.
        hstore.init(instanceId, data);
        return hydrateHook.load([storeId, instanceId]);
      },
      makeWeakStore() {
        return hstore.makeWeakStore();
      },
    };
    return estore;
  }
  return harden(makeHydrateExternalStore);
};
