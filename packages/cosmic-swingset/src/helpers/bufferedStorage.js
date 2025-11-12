import { assert, Fail } from '@endo/errors';
import {
  makeKVStoreFromMap,
  compareByCodePoints,
} from '@agoric/internal/src/kv-store.js';

// XXX Do these "StorageAPI" functions belong in their own package?
/**
 * @import {KVStore} from '@agoric/internal/src/kv-store.js'
 */
/**
 * @template [T=unknown]
 * @typedef {KVStore<T> & {commit: () => void, abort: () => void}} BufferedKVStore
 */

/**
 * Assert function to ensure that an object implements the StorageAPI
 * interface: methods { has, getNextKey, get, set, delete }
 * (cf. packages/SwingSet/docs/state.md#transactions).
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistStorageAPI(kvStore) {
  for (const n of ['has', 'getNextKey', 'get', 'set', 'delete']) {
    n in kvStore || Fail`kvStore.${n} is missing, cannot use`;
  }
}

/**
 * Return an object representing KVStore contents as both a KVStore and a Map.
 *
 * Iterating over the map while mutating it is "unsupported" (entries inserted
 * that sort before the current iteration point will be skipped).
 *
 * The `size` property is not supported.
 *
 * @template [T=unknown]
 * @param {Map<string, T> | KVStore<T>} [mapOrKvStore]
 */
export function provideEnhancedKVStore(mapOrKvStore = new Map()) {
  if (!('getNextKey' in mapOrKvStore)) {
    mapOrKvStore = makeKVStoreFromMap(mapOrKvStore);
  }

  if (!('keys' in mapOrKvStore)) {
    const kvStore = mapOrKvStore;
    const map = harden({
      ...mapOrKvStore,
      set(key, value) {
        kvStore.set(key, value);
        return map;
      },
      delete(key) {
        const had = kvStore.has(key);
        kvStore.delete(key);
        return had;
      },
      clear() {
        for (const key of map.keys()) {
          kvStore.delete(key);
        }
      },
      /** @returns {number} */
      get size() {
        throw new Error('size not implemented.');
      },
      *entries() {
        for (const key of map.keys()) {
          yield [key, /** @type {string} */ (kvStore.get(key))];
        }
      },
      *keys() {
        /** @type {string | undefined} */
        let key = '';
        if (kvStore.has(key)) {
          yield key;
        }
        // eslint-disable-next-line no-cond-assign
        while ((key = kvStore.getNextKey(key))) {
          yield key;
        }
      },
      *values() {
        for (const key of map.keys()) {
          yield /** @type {string} */ (kvStore.get(key));
        }
      },
      forEach(callbackfn, thisArg) {
        for (const key of map.keys()) {
          Reflect.apply(callbackfn, thisArg, [
            /** @type {string} */ (kvStore.get(key)),
            key,
            map,
          ]);
        }
      },
      [Symbol.iterator]() {
        return map.entries();
      },
    });
    mapOrKvStore = map;
  }

  return /** @type {Map<string, T> & KVStore<T>} */ (mapOrKvStore);
}

/**
 * Create a StorageAPI object that buffers writes to a wrapped StorageAPI object
 * until told to commit (or abort) them.
 *
 * @template [T=unknown]
 * @param {KVStore<T>} kvStore the StorageAPI object to wrap
 * @param {object} [listeners] optional callbacks to be invoked when respective events occur
 * @param {(key: string, value: T | undefined) => void} [listeners.onGet] a callback invoked after getting a value from kvStore
 * @param {(key: string, value: T) => void} [listeners.onPendingSet] a callback invoked after a new uncommitted value is set
 * @param {(key: string) => void} [listeners.onPendingDelete] a callback invoked after a new uncommitted delete
 * @param {() => void} [listeners.onCommit] a callback invoked after pending operations have been committed
 * @param {() => void} [listeners.onAbort] a callback invoked after pending operations have been aborted
 * @returns {{kvStore: KVStore<T>} & Pick<BufferedKVStore<T>, 'commit' | 'abort'>}
 */
