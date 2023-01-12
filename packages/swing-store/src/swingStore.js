// @ts-check
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { file as tmpFile, tmpName } from 'tmp';

import sqlite3 from 'better-sqlite3';

import { assert } from '@agoric/assert';
import { makeMeasureSeconds } from '@agoric/internal';

import { makeStreamStore } from './streamStore.js';
import { makeSnapStore } from './snapStore.js';
import { createSHA256 } from './hasher.js';

export { makeSnapStore };

export function makeSnapStoreIO() {
  return {
    createReadStream: fs.createReadStream,
    createWriteStream: fs.createWriteStream,
    measureSeconds: makeMeasureSeconds(performance.now),
    open: fs.promises.open,
    stat: fs.promises.stat,
    tmpFile,
    tmpName,
    unlink: fs.promises.unlink,
  };
}

/**
 * @typedef {{
 *   has: (key: string) => boolean,
 *   getKeys: (start: string, end: string) => IterableIterator<string>,
 *   get: (key: string) => string | undefined,
 *   set: (key: string, value: string, bypassHash?: boolean ) => void,
 *   delete: (key: string) => void,
 * }} KVStore
 *
 * @typedef { import('./snapStore').SnapStore } SnapStore
 *
 * @typedef { import('./snapStore').SnapshotResult } SnapshotResult
 *
 * @typedef { number } StreamPosition
 *
 * @typedef {{
 *   writeStreamItem: (streamName: string, item: string, position: StreamPosition) => StreamPosition,
 *   readStream: (streamName: string, startPosition: StreamPosition, endPosition: StreamPosition) => IterableIterator<string>,
 *   closeStream: (streamName: string) => void,
 *   dumpStreams: () => any,
 *   STREAM_START: StreamPosition,
 * }} StreamStore
 *
 * @typedef {{
 *   kvStore: KVStore, // a key-value StorageAPI object to load and store data on behalf of the kernel
 *   streamStore: StreamStore, // a stream-oriented API object to append and read streams of data
 *   snapStore?: SnapStore,
 *   startCrank: () => void,
 *   establishCrankSavepoint: (savepoint: string) => void,
 *   rollbackCrank: (savepoint: string) => void,
 *   emitCrankHashes: () => { crankhash: string, activityhash: string },
 *   endCrank: () => void,
 *   getActivityhash: () => string,
 * }} SwingStoreKernelStorage
 *
 * @typedef {{
 *   kvStore: KVStore, // a key-value StorageAPI object to load and store data on behalf of the host
 *   commit: () => Promise<void>,  // commit changes made since the last commit
 *   close: () => Promise<void>,   // shutdown the store, abandoning any uncommitted changes
 *   diskUsage?: () => number, // optional stats method
 * }} SwingStoreHostStorage
 *
 * @typedef {{
 *  kernelStorage: SwingStoreKernelStorage,
 *  hostStorage: SwingStoreHostStorage,
 * }} SwingStore
 */

/**
 * A swing store holds the state of a swingset instance.  This "store" is
 * actually several different stores of different types that travel as a flock
 * and are managed according to a shared transactional model.  Each component
 * store serves a different purpose and satisfies a different set of access
 * constraints and access patterns.
 *
 * The individual stores are:
 *
 * kvStore - a key-value store used to hold the kernel's working state.  Keys
 *   and values are both strings.  Provides random access to a large number of
 *   mostly small data items.  Persistently stored in a sqlite table.
 *
 * streamStore - a streaming store used to hold kernel transcripts.  Transcripts
 *   are both written and read (if they are read at all) sequentially, according
 *   to metadata kept in the kvStore.  Persistently stored in a sqllite table.
 *
 * snapStore - large object store used to hold XS memory image snapshots of
 *   vats.  Objects are stored in files named by the cryptographic hash of the
 *   data they hold, with tracking metadata kept in the kvStore.
 *
 * All persistent data is kept within a single directory belonging to the swing
 * store.  The individual stores present individual APIs suitable for their
 * intended uses, but we bundle them all here so that we can isolate a lot of
 * implementation dependencies.  In particular, we think it not unlikely that
 * additional types of stores may need to be added or that the storage
 * substrates used for one or more of these may change (or be consolidated) as
 * our implementation evolves.
 *
 * In addition, the operational affordances of these stores are collectively
 * separated into two facets, one for use by the host application and the other
 * for use by the swingset kernel itself, represented by the `hostStorage` and
 * `kernelStorage` properties of the object that `makeSwingStore` returns.
 *
 * The units of data consistency in the swingset are the crank and the block.  A
 * crank is the execution of a single delivery into the swingset, typically a
 * message delivered to a vat.  A block is a series of cranks (how many is a
 * host-determined parameter) that are considered to either all happen or not as
 * a unit.  Crank-to-crank transactionality is managed via the kernel facet,
 * while block-to-block transactionality is managed by the host facet.  Each
 * facet provides commit and abort operations that commit or abort all changes
 * relative the relevant transactional unit.
 */

