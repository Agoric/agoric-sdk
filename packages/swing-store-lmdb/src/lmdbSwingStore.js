// @ts-check
import fs from 'fs';
import os from 'os';
import path from 'path';
import { tmpName } from 'tmp';

import lmdb from 'node-lmdb';
import sqlite3 from 'better-sqlite3';

import { assert } from '@agoric/assert';

import { sqlStreamStore } from './sqlStreamStore.js';
import { makeSnapStore } from './snapStore.js';

export { makeSnapStore };

export function makeSnapStoreIO() {
  return {
    tmpName,
    existsSync: fs.existsSync,
    createReadStream: fs.createReadStream,
    createWriteStream: fs.createWriteStream,
    rename: fs.promises.rename,
    unlink: fs.promises.unlink,
    resolve: path.resolve,
  };
}

/**
 * @typedef { import('@agoric/swing-store-simple').KVStore } KVStore
 * @typedef { import('./sqlStreamStore.js').StreamPosition } StreamPosition
 * @typedef { import('@agoric/swing-store-simple').StreamStore } StreamStore
 * @typedef { import('@agoric/swing-store-simple').SwingStore } SwingStore
 */

/**
 * Do the work of `initLMDBSwingStore` and `openLMDBSwingStore`.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 * @param {boolean} forceReset  If true, initialize the database to an empty state
 * @param {Object} options  Configuration options
 *
 * @returns {SwingStore}
 */
function makeLMDBSwingStore(dirPath, forceReset, options) {
  let txn = null;

  if (forceReset) {
    fs.rmdirSync(dirPath, { recursive: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });

  const { mapSize = 2 * 1024 * 1024 * 1024 } = options;
  let lmdbEnv = new lmdb.Env();
  lmdbEnv.open({
    path: dirPath,
    mapSize,
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
    assert.typeof(key, 'string');
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
   * @yields {string} an iterator for the keys from start <= key < end
   *
   * @throws if either parameter is not a string.
   */
  function* getKeys(start, end) {
    assert.typeof(start, 'string');
    assert.typeof(end, 'string');

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
    assert.typeof(key, 'string');
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
    assert.typeof(key, 'string');
    assert.typeof(value, 'string');
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
    assert.typeof(key, 'string');
    if (has(key)) {
      ensureTxn();
      txn.del(dbi, key);
    }
  }

  const kvStore = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  const streamStore = sqlStreamStore(dirPath, { sqlite3 });
  const snapshotDir = path.resolve(dirPath, 'xs-snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });
  const snapStore = makeSnapStore(snapshotDir, makeSnapStoreIO());

  /**
   * Commit unsaved changes.
   */
  function commit() {
    if (txn) {
      txn.commit();
      txn = null;
    }
    snapStore.commitDeletes();
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

  return harden({ kvStore, streamStore, snapStore, commit, close, diskUsage });
}

/**
 * Create a swingset store backed by an LMDB database.  If there is an existing
 * store at the given `dirPath`, it will be reinitialized to an empty state.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 * @param {Object?} options  Optional configuration options
 *
 * @returns {SwingStore}
 */
export function initLMDBSwingStore(dirPath, options = {}) {
  assert.typeof(dirPath, 'string');
  return makeLMDBSwingStore(dirPath, true, options);
}

/**
 * Open a swingset store backed by an LMDB database.  If there is no existing
 * store at the given `dirPath`, a new, empty store will be created.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 * @param {Object?} options  Optional configuration options
 *
 * @returns {SwingStore}
 */
export function openLMDBSwingStore(dirPath, options = {}) {
  assert.typeof(dirPath, 'string');
  return makeLMDBSwingStore(dirPath, false, options);
}

/**
 * Is this directory a compatible swing store?
 *
 * @param {string} dirPath  Path to a directory in which database files might be present.
 *   This directory need not actually exist
 *
 * @returns {boolean}
 *   If the directory is present and contains the files created by initLMDBSwingStore
 *   or openLMDBSwingStore, returns true. Else returns false.
 *
 */
export function isSwingStore(dirPath) {
  assert.typeof(dirPath, 'string');
  if (fs.existsSync(dirPath)) {
    const storeFile = path.resolve(dirPath, 'data.mdb');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
