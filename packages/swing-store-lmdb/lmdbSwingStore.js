import fs from 'fs';
import os from 'os';
import path from 'path';

import lmdb from 'node-lmdb';

const { details: X } = assert;

/**
 * Do the work of `initSwingStore` and `openSwingStore`.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 * @param {boolean} forceReset  If true, initialize the database to an empty state
 *
 * returns an object: {
 *   storage, // a storage API object to load and store data
 *   commit,  // a function to commit changes made since the last commit
 *   close    // a function to shutdown the store, abandoning any uncommitted changes
 * }
 */
function makeSwingStore(dirPath, forceReset = false) {
  let txn = null;

  if (forceReset) {
    fs.rmdirSync(dirPath, { recursive: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });

  let lmdbEnv = new lmdb.Env();
  lmdbEnv.open({
    path: dirPath,
    mapSize: 2 * 1024 * 1024 * 1024, // XXX need to tune this
    // Turn off useWritemap on the Mac.  The userWritemap option is currently
    // required for LMDB to function correctly on Linux running under WSL, but
    // we don't yet have a convenient recipe to probe our environment at
    // runtime to distinguish that species of Linux from the others.  For now
    // we're running our benchmarks on Mac, so this will do for the time being.
    useWritemap: os.platform() !== 'darwin',
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

  function diskUsage() {
    const dataFilePath = `${dirPath}/data.mdb`;
    const stat = fs.statSync(dataFilePath);
    return stat.size;
  }

  /**
   * Obtain the value stored for a given key.
   *
   * @param {string} key  The key whose value is sought.
   *
   * @returns {string | undefined} the (string) value for the given key, or undefined if there is no
   *    such value.
   *
   * @throws if key is not a string.
   */
  function get(key) {
    assert.typeof(key, 'string', X`non-string key ${key}`);
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
   * @param {string} start  Start of the key range of interest (inclusive).  An empty
   *    string indicates a range from the beginning of the key set.
   * @param {string} end  End of the key range of interest (exclusive).  An empty string
   *    indicates a range through the end of the key set.
   *
   * @yields an iterator for the keys from start <= key < end
   *
   * @throws if either parameter is not a string.
   */
  function* getKeys(start, end) {
    assert.typeof(start, 'string', X`non-string start ${start}`);
    assert.typeof(end, 'string', X`non-string end ${end}`);

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
   * @param {string} key  The key that is of interest.
   *
   * @returns {boolean} true if a value is stored for the key, false if not.
   *
   * @throws if key is not a string.
   */
  function has(key) {
    assert.typeof(key, 'string', X`non-string key ${key}`);
    return get(key) !== undefined;
  }

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
    assert.typeof(key, 'string', X`non-string key ${key}`);
    assert.typeof(value, 'string', X`non-string value ${value}`);
    ensureTxn();
    txn.putString(dbi, key, value);
  }

  /**
   * Remove any stored value for a given key.  It is permissible for there to
   * be no existing stored value for the key.
   *
   * @param {string} key  The key whose value is to be deleted
   *
   * @throws if key is not a string.
   */
  function del(key) {
    assert.typeof(key, 'string', X`non-string key ${key}`);
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

  return { storage, commit, close, diskUsage };
}

/**
 * Create a swingset store backed by an LMDB database.  If there is an existing
 * store at the given `dirPath`, it will be reinitialized to an empty state.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 *
 * returns an object: {
 *   storage, // a storage API object to load and store data
 *   commit,  // a function to commit changes made since the last commit
 *   close    // a function to shutdown the store, abandoning any uncommitted
 *            // changes
 * }
 */
export function initSwingStore(dirPath) {
  if (`${dirPath}` !== dirPath) {
    throw new Error('dirPath must be a string');
  }
  return makeSwingStore(dirPath, true);
}

/**
 * Open a swingset store backed by an LMDB database.  If there is no existing
 * store at the given `dirPath`, a new, empty store will be created.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 *
 * returns an object: {
 *   storage, // a storage API object to load and store data
 *   commit,  // a function to commit changes made since the last commit
 *   close    // a function to shutdown the store, abandoning any uncommitted
 *            // changes
 * }
 */
export function openSwingStore(dirPath) {
  if (`${dirPath}` !== dirPath) {
    throw new Error('dirPath must be a string');
  }
  return makeSwingStore(dirPath, false);
}

/**
 * Is this directory a compatible swing store?
 *
 * @param {string} dirPath  Path to a directory in which database files might be present.
 *   This directory need not actually exist
 *
 * @returns {boolean}
 *   If the directory is present and contains the files created by initSwingStore
 *   or openSwingStore, returns true. Else returns false.
 *
 */
export function isSwingStore(dirPath) {
  if (`${dirPath}` !== dirPath) {
    throw new Error('dirPath must be a string');
  }
  if (fs.existsSync(dirPath)) {
    const storeFile = path.resolve(dirPath, 'data.mdb');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