/**
 * Do the work of `initSwingStore` and `openSwingStore`.
 *
 * @param {string|null} dirPath  Path to a directory in which database files may
 *   be kept.  If this is null, the database will be an in-memory ephemeral
 *   database that evaporates when the process exits, which is useful for testing.
 * @param {boolean} forceReset  If true, initialize the database to an empty
 *   state if it already exists
 * @param {object} options  Configuration options
 *
 * @returns {SwingStore}
 */
function makeSwingStore(dirPath, forceReset, options) {
  let crankhasher;
  function resetCrankhash() {
    crankhasher = createSHA256();
  }
  resetCrankhash();

  let filePath;
  if (dirPath) {
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
        // Attempting to delete a non-existent directory is allowed
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    }
    fs.mkdirSync(dirPath, { recursive: true });
    filePath = path.join(dirPath, 'swingstore.sqlite');
  } else {
    filePath = ':memory:';
  }

  const { traceFile, keepSnapshots } = options;

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

  /** @type {*} */
  let db = sqlite3(
    filePath,
    // { verbose: console.log },
  );
  db.exec(`PRAGMA journal_mode=WAL`);
  db.exec(`PRAGMA synchronous=FULL`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kvStore (
      key TEXT,
      value TEXT,
      PRIMARY KEY (key)
    )
  `);

  const sqlBeginTransaction = db.prepare('BEGIN IMMEDIATE TRANSACTION');
  let inCrank = false;

  // We use explicit transactions to 1: not commit writes until the host
  // application calls commit() and 2: avoid expensive fsyncs until the
  // appropriate commit point. All API methods should call this first, otherwise
  // SQLite will automatically start a transaction for us, but it will
  // commit/fsync at the end of the DB run(). We use IMMEDIATE because the
  // kernel is supposed to be the sole writer of the DB, and if some other
  // process is holding a write lock, we want to find out earlier rather than
  // later. We do not use EXCLUSIVE because we should allow external *readers*,
  // and we might decide to use WAL mode some day. Read all of
  // https://sqlite.org/lang_transaction.html, especially section 2.2
  //
  // It is critical to call ensureTxn as the first step of any API call that
  // might modify the database (any INSERT or DELETE, etc), to prevent SQLite
  // from creating an automatic transaction, which will commit as soon as the
  // SQL statement finishes. This would cause partial writes to be committed to
  // the DB, and if the application crashes before the real hostStorage.commit()
  // happens, it would wake up with inconsistent state. The only commit point
  // must be the hostStorage.commit().
  function ensureTxn() {
    assert(db);
    if (!db.inTransaction) {
      sqlBeginTransaction.run();
      assert(db.inTransaction);
    }
    return db;
  }

  /**
   * @param {string} key
   */
  function getKeyType(key) {
    if (key.startsWith('local.')) {
      return 'local';
    } else if (key.startsWith('host.')) {
      return 'host';
    }
    return 'consensus';
  }

  function diskUsage() {
    if (dirPath) {
      const dataFilePath = `${dirPath}/swingstore.sqlite`;
      const stat = fs.statSync(dataFilePath);
      return stat.size;
    } else {
      return 0;
    }
  }

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
    assert.typeof(key, 'string');
    return sqlKVGet.get(key);
  }

  const sqlKVGetKeys = db.prepare(`
    SELECT key
    FROM kvStore
    WHERE ? <= key AND key < ?
  `);
  sqlKVGetKeys.pluck(true);

  const sqlKVGetKeysNoEnd = db.prepare(`
    SELECT key
    FROM kvStore
    WHERE ? <= key
  `);
  sqlKVGetKeysNoEnd.pluck(true);

  /**
   * Generator function that returns an iterator over all the keys within a
   * given range.
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

    let keys;
    if (end) {
      keys = sqlKVGetKeys.all(start, end);
    } else {
      keys = sqlKVGetKeysNoEnd.all(start);
    }

    yield* keys.values();
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
    assert.typeof(key, 'string');
    assert.typeof(value, 'string');
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
    assert.typeof(key, 'string');
    ensureTxn();
    sqlKVDel.run(key);
    trace('del', key);
  }

  const kvStore = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  const kernelKVStore = {
    ...kvStore,
    set(key, value, bypassHash) {
      assert.typeof(key, 'string');
      const keyType = getKeyType(key);
      assert(keyType !== 'host');
      set(key, value);
      if (keyType === 'consensus' && !bypassHash) {
        crankhasher.add('add');
        crankhasher.add('\n');
        crankhasher.add(key);
        crankhasher.add('\n');
        crankhasher.add(value);
        crankhasher.add('\n');
      }
    },
    delete(key) {
      assert.typeof(key, 'string');
      const keyType = getKeyType(key);
      assert(keyType !== 'host');
      del(key);
      if (keyType === 'consensus') {
        crankhasher.add('delete');
        crankhasher.add('\n');
        crankhasher.add(key);
        crankhasher.add('\n');
      }
    },
  };

  const hostKVStore = {
    ...kvStore,
    set(key, value) {
      const keyType = getKeyType(key);
      assert(keyType === 'host');
      set(key, value);
    },
    delete(key) {
      const keyType = getKeyType(key);
      assert(keyType === 'host');
      del(key);
    },
  };

  const streamStore = makeStreamStore(db, ensureTxn);
  let snapStore;

  if (dirPath) {
    snapStore = makeSnapStore(db, makeSnapStoreIO(), {
      keepSnapshots,
    });
  }

  const savepoints = [];
  const sqlReleaseSavepoints = db.prepare('RELEASE SAVEPOINT t0');

  function startCrank() {
    assert(!inCrank);
    inCrank = true;
    resetCrankhash();
  }

  function establishCrankSavepoint(savepoint) {
    assert(inCrank);
    const savepointOrdinal = savepoints.length;
    savepoints.push(savepoint);
    const sql = db.prepare(`SAVEPOINT t${savepointOrdinal}`);
    sql.run();
  }

  function rollbackCrank(savepoint) {
    assert(inCrank);
    for (const savepointOrdinal of savepoints.keys()) {
      if (savepoints[savepointOrdinal] === savepoint) {
        const sql = db.prepare(`ROLLBACK TO SAVEPOINT t${savepointOrdinal}`);
        sql.run();
        savepoints.length = savepointOrdinal;
        return;
      }
    }
    assert.fail(`no such savepoint as "${savepoint}"`);
  }

  function emitCrankHashes() {
    // Calculate the resulting crankhash and reset for the next round.
    const crankhash = crankhasher.finish();
    resetCrankhash();

    // Get the old activityhash
    let oldActivityhash = get('activityhash');
    if (oldActivityhash === undefined) {
      oldActivityhash = '';
    }

    // Digest the old activityhash and new crankhash into the new activityhash.
    const hasher = createSHA256();
    hasher.add('activityhash');
    hasher.add('\n');
    hasher.add(oldActivityhash);
    hasher.add('\n');
    hasher.add(crankhash);
    hasher.add('\n');

    // Store the new activityhash
    const activityhash = hasher.finish();
    set('activityhash', activityhash);

    return { crankhash, activityhash };
  }

  function getActivityhash() {
    return get('activityhash') || '';
  }

  function endCrank() {
    assert(inCrank);
    if (savepoints.length > 0) {
      sqlReleaseSavepoints.run();
      savepoints.length = 0;
    }
    inCrank = false;
  }

  const sqlCommit = db.prepare('COMMIT');
  const sqlCheckpoint = db.prepare('PRAGMA wal_checkpoint(FULL)');

  /**
   * Commit unsaved changes.
   */
  async function commit() {
    assert(db);
    if (db.inTransaction) {
      sqlCommit.run();
      sqlCheckpoint.run();
    }
  }

  /**
   * Close the database, abandoning any changes made since the last commit (if
   * you want to save them, call commit() first).
   */
  async function close() {
    assert(db);
    commit();
    db.close();
    db = null;
    stopTrace();
  }

  const kernelStorage = {
    kvStore: kernelKVStore,
    streamStore,
    snapStore,
    startCrank,
    establishCrankSavepoint,
    rollbackCrank,
    emitCrankHashes,
    endCrank,
    getActivityhash,
  };
  const hostStorage = {
    kvStore: hostKVStore,
    commit,
    close,
    diskUsage,
  };

  return harden({
    kernelStorage,
    hostStorage,
  });
}

/**
 * Create a new swingset store.  If given a directory path string, a persistent
 * store will be created in that directory; if there is already a store there,
 * it will be reinitialized to an empty state.  If the path is null or
 * undefined, a memory-only ephemeral store will be created that will evaporate
 * on program exit.
 *
 * @param {string|null} dirPath Path to a directory in which database files may
 *   be kept.  This directory need not actually exist yet (if it doesn't it will
 *   be created) but it is reserved (by the caller) for the exclusive use of
 *   this swing store instance.  If null, an ephemeral (memory only) store will
 *   be created.
 * @param {object?} options  Optional configuration options
 *
 * @returns {SwingStore}
 */
export function initSwingStore(dirPath = null, options = {}) {
  if (dirPath) {
    assert.typeof(dirPath, 'string');
  }
  return makeSwingStore(dirPath, true, options);
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
 * @returns {SwingStore}
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
 */
export function isSwingStore(dirPath) {
  assert.typeof(dirPath, 'string');
  if (fs.existsSync(dirPath)) {
    const storeFile = path.resolve(dirPath, 'swingstore.sqlite');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}

/**
 * Produce a representation of all the state found in a swing store.
 *
 * WARNING: This is a helper function intended for use in testing and debugging.
 * It extracts *everything*, and does so in the simplest and stupidest possible
 * way, hence it is likely to be a performance and memory hog if you attempt to
 * use it on anything real.
 *
 * @param {SwingStoreKernelStorage} kernelStorage  The swing store whose state is to be extracted.
 *
 * @returns {{
 *   kvStuff: Record<string, string>,
 *   streamStuff: Map<string, Array<string>>,
 * }}  A crude representation of all of the state of `kernelStorage`
 */
export function getAllState(kernelStorage) {
  const { kvStore, streamStore } = kernelStorage;
  /** @type { Record<string, string> } */
  const kvStuff = {};
  for (const key of Array.from(kvStore.getKeys('', ''))) {
    // @ts-expect-error get(key) of key from getKeys() is not undefined
    kvStuff[key] = kvStore.get(key);
  }
  const streamStuff = streamStore.dumpStreams();
  return { kvStuff, streamStuff };
}

/**
 * Stuff a bunch of state into a swing store.
 *
 * WARNING: This is intended to support testing and should not be used as a
 * general store initialization mechanism.  In particular, note that it does not
 * bother to remove any pre-existing state from the store that it is given.
 *
 * @param {SwingStoreKernelStorage} kernelStorage  The swing store whose state is to be set.
 * @param {{
 *   kvStuff: Record<string, string>,
 *   streamStuff: Map<string, Array<[number, *]>>,
 * }} stuff  The state to stuff into `kernelStorage`
 */
export function setAllState(kernelStorage, stuff) {
  const { kvStore, streamStore } = kernelStorage;
  const { kvStuff, streamStuff } = stuff;
  for (const k of Object.getOwnPropertyNames(kvStuff)) {
    kvStore.set(k, kvStuff[k], true);
  }
  for (const [streamName, stream] of streamStuff.entries()) {
    for (const [pos, item] of stream) {
      streamStore.writeStreamItem(streamName, item, pos);
    }
    streamStore.closeStream(streamName);
  }
}
