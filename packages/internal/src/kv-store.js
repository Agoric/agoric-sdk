// @ts-check
import { Fail } from '@endo/errors';

/**
 * @template [T=string]
 * @typedef {{
 *   has: (key: string) => boolean;
 *   get: (key: string) => T | undefined;
 *   getNextKey: (previousKey: string) => string | undefined;
 *   set: (key: string, value: T) => void;
 *   delete: (key: string) => void;
 * }} KVStore
 */

/**
 * @param {object} db The SQLite database connection.
 * @param {() => void} beforeMutation Called before mutating methods to
 *   establish a DB transaction if needed
 * @param {(...args: string[]) => void} trace Called after set/delete to record
 *   a debug log
 * @returns {KVStore}
 */

export function makeKVStore(db, beforeMutation, trace) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kvStore (
      key TEXT,
      value TEXT,
      PRIMARY KEY (key)
    )
  `);

  const sqlKVGet = db.prepare(`
    SELECT value
    FROM kvStore
    WHERE key = ?
  `);
  sqlKVGet.pluck(true);

  /**
   * Obtain the value stored for a given key.
   *
   * @param {string} key The key whose value is sought.
   * @returns {string | undefined} the (string) value for the given key, or
   *   undefined if there is no such value.
   * @throws if key is not a string.
   */
  function get(key) {
    typeof key === 'string' || Fail`key must be a string`;
    return sqlKVGet.get(key);
  }

  const sqlKVGetNextKey = db.prepare(`
    SELECT key
    FROM kvStore
    WHERE key > ?
    LIMIT 1
  `);
  sqlKVGetNextKey.pluck(true);

  /**
   * getNextKey enables callers to iterate over all keys within a given range.
   * To build an iterator of all keys from start (inclusive) to end (exclusive),
   * do:
   *
   * ```js
   * function* iterate(start, end) {
   *   if (kvStore.has(start)) {
   *     yield start;
   *   }
   *   let prev = start;
   *   while (true) {
   *     let next = kvStore.getNextKey(prev);
   *     if (!next || next >= end) {
   *       break;
   *     }
   *     yield next;
   *     prev = next;
   *   }
   * }
   * ```
   *
   * @param {string} previousKey The key returned will always be later than this
   *   one.
   * @returns {string | undefined} a key string, or undefined if we reach the
   *   end of the store
   * @throws if previousKey is not a string
   */

  function getNextKey(previousKey) {
    typeof previousKey === 'string' || Fail`previousKey must be a string`;
    return sqlKVGetNextKey.get(previousKey);
  }

  /**
   * Test if the state contains a value for a given key.
   *
   * @param {string} key The key that is of interest.
   * @returns {boolean} true if a value is stored for the key, false if not.
   * @throws if key is not a string.
   */
  function has(key) {
    typeof key === 'string' || Fail`key must be a string`;
    return get(key) !== undefined;
  }

  const sqlKVSet = db.prepare(`
    INSERT INTO kvStore (key, value)
    VALUES (?, ?)
    ON CONFLICT DO UPDATE SET value = excluded.value
  `);

  /**
   * Store a value for a given key. The value will replace any prior value if
   * there was one.
   *
   * @param {string} key The key whose value is being set.
   * @param {string} value The value to set the key to.
   * @throws if either parameter is not a string.
   */
  function set(key, value) {
    typeof key === 'string' || Fail`key must be a string`;
    typeof value === 'string' || Fail`value must be a string`;
    // synchronous read after write within a transaction is safe
    // The transaction's overall success will be awaited during commit
    beforeMutation();
    sqlKVSet.run(key, value);
    trace('set', key, value);
  }

  const sqlKVDel = db.prepare(`
    DELETE FROM kvStore
    WHERE key = ?
  `);

  /**
   * Remove any stored value for a given key. It is permissible for there to be
   * no existing stored value for the key.
   *
   * @param {string} key The key whose value is to be deleted
   * @throws if key is not a string.
   */
  function del(key) {
    typeof key === 'string' || Fail`key must be a string`;
    beforeMutation();
    sqlKVDel.run(key);
    trace('del', key);
  }

  const kvStore = {
    has,
    get,
    getNextKey,
    set,
    delete: del,
  };

  return kvStore;
}

// TODO: Replace compareByCodePoints and makeKVStoreFromMap and
// provideEnhancedKVStore with imports when
// available.
// https://github.com/Agoric/agoric-sdk/pull/10299

export const compareByCodePoints = (left, right) => {
  const leftIter = left[Symbol.iterator]();
  const rightIter = right[Symbol.iterator]();
  for (;;) {
    const { value: leftChar } = leftIter.next();
    const { value: rightChar } = rightIter.next();
    if (leftChar === undefined && rightChar === undefined) {
      return 0;
    } else if (leftChar === undefined) {
      // left is a prefix of right.
      return -1;
    } else if (rightChar === undefined) {
      // right is a prefix of left.
      return 1;
    }
    const leftCodepoint = /** @type {number} */ (leftChar.codePointAt(0));
    const rightCodepoint = /** @type {number} */ (rightChar.codePointAt(0));
    if (leftCodepoint < rightCodepoint) return -1;
    if (leftCodepoint > rightCodepoint) return 1;
  }
};

/**
 * @template [T=unknown]
 * @param {Map<string, T>} map
 * @returns {KVStore<T>}
 */
export const makeKVStoreFromMap = map => {
  let sortedKeys;
  let priorKeyReturned;
  let priorKeyIndex;

  const ensureSorted = () => {
    if (sortedKeys) return;
    sortedKeys = [...map.keys()].sort(compareByCodePoints);
  };

  const clearGetNextKeyCache = () => {
    priorKeyReturned = undefined;
    priorKeyIndex = -1;
  };
  clearGetNextKeyCache();

  const clearSorted = () => {
    sortedKeys = undefined;
    clearGetNextKeyCache();
  };

  /** @type {KVStore<T>} */
  const fakeStore = harden({
    has: key => map.has(key),
    get: key => map.get(key),
    getNextKey: priorKey => {
      assert.typeof(priorKey, 'string');
      ensureSorted();
      const start =
        priorKeyReturned === undefined
          ? 0
          : // If priorKeyReturned <= priorKey, start just after it.
            (compareByCodePoints(priorKeyReturned, priorKey) <= 0 &&
              priorKeyIndex + 1) ||
            // Else if priorKeyReturned immediately follows priorKey, start at
            // its index (and expect to return it again).
            (sortedKeys.at(priorKeyIndex - 1) === priorKey && priorKeyIndex) ||
            // Otherwise, start at the beginning.
            0;
      for (let i = start; i < sortedKeys.length; i += 1) {
        const key = sortedKeys[i];
        if (compareByCodePoints(key, priorKey) <= 0) continue;
        priorKeyReturned = key;
        priorKeyIndex = i;
        return key;
      }
      // reached end without finding the key, so clear our cache
      clearGetNextKeyCache();
      return undefined;
    },
    set: (key, value) => {
      if (!map.has(key)) clearSorted();
      map.set(key, value);
    },
    delete: key => {
      if (map.has(key)) clearSorted();
      map.delete(key);
    },
  });
  return fakeStore;
};
