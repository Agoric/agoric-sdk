// @ts-check
import { Fail } from '@endo/errors';

/**
 * @typedef {{
 *   has: (key: string) => boolean,
 *   get: (key: string) => string | undefined,
 *   getNextKey: (previousKey: string) => string | undefined,
 *   set: (key: string, value: string, bypassHash?: boolean ) => void,
 *   delete: (key: string) => void,
 * }} KVStore
 */

/**
 * @param {string} key
 */
export function getKeyType(key) {
  if (key.startsWith('local.')) {
    return 'local';
  } else if (key.startsWith('host.')) {
    return 'host';
  }
  return 'consensus';
}

/**
 * @param {object} db  The SQLite database connection.
 * @param {() => void} ensureTxn  Called before mutating methods to establish a DB transaction
 * @param {(...args: string[]) => void} trace  Called after sets/gets to record a debug log
 * @returns { KVStore }
 */

export function makeKVStore(db, ensureTxn, trace) {
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
   * @param {string} key  The key whose value is sought.
   *
   * @returns {string | undefined} the (string) value for the given key, or
   *    undefined if there is no such value.
   *
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
   * getNextKey enables callers to iterate over all keys within a
   * given range. To build an iterator of all keys from start
   * (inclusive) to end (exclusive), do:
   *
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
   *
   * @param {string} previousKey  The key returned will always be later than this one.
   *
   * @returns {string | undefined} a key string, or undefined if we reach the end of the store
   *
   * @throws if previousKey is not a string
   */

  function getNextKey(previousKey) {
    typeof previousKey === 'string' || Fail`previousKey must be a string`;
    return sqlKVGetNextKey.get(previousKey);
  }

  /**
   * Test if the state contains a value for a given key.
   *
   * @param {string} key  The key that is of interest.
   *
   * @returns {boolean} true if a value is stored for the key, false if not.
   *
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
   * Store a value for a given key.  The value will replace any prior value if
   * there was one.
   *
   * @param {string} key  The key whose value is being set.
   * @param {string} value  The value to set the key to.
   *
   * @throws if either parameter is not a string.
   */
  function set(key, value) {
    typeof key === 'string' || Fail`key must be a string`;
    typeof value === 'string' || Fail`value must be a string`;
    // synchronous read after write within a transaction is safe
    // The transaction's overall success will be awaited during commit
    ensureTxn();
    sqlKVSet.run(key, value);
    trace('set', key, value);
  }

  const sqlKVDel = db.prepare(`
    DELETE FROM kvStore
    WHERE key = ?
  `);

  /**
   * Remove any stored value for a given key.  It is permissible for there to
   * be no existing stored value for the key.
   *
   * @param {string} key  The key whose value is to be deleted
   *
   * @throws if key is not a string.
   */
  function del(key) {
    typeof key === 'string' || Fail`key must be a string`;
    ensureTxn();
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
