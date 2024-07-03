// @ts-check

import { assert, Fail } from '@endo/errors';

// XXX Do these "StorageAPI" functions belong in their own package?

/**
 * @template {unknown} [T=unknown]
 * @typedef {{
 *   has: (key: string) => boolean,
 *   get: (key: string) => T | undefined,
 *   getNextKey: (previousKey: string) => string | undefined,
 *   set: (key: string, value: T ) => void,
 *   delete: (key: string) => void,
 * }} KVStore
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
 * Create a StorageAPI object that buffers writes to a wrapped StorageAPI object
 * until told to commit (or abort) them.
 *
 * @template {unknown} [T=unknown]
 * @param {KVStore<T>} kvStore  The StorageAPI object to wrap
 * @param {{
 *   onGet?: (key: string, value: T) => void, // a callback invoked after getting a value from kvStore
 *   onPendingSet?: (key: string, value: T) => void, // a callback invoked after a new uncommitted value is set
 *   onPendingDelete?: (key: string) => void, // a callback invoked after a new uncommitted delete
 *   onCommit?: () => void, // a callback invoked after pending operations have been committed
 *   onAbort?: () => void, // a callback invoked after pending operations have been aborted
 * }} listeners  Optional callbacks to be invoked when respective events occur
 *
 * @returns {{kvStore: KVStore<T>, commit: () => void, abort: () => void}}
 */
export function makeBufferedStorage(kvStore, listeners = {}) {
  insistStorageAPI(kvStore);

  const { onGet, onPendingSet, onPendingDelete, onCommit, onAbort } = listeners;

  // To avoid confusion, additions and deletions are prevented from sharing
  // the same key at any given time.
  const additions = new Map();
  const deletions = new Set();

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
      // @ts-expect-error value may be undefined
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

    /**
     * @param {string} previousKey
     */
    getNextKey(previousKey) {
      assert.typeof(previousKey, 'string');
      throw Error('not implemented');
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
 * @template {unknown} [T=unknown]
 * @param {KVStore<T>} kvStore
 */
export const makeReadCachingStorage = kvStore => {
  // In addition to the wrapping write buffer, keep a simple cache of
  // read values for has and get.
  let cache;
  function resetCache() {
    cache = new Map();
  }
  resetCache();

  const deleted = Symbol('deleted');
  const undef = Symbol('undefined');

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
      buffered.set(key, value);
    },

    // Reset the read cache upon commit or abort.
    onCommit: resetCache,
    onAbort: resetCache,
  });
  return harden({ ...buffered, commit, abort });
};
