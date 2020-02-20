import fs from 'fs';

import lmdb from 'node-lmdb';

/**
 * Create a swingset store instance backed by an LMDB database.
 *
 * @param dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 * @param forceReset  If true, initialize the database to an empty state
 *
 * @return an object: {
 *   storage, // a storage API object to load and store data
 *   commit,  // a function to commit changes made since the last commit
 *   close    // a function to shutdown the store, abandoning any uncommitted changes
 * }
 */
export function makeSwingStore(dirPath, forceReset = false) {
  let txn = null;

  if (forceReset) {
    fs.rmdirSync(dirPath, { recursive: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });

  let lmdbEnv = new lmdb.Env();
  lmdbEnv.open({
    path: dirPath,
    mapSize: 2 * 1024 * 1024 * 1024, // XXX need to tune this
  });

  let dbi = lmdbEnv.openDbi({
    name: 'swingset-kernel-state',
    create: true,
  });

  function ensureTxn() {
    if (!txn) {
      txn = lmdbEnv.beginTxn();
    }
  }

  /**
   * Obtain the value stored for a given key.
   *
   * @param key  The key whose value is sought.
   *
   * @return the (string) value for the given key, or undefined if there is no
   *    such value.
   *
   * @throws if key is not a string.
   */
  function get(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    ensureTxn();
    let result = txn.getString(dbi, key);
    if (result === null) {
      result = undefined;
    }
    return result;
  }

  /**
   * Generator function that returns an iterator over all the keys within a
   * given range.  Note that this can be slow as it's only intended for use in
   * debugging.
   *
   * @param start  Start of the key range of interest (inclusive).  An empty
   *    string indicates a range from the beginning of the key set.
   * @param end  End of the key range of interest (exclusive).  An empty string
   *    indicates a range through the end of the key set.
   *
   * @return an iterator for the keys from start <= key < end
   *
   * @throws if either parameter is not a string.
   */
  function* getKeys(start, end) {
    if (`${start}` !== start) {
      throw new Error(`non-string start ${start}`);
    }
    if (`${end}` !== end) {
      throw new Error(`non-string end ${end}`);
    }

    ensureTxn();
    const cursor = new lmdb.Cursor(txn, dbi);
    let key = start === '' ? cursor.goToFirst() : cursor.goToRange(start);
    while (key && (end === '' || key < end)) {
      yield key;
      key = cursor.goToNext();
    }
    cursor.close();
  }

  /**
   * Test if the state contains a value for a given key.
   *
   * @param key  The key that is of interest.
   *
   * @return true if a value is stored for the key, false if not.
   *
   * @throws if key is not a string.
   */
  function has(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    return get(key) !== undefined;
  }

  /**
   * Store a value for a given key.  The value will replace any prior value if
   * there was one.
   *
   * @param key  The key whose value is being set.
   * @param value  The value to set the key to.
   *
   * @throws if either parameter is not a string.
   */
  function set(key, value) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    if (`${value}` !== value) {
      throw new Error(`non-string value ${value}`);
    }
    ensureTxn();
    txn.putString(dbi, key, value);
  }

  /**
   * Remove any stored value for a given key.  It is permissible for there to
   * be no existing stored value for the key.
   *
   * @param key  The key whose value is to be deleted
   *
   * @throws if key is not a string.
   */
  function del(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    if (has(key)) {
      ensureTxn();
      txn.del(dbi, key);
    }
  }

  const storage = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  /**
   * Commit unsaved changes.
   */
  function commit() {
    if (txn) {
      txn.commit();
      txn = null;
    }
  }

  /**
   * Close the database, abandoning any changes made since the last commit (if you want to save them, call
   * commit() first).
   */
  function close() {
    if (txn) {
      txn.abort();
      txn = null;
    }
    dbi.close();
    dbi = null;
    lmdbEnv.close();
    lmdbEnv = null;
  }

  return { storage, commit, close };
}
