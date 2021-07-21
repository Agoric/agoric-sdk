// @ts-check

import '../types.js';

import { makeWeakStore } from '../weak-store.js';
import { makeStore } from '../store.js';

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
  const storeIdToHydrater = makeStore('storeId');

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
      const hydrater = storeIdToHydrater.get(storeId);
      const store = backing.getHydrateStore(storeId);

      const data = store.get(instanceId);
      const markDirty = () => store.set(instanceId, data);

      const activeData = makeActiveData(data, markDirty);
      const obj = hydrater.hydrate(activeData);
      instanceToKey.init(obj, harden([storeId, instanceId]));
      return obj;
    },
    drop(storeId) {
      storeIdToHydrater.delete(storeId);
    },
  };

  backing = makeBackingStore(hydrateHook);

  /** @type {MakeHydrateExternalStore<A, T>} */
  function makeHydrateExternalStore(keyName, adaptArguments, makeHydrater) {
    let lastInstanceId = 0;

    lastStoreId += 1;
    const storeId = lastStoreId;
    const hstore = backing.makeHydrateStore(storeId, keyName);

    const initHydrater = makeHydrater(true);
    storeIdToHydrater.init(storeId, makeHydrater());

    /** @type {ExternalStore<(...args: A) => T>} */
    const estore = harden({
      makeInstance(...args) {
        const data = adaptArguments(...args);
        // Create a new object with the above guts.
        lastInstanceId += 1;
        const instanceId = lastInstanceId;
        initHydrater.hydrate(data);

        // We store and reload it to sanity-check the initial state and also to
        // ensure that the new object has active data.
        hstore.init(instanceId, data);
        return hydrateHook.load([storeId, instanceId]);
      },
      makeWeakStore() {
        return hstore.makeWeakStore();
      },
    });
    return estore;
  }
  return harden(makeHydrateExternalStore);
};
