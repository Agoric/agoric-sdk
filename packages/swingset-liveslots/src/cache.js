import { Fail } from '@endo/errors';

/**
 * @template V
 * @callback CacheGet
 * @param {string} key
 * @returns {V | undefined}
 */

/**
 * @template V
 * @callback CacheSet
 * @param {string} key
 * @param {V} value
 * @returns {void}
 */
/**
 * @callback CacheDelete
 * @param {string} key
 * @returns {void}
 *
 * @callback CacheFlush
 * @returns {void}
 *
 * @callback CacheInsistClear
 * @returns {void}
 */
/**
 * @template V
 * @typedef {object} Cache
 * @property {CacheGet<V>} get
 * @property {CacheSet<V>} set
 * @property {CacheDelete} delete
 * @property {CacheFlush} flush
 * @property {CacheInsistClear} insistClear
 */

/**
 * Cache of virtual object/collection state
 *
 * This cache is empty between deliveries. Within a delivery, the
 * first access to some data will cause vatstore reads to populate the
 * cache, then the data is retained until end-of-delivery. Writes to
 * data will update the cache entry and mark it as dirty. At
 * end-of-delivery, we flush the cache, writing out any dirty entries,
 * and deleting all entries.
 *
 * This needs RAM for everything read during a delivery (rather than
 * having a fixed maximum size), but yields a simple (easy to debug)
 * deterministic relationship between data access and reads/writes to
 * the backing store.
 *
 * @template V
 * @param {(key: string) => V} readBacking
 * @param {(key: string, value: V) => void} writeBacking
 * @param {(key: string) => void} deleteBacking
 * @returns {Cache<V>}
 *
 * This cache is part of the virtual object manager and is not intended to be
 * used independently; it is exported only for the benefit of test code.
 */
export function makeCache(readBacking, writeBacking, deleteBacking) {
  const stash = new Map();
  const dirtyKeys = new Set();
  /** @type {Cache<V>} */
  const cache = {
    get: key => {
      assert.typeof(key, 'string');
      if (stash.has(key)) {
        return stash.get(key);
      } else if (dirtyKeys.has(key)) {
        // Respect a pending deletion.
        return undefined;
      }
      const value = readBacking(key);
      stash.set(key, value);
      return value;
    },
    set: (key, value) => {
      assert.typeof(key, 'string');
      stash.set(key, value);
      dirtyKeys.add(key);
    },
    delete: key => {
      assert.typeof(key, 'string');
      stash.delete(key);
      dirtyKeys.add(key);
    },
    flush: () => {
      const keys = [...dirtyKeys.keys()];
      for (const key of keys.sort()) {
        if (stash.has(key)) {
          writeBacking(key, stash.get(key));
        } else {
          deleteBacking(key);
        }
      }
      stash.clear();
      dirtyKeys.clear();
    },
    insistClear: () => {
      dirtyKeys.size === 0 || Fail`cache still has dirtyKeys`;
      stash.size === 0 || Fail`cache still has stash`;
    },
  };
  return harden(cache);
}
