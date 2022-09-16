// @ts-check
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { tmpName } from 'tmp';

import { open as lmdbOpen, ABORT as lmdbAbort } from 'lmdb';
import sqlite3 from 'better-sqlite3';

import { assert } from '@agoric/assert';
import { makeMeasureSeconds } from '@agoric/internal';

import { sqlStreamStore } from './sqlStreamStore.js';
import { makeSnapStore } from './snapStore.js';
import { initEphemeralSwingStore } from './ephemeralSwingStore.js';

export const DEFAULT_LMDB_MAP_SIZE = 2 * 1024 * 1024 * 1024;

export { makeSnapStore };

export function makeSnapStoreIO() {
  return {
    createReadStream: fs.createReadStream,
    createWriteStream: fs.createWriteStream,
    measureSeconds: makeMeasureSeconds(performance.now),
    open: fs.promises.open,
    rename: fs.promises.rename,
    resolve: path.resolve,
    stat: fs.promises.stat,
    tmpName,
    unlink: fs.promises.unlink,
  };
}

/**
 * @typedef {{
 *   has: (key: string) => boolean,
 *   getKeys: (start: string, end: string) => IterableIterator<string>,
 *   get: (key: string) => string | undefined,
 *   set: (key: string, value: string) => void,
 *   delete: (key: string) => void,
 * }} KVStore
 *
 * @typedef { import('./snapStore').SnapStore } SnapStore
 *
 * @typedef { import('./snapStore').SnapshotInfo } SnapshotInfo
 *
 * @typedef {{ itemCount: number }} StreamPosition
 *
 * @typedef {{
 *   writeStreamItem: (streamName: string, item: string, position: StreamPosition) => StreamPosition,
 *   readStream: (streamName: string, startPosition: StreamPosition, endPosition: StreamPosition) => IterableIterator<string>,
 *   closeStream: (streamName: string) => void,
 *   STREAM_START: StreamPosition,
 * }} StreamStore
 *
 * @typedef {{
 *   kvStore: KVStore, // a key-value StorageAPI object to load and store data
 *   streamStore: StreamStore, // a stream-oriented API object to append and read streams of data
 *   commit: () => Promise<void>,  // commit changes made since the last commit
 *   close: () => Promise<void>,   // shutdown the store, abandoning any uncommitted changes
 *   diskUsage?: () => number, // optional stats method
 * }} SwingStore
 *
 * @typedef {SwingStore & { snapStore: ReturnType<typeof makeSnapStore> }} SwingAndSnapStore
 */

/**
 * A swing store holds the state of a swingset instance.  This "store" is
 * actually several different stores of different types that travel as a flock
 * and are managed according to a shared transactional model.  Each component
 * store serves a different purpose and satisfies a different set of access
 * constraints and access patterns.  The individual stores, each with its own
 * API, are available from the object that `makeSwingStore` returns:
 *
 * kvStore - a key-value store used to hold the kernel's working state.  Keys
 *   and values are both strings.  Provides random access to a large number of
 *   mostly small data items.  Persistently stored in an LMDB database.
 *
 * streamStore - a streaming store used to hold kernel transcripts.  Transcripts
 *   are both written and read (if they are read at all) sequentially, according
 *   to metadata kept in the kvStore.  Persistently stored in a slqLite
 *   database.
 *
 * snapStore - large object store used to hold XS memory image snapshots of
 *   vats.  Objects are stored in files named by the cryptographic hash of the
 *   data they hold, with tracking metadata kep in the kvStore.
 *
 * All persistent data is kept within a single directory belonging to the swing
 * store.  The individual stores present individual APIs suitable for their
 * intended uses, but we bundle them all here so that we can isolate a lot of
 * implementation dependencies.  In particular, we think it not unlikely that
 * additional types of stores may need to be added or that the storage
 * substrates used for one or more of these may change (or be consolidated) as
 * our implementation evolves.
 *
 * The units of data consistency in the swingset are the crank and the block.  A
 * crank is the execution of a single delivery into the swingset, typically a
 * message delivered to a vat.  A block is a series of cranks (how many is a
 * host-determined parameter) that are considered to either all happen as a
 * unit.  Crank-to-crank trnsactionality is managed by the crank buffer, a
 * kernel abstraction that wraps the kvStore.  Block-to-block transactionality
 * is provided by the swing store directly.  It provides a 'commit' operation
 * which will commit all changes made up to the time it is called.  It is the
 * responsibility of the kvStore to maintain a consistent view of what is going
 * on in the streamStore and snapStore.
 */

/**
 * Do the work of `initSwingStore` and `openSwingStore`.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 * @param {boolean} forceReset  If true, initialize the database to an empty state
 * @param {object} options  Configuration options
 *
 * @returns {SwingAndSnapStore}
 */