export function makeBufferedStorage(kvStore, listeners = {}) {
  insistStorageAPI(kvStore);

  const { onGet, onPendingSet, onPendingDelete, onCommit, onAbort } = listeners;

  // To avoid confusion, additions and deletions are prevented from sharing
  // the same key at any given time.
  /** @type {Map<string, T> & KVStore<T>} */
  const additions = provideEnhancedKVStore(makeKVStoreFromMap(new Map()));
  const deletions = new Set();

  /** @type {KVStore<T>} */
  const buffered = {
    has(key) {
      assert.typeof(key, 'string');
      if (additions.has(key)) return true;
      if (deletions.has(key)) return false;
      return kvStore.has(key);
    },
    get(key) {
      assert.typeof(key, 'string');
      if (additions.has(key)) return additions.get(key);
      if (deletions.has(key)) return undefined;
      const value = kvStore.get(key);
      if (onGet !== undefined) onGet(key, value);
      return value;
    },
    set(key, value) {
      assert.typeof(key, 'string');
      additions.set(key, value);
      deletions.delete(key);
      if (onPendingSet !== undefined) onPendingSet(key, value);
    },
    delete(key) {
      assert.typeof(key, 'string');
      additions.delete(key);
      deletions.add(key);
      if (onPendingDelete !== undefined) onPendingDelete(key);
    },
    getNextKey(previousKey) {
      assert.typeof(previousKey, 'string');
      const bufferedNextKey = additions.getNextKey(previousKey);
      let nextKey = kvStore.getNextKey(previousKey);
      while (nextKey !== undefined) {
        if (bufferedNextKey !== undefined) {
          if (compareByCodePoints(bufferedNextKey, nextKey) <= 0) break;
        }
        if (!deletions.has(nextKey)) return nextKey;
        nextKey = kvStore.getNextKey(nextKey);
      }
      return bufferedNextKey;
    },
  };
  function commit() {
    for (const [key, value] of additions) {
      kvStore.set(key, value);
    }
    for (const key of deletions) {
      kvStore.delete(key);
    }
    additions.clear();
    deletions.clear();
    if (onCommit !== undefined) onCommit();
  }
  function abort() {
    additions.clear();
    deletions.clear();
    if (onAbort !== undefined) onAbort();
  }
  return { kvStore: buffered, commit, abort };
}

/**
 * @template [T=unknown]
 * @param {KVStore<T>} kvStore
 * @returns {BufferedKVStore<T>}
 */
export const makeReadCachingStorage = kvStore => {
  // In addition to the wrapping write buffer, keep a simple cache of
  // read values for has and get.
  const deleted = Symbol('deleted');
  const undef = Symbol('undefined');
  /** @typedef {(typeof deleted) | (typeof undef)} ReadCacheSentinel */
  /** @type {Map<string, T | ReadCacheSentinel>} */
  let cache;
  function resetCache() {
    cache = new Map();
  }
  resetCache();

  /** @type {KVStore<T>} */
  const storage = harden({
    has(key) {
      const value = cache.get(key);
      if (value !== undefined) {
        return value !== deleted;
      } else {
        const ret = kvStore.has(key);
        if (!ret) {
          cache.set(key, deleted);
        }
        return ret;
      }
    },
    get(key) {
      let value = cache.get(key);
      if (value !== undefined) {
        return value === deleted || value === undef ? undefined : value;
      }

      // Fetch the value and cache it until the next commit or abort.
      value = kvStore.get(key);
      cache.set(key, value === undefined ? undef : value);
      return value;
    },
    set(key, value) {
      // Set the value and cache it until the next commit or abort (which is
      // expected immediately, since the buffered wrapper only calls set
      // *during* a commit).
      // `undefined` is a valid value technically different than deletion,
      // depending on how the underlying store does its serialization
      cache.set(key, value === undefined ? undef : value);
      kvStore.set(key, value);
    },
    delete(key) {
      // Delete the value and cache the deletion until next commit or abort.
      // Deletion results in `undefined` on `get`, but `false` on `has`
      cache.set(key, deleted);
      kvStore.delete(key);
    },
    getNextKey(_previousKey) {
      throw Error('not implemented');
    },
  });
  const {
    kvStore: buffered,
    commit,
    abort,
  } = makeBufferedStorage(storage, {
    // Enqueue a write of any retrieved value, to handle callers like mailbox.js
    // that expect local mutations to be automatically written back.
    onGet(key, value) {
      if (value !== undefined) buffered.set(key, value);
    },

    // Reset the read cache upon commit or abort.
    onCommit: resetCache,
    onAbort: resetCache,
  });
  return harden({ .../** @type {KVStore<T>} */ (buffered), commit, abort });
};