function makeSwingStore(dirPath, forceReset, options) {
  /** @type {((result?: typeof import("lmdb").ABORT) => void) | null} */
  let txnFinish = null;

  /** @type {Promise<typeof import("lmdb").ABORT | void> | null} */
  let txnDone = null;

  if (forceReset) {
    try {
      // Node.js 16.8.0 warns:
      // In future versions of Node.js, fs.rmdir(path, { recursive: true }) will
      // be removed. Use fs.rm(path, { recursive: true }) instead
      if (fs.rmSync) {
        fs.rmSync(dirPath, { recursive: true });
      } else {
        fs.rmdirSync(dirPath, { recursive: true });
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }
  fs.mkdirSync(dirPath, { recursive: true });

  const { mapSize = DEFAULT_LMDB_MAP_SIZE, traceFile, keepSnapshots } = options;

  let traceOutput = traceFile
    ? fs.createWriteStream(path.resolve(traceFile), {
        flags: 'a',
      })
    : null;

  function trace(...args) {
    if (!traceOutput) return;

    traceOutput.write(args.join(' '));
    traceOutput.write('\n');
  }
  function stopTrace() {
    traceOutput && traceOutput.end();
    traceOutput = null;
  }

  /** @type {import('lmdb').RootDatabase<string, string> | null} */
  let db = lmdbOpen({
    path: dirPath,
    // TODO: mapSize seem to be ignored / treated as informative by lmbd-js
    mapSize,
    // Turn off useWritemap. It can theoretically cause corruption by stray
    // pointers, it seems incompatible with our usage of sync transactions.
    // While we've checked it wasn't the (sole) cause of
    // https://github.com/Agoric/agoric-sdk/issues/5031, it is no longer
    // necessary if using WSL2 on Windows.
    useWritemap: false,
    name: 'swingset-kernel-state',
    // TODO: lmdb-js is using a UTF-8 encoding for strings (both keys and values)
    // The biggest impact is on key sizes. A key with unicode points in the range
    // 0x0800 - 0xFFFF ends up encoded as 3 bytes where for UTF-16 they'd be
    // encoded as 2 bytes. lmbd-js also bumps the maxKeySize to 1791 bytes,
    // making this a non-issue for now.
    encoding: 'string',
  });

  function ensureTxn() {
    assert(db);
    if (!txnDone && !txnFinish) {
      trace('begin-tx');
      txnDone = db.transactionSync(
        () =>
          new Promise(resolve => {
            txnFinish = resolve;
          }),
      );
    }
    assert(txnDone && txnFinish);
    return db;
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
    let result = ensureTxn().get(key);
    if (result == null) {
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

    /** @type {import("lmdb").RangeOptions} */
    const rangeOptions = {};
    if (start) {
      rangeOptions.start = start;
    }
    if (end) {
      rangeOptions.end = end;
    }

    const keys = ensureTxn().getKeys(rangeOptions);

    yield* keys;
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
    // synchronous read after write within a transaction is safe
    // The transaction's overall success will be awaited during commit
    void ensureTxn().put(key, value);
    trace('set', key, value);
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
      // synchronous read after write within a transaction is safe
      // The transaction's overall success will be awaited during commit
      void ensureTxn().remove(key);
      trace('del', key);
    }
  }

  const kvStore = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  const {
    commit: commitStreamStore,
    close: closeStreamStore,
    ...streamStore
  } = sqlStreamStore(dirPath, { sqlite3 });

  const snapshotDir = path.resolve(dirPath, 'xs-snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });
  const snapStore = makeSnapStore(snapshotDir, makeSnapStoreIO(), {
    keepSnapshots,
  });

  /** @param {boolean} [abort] */
  function doCommit(abort) {
    if (!txnFinish) {
      return undefined;
    }
    txnFinish(abort ? lmdbAbort : undefined);
    return Promise.resolve(txnDone)
      .then(() => {
        trace(`${abort ? 'abort' : 'commit'}-tx`);
      })
      .finally(() => {
        txnDone = null;
        txnFinish = null;
      });
  }

  /**
   * Commit unsaved changes.
   */
  async function commit() {
    assert(db);
    // Commit the stream-store first, before kvStore. We keep the
    // streams' startPos/endPos in the kvStore, so if we crash after
    // commitStreamStore() but before the kvstore doCommit(), we'll
    // wake up with the old startPos/endPos and it's (mostly) as if
    // the stream entry was never added.
    commitStreamStore();
    await doCommit(false);

    // NOTE: The kvstore (which used to contain vatA -> snapshot1, and
    //   is being replaced with vatA -> snapshot2)
    //   MUST be committed BEFORE we delete snapshot1.
    //   Otherwise, on restart, we'll consult the kvstore and see snapshot1,
    //   but we'll fail to load it because it's been deleted already.
    await snapStore.commitDeletes();
  }

  /**
   * Close the database, abandoning any changes made since the last commit (if you want to save them, call
   * commit() first).
   */
  async function close() {
    assert(db);
    closeStreamStore();
    await doCommit(true);
    await db.close();
    db = null;
    stopTrace();
  }

  return harden({ kvStore, streamStore, snapStore, commit, close, diskUsage });
}

/**
 * Create a new swingset store.  If given a directory path string, a persistent
 * store will be created in that directory; if there is already a store there,
 * it will be reinitialized to an empty state.  If the path is null or
 * undefined, a memory-only ephemeral store will be created that will evaporate
 * on program exit.
 *
 * @param {string|null} dirPath  Path to a directory in which database files may
 *   be kept.  This directory need not actually exist yet (if it doesn't it will
 *   be created) but it is reserved (by the caller) for the exclusive use of
 *   this swing store instance.  If null, an ephemeral store will be created.
 * @param {object?} options  Optional configuration options
 *
 * @returns {SwingStore}
 */
export function initSwingStore(dirPath, options = {}) {
  if (!dirPath) {
    return initEphemeralSwingStore();
  } else {
    assert.typeof(dirPath, 'string');
    return makeSwingStore(dirPath, true, options);
  }
}

/**
 * Open a persistent swingset store.  If there is no existing store at the given
 * `dirPath`, a new, empty store will be created.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 * @param {object?} options  Optional configuration options
 *
 * @returns {SwingAndSnapStore}
 */
export function openSwingStore(dirPath, options = {}) {
  assert.typeof(dirPath, 'string');
  return makeSwingStore(dirPath, false, options);
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
  assert.typeof(dirPath, 'string');
  if (fs.existsSync(dirPath)) {
    const storeFile = path.resolve(dirPath, 'data.mdb');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}

export { getAllState, setAllState } from './ephemeralSwingStore.js';
