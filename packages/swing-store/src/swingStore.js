// @ts-check
/* eslint-env node */
import * as fs from 'fs';
import * as path from 'path';

import sqlite3 from 'better-sqlite3';

import { Fail, q } from '@endo/errors';

import { dbFileInDirectory } from './util.js';
import { makeKVStore, getKeyType } from './kvStore.js';
import { makeTranscriptStore } from './transcriptStore.js';
import { makeSnapStore } from './snapStore.js';
import { makeBundleStore } from './bundleStore.js';
import { createSHA256 } from './hasher.js';
import { makeSnapStoreIO } from './snapStoreIO.js';
import { doRepairMetadata } from './repairMetadata.js';

/**
 * @typedef { import('./kvStore.js').KVStore } KVStore
 *
 * @typedef { import('./snapStore.js').SnapStore } SnapStore
 * @typedef { import('./snapStore.js').SnapshotResult } SnapshotResult
 *
 * @typedef { import('./transcriptStore.js').TranscriptStore } TranscriptStore
 * @typedef { import('./transcriptStore.js').TranscriptStoreDebug } TranscriptStoreDebug
 *
 * @typedef { import('./bundleStore.js').BundleStore } BundleStore
 * @typedef { import('./bundleStore.js').BundleStoreDebug } BundleStoreDebug
 *
 * @typedef { import('./exporter.js').KVPair } KVPair
 *
 * @typedef {{
 *   kvStore: KVStore, // a key-value API object to load and store data on behalf of the kernel
 *   transcriptStore: TranscriptStore, // a stream-oriented API object to append and read transcript entries
 *   snapStore: SnapStore,
 *   bundleStore: BundleStore,
 *   startCrank: () => void,
 *   establishCrankSavepoint: (savepoint: string) => void,
 *   rollbackCrank: (savepoint: string) => void,
 *   emitCrankHashes: () => { crankhash: string, activityhash: string },
 *   endCrank: () => void,
 *   getActivityhash: () => string,
 * }} SwingStoreKernelStorage
 *
 * @typedef {{
 *   kvStore: KVStore, // a key-value API object to load and store data on behalf of the host
 *   commit: () => Promise<void>,  // commit changes made since the last commit
 *   close: () => Promise<void>,   // shutdown the store, abandoning any uncommitted changes
 *   diskUsage?: () => number, // optional stats method
 *   repairMetadata: (exporter: import('./exporter.js').SwingStoreExporter) => Promise<void>,
 * }} SwingStoreHostStorage
 */

/**
 * @typedef {{
 *   kvEntries: {},
 *   transcripts: {},
 *   snapshots: {},
 * }} SwingStoreDebugDump
 *
 * @typedef {{
 *   dump: (includeHistorical?: boolean) => SwingStoreDebugDump,
 *   serialize: () => Buffer,
 * }} SwingStoreDebugTools
 *
 * @typedef {{
 *  kernelStorage: SwingStoreKernelStorage,
 *  hostStorage: SwingStoreHostStorage,
 *  debug: SwingStoreDebugTools,
 *  internal: import('./internal.js').SwingStoreInternal,
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
 * transcriptStore - a streaming store used to hold kernel transcripts.  Transcripts
 *   are both written and read (if they are read at all) sequentially, according
 *   to metadata kept in the kvStore.  Persistently stored in a sqllite table.
 *
 * snapStore - large object store used to hold XS memory image snapshots of
 *   vats.  Objects are stored in a separate table keyed to the vat and delivery
 *   number of the snapshot, with tracking metadata kept in the kvStore.
 *
 * bundleStore - large object store used to hold JavaScript code bundles.
 *   Bundle contents are stored in a separate table keyed by bundleID.
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
export function makeSwingStore(dirPath, forceReset, options = {}) {
  const { serialized } = options;
  if (serialized) {
    Buffer.isBuffer(serialized) || Fail`options.serialized must be Buffer`;
    dirPath === null || Fail`options.serialized makes :memory: DB`;
  }
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
    filePath = dbFileInDirectory(dirPath);
  } else {
    filePath = ':memory:';
  }

  const {
    traceFile,
    keepSnapshots,
    keepTranscripts,
    archiveSnapshot,
    archiveTranscript,
  } = options;

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
    serialized || filePath,
    // { verbose: console.log },
  );

  // We use WAL (write-ahead log) mode to allow a background export process to
  // keep reading from an earlier DB state, while allowing execution to proceed
  // forward (writing new data that the exporter does not see). Once we're using
  // WAL mode, we need synchronous=FULL to obtain durability in the face of
  // power loss. We let SQLite perform a "checkpoint" (merging the WAL contents
  // back into the main DB file) automatically, using it's best-effort "PASSIVE"
  // mode that defers merge work for a later attempt rather than block any
  // potential readers or writers. See https://sqlite.org/wal.html for details.

  // However we also allow opening the DB with journaling off, which is unsafe
  // and doesn't support rollback, but avoids any overhead for large
  // transactions like for during an import.

  function setUnsafeFastMode(enabled) {
    const journalMode = enabled ? 'off' : 'wal';
    const synchronousMode = enabled ? 'normal' : 'full';
    !db.inTransaction || Fail`must not be in a transaction`;

    db.unsafeMode(!!enabled);
    // The WAL mode is persistent so it's not possible to switch to a different
    // mode for an existing DB.
    const actualMode = db.pragma(`journal_mode=${journalMode}`, {
      simple: true,
    });
    actualMode === journalMode ||
      filePath === ':memory:' ||
      Fail`Couldn't set swing-store DB to ${journalMode} mode (is ${actualMode})`;
    db.pragma(`synchronous=${synchronousMode}`);
  }

  // PRAGMAs have to happen outside a transaction
  setUnsafeFastMode(options.unsafeFastMode);

  // We use IMMEDIATE because the kernel is supposed to be the sole writer of
  // the DB, and if some other process is holding a write lock, we want to find
  // out earlier rather than later. We do not use EXCLUSIVE because we should
  // allow external *readers*, and we use WAL mode. Read all of
  // https://sqlite.org/lang_transaction.html, especially section 2.2
  const sqlBeginTransaction = db.prepare('BEGIN IMMEDIATE TRANSACTION');

  // We use explicit transactions to 1: not commit writes until the host
  // application calls commit() and 2: avoid expensive fsyncs until the
  // appropriate commit point. All API methods that modify the database should
  // call `ensureTxn` first, otherwise SQLite will automatically start a transaction
  // for us, but it will commit/fsync at the end of the SQL statement.
  //
  // It is critical to call ensureTxn as the first step of any API call that
  // might modify the database (any INSERT or DELETE, etc), to prevent SQLite
  // from creating an automatic transaction, which will commit as soon as the
  // SQL statement finishes. This would cause partial writes to be committed to
  // the DB, and if the application crashes before the real hostStorage.commit()
  // happens, it would wake up with inconsistent state. Aside from the setup
  // initialization done here, the only commit point must be the
  // hostStorage.commit() call.
  function ensureTxn() {
    db || Fail`db not initialized`;
    if (!db.inTransaction) {
      sqlBeginTransaction.run();
      db.inTransaction || Fail`must be in a transaction`;
    }
    return db;
  }

  // Perform all database initialization in a single transaction
  sqlBeginTransaction.run();

  db.exec(`
    CREATE TABLE IF NOT EXISTS pendingExports (
      key TEXT,
      value TEXT,
      PRIMARY KEY (key)
    )
  `);

  const { exportCallback } = options;
  exportCallback === undefined ||
    typeof exportCallback === 'function' ||
    Fail`export callback must be a function`;

  const sqlAddPendingExport = db.prepare(`
    INSERT INTO pendingExports (key, value)
    VALUES (?, ?)
    ON CONFLICT DO UPDATE SET value = excluded.value
  `);

  function noteExport(key, value) {
    if (exportCallback) {
      sqlAddPendingExport.run(key, value);
    }
  }

  const kvStore = makeKVStore(db, ensureTxn, trace);

  const { dumpTranscripts, ...transcriptStore } = makeTranscriptStore(
    db,
    ensureTxn,
    noteExport,
    {
      keepTranscripts,
      archiveTranscript,
    },
  );
  const { dumpSnapshots, ...snapStore } = makeSnapStore(
    db,
    ensureTxn,
    makeSnapStoreIO(),
    noteExport,
    {
      keepSnapshots,
      archiveSnapshot,
    },
  );
  const { dumpBundles, ...bundleStore } = makeBundleStore(
    db,
    ensureTxn,
    noteExport,
  );

  const sqlCommit = db.prepare('COMMIT');

  // At this point, all database initialization should be complete, so commit now.
  sqlCommit.run();

  let inCrank = false;

  function diskUsage() {
    if (dirPath) {
      const dataFilePath = dbFileInDirectory(dirPath);
      const stat = fs.statSync(dataFilePath);
      return stat.size;
    } else {
      return 0;
    }
  }

  const kernelKVStore = {
    ...kvStore,
    set(key, value) {
      typeof key === 'string' || Fail`key must be a string`;
      const keyType = getKeyType(key);
      keyType !== 'host' || Fail`kernelKVStore refuses host keys`;
      kvStore.set(key, value);
      if (keyType === 'consensus') {
        noteExport(`kv.${key}`, value);
        crankhasher.add('add');
        crankhasher.add('\n');
        crankhasher.add(key);
        crankhasher.add('\n');
        crankhasher.add(value);
        crankhasher.add('\n');
      }
    },
    delete(key) {
      typeof key === 'string' || Fail`key must be a string`;
      const keyType = getKeyType(key);
      keyType !== 'host' || Fail`kernelKVStore refuses host keys`;
      kvStore.delete(key);
      if (keyType === 'consensus') {
        noteExport(`kv.${key}`, undefined);
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
      keyType === 'host' || Fail`hostKVStore requires host keys`;
      kvStore.set(key, value);
    },
    delete(key) {
      const keyType = getKeyType(key);
      keyType === 'host' || Fail`hostKVStore requires host keys`;
      kvStore.delete(key);
    },
  };

  const savepoints = [];
  const sqlReleaseSavepoints = db.prepare('RELEASE SAVEPOINT t0');

  function startCrank() {
    !inCrank || Fail`startCrank while already in a crank`;
    inCrank = true;
    resetCrankhash();
  }

  function establishCrankSavepoint(savepoint) {
    inCrank || Fail`establishCrankSavepoint outside of crank`;
    const savepointOrdinal = savepoints.length;
    savepoints.push(savepoint);
    // We must be in a transaction when creating the savepoint or releasing it
    // later will cause an autocommit.
    // See https://github.com/Agoric/agoric-sdk/issues/8423
    ensureTxn();
    const sql = db.prepare(`SAVEPOINT t${savepointOrdinal}`);
    sql.run();
  }

  function rollbackCrank(savepoint) {
    inCrank || Fail`rollbackCrank outside of crank`;
    for (const savepointOrdinal of savepoints.keys()) {
      if (savepoints[savepointOrdinal] === savepoint) {
        const sql = db.prepare(`ROLLBACK TO SAVEPOINT t${savepointOrdinal}`);
        sql.run();
        savepoints.length = savepointOrdinal;
        return;
      }
    }
    Fail`no such savepoint as "${q(savepoint)}"`;
  }

  function emitCrankHashes() {
    // Calculate the resulting crankhash and reset for the next round.
    const crankhash = crankhasher.finish();
    resetCrankhash();

    // Get the old activityhash
    let oldActivityhash = kvStore.get('activityhash');
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
    kvStore.set('activityhash', activityhash);
    // Need to explicitly call noteExport here because activityhash is written
    // directly to the low-level store to avoid recursive hashing, which
    // bypasses the normal notification mechanism
    noteExport(`kv.activityhash`, activityhash);

    return { crankhash, activityhash };
  }

  function getActivityhash() {
    return kvStore.get('activityhash') || '';
  }

  const sqlExportsGet = db.prepare(`
    SELECT *
    FROM pendingExports
    ORDER BY key
  `);
  sqlExportsGet.raw(true);

  const sqlExportsClear = db.prepare(`
    DELETE
    FROM pendingExports
  `);

  function flushPendingExports() {
    if (exportCallback) {
      const exports = sqlExportsGet.all();
      if (exports.length > 0) {
        sqlExportsClear.run();
        exportCallback(exports);
      }
    }
  }

  function endCrank() {
    inCrank || Fail`endCrank outside of crank`;
    if (savepoints.length > 0) {
      sqlReleaseSavepoints.run();
      savepoints.length = 0;
    }
    flushPendingExports();
    inCrank = false;
  }

  /**
   * Commit unsaved changes.
   */
  async function commit() {
    db || Fail`db not initialized`;
    if (db.inTransaction) {
      flushPendingExports();
      sqlCommit.run();
    }
  }

  /**
   * Close the database, abandoning any changes made since the last commit (if
   * you want to save them, call commit() first).
   */
  async function close() {
    db || Fail`db not initialized`;
    db.close();
    db = null;
    stopTrace();
  }

  /** @type {import('./internal.js').SwingStoreInternal} */
  const internal = harden({
    snapStore,
    transcriptStore,
    bundleStore,
  });

  async function repairMetadata(exporter) {
    return doRepairMetadata(internal, exporter);
  }

  /**
   * Return a Buffer with the entire DB state, useful for cloning a
   * small swingstore in unit tests.
   *
   * @returns {Buffer}
   */
  function serialize() {
    // An on-disk DB with WAL mode enabled seems to produce a
    // serialized Buffer that can be unserialized, but the resulting
    // 'db' object fails all operations with SQLITE_CANTOPEN. So
    // pre-emptively throw.
    if (filePath !== ':memory:') {
      throw Error('on-disk DBs with WAL mode enabled do not serialize well');
    }
    return db.serialize();
  }

  function dumpKVEntries() {
    const s = db.prepare('SELECT key,value FROM kvStore ORDER BY key').raw();
    return Object.fromEntries(s.all());
  }

  function dump(includeHistorical = true) {
    // return comparable JS object graph with entire DB state
    return harden({
      kvEntries: dumpKVEntries(),
      transcripts: dumpTranscripts(includeHistorical),
      snapshots: dumpSnapshots(includeHistorical),
      bundles: dumpBundles(),
    });
  }

  function getDatabase() {
    return db;
  }

  const transcriptStorePublic = {
    initTranscript: transcriptStore.initTranscript,
    rolloverSpan: transcriptStore.rolloverSpan,
    rolloverIncarnation: transcriptStore.rolloverIncarnation,
    getCurrentSpanBounds: transcriptStore.getCurrentSpanBounds,
    addItem: transcriptStore.addItem,
    readSpan: transcriptStore.readSpan,
    stopUsingTranscript: transcriptStore.stopUsingTranscript,
    deleteVatTranscripts: transcriptStore.deleteVatTranscripts,
  };

  const snapStorePublic = {
    loadSnapshot: snapStore.loadSnapshot,
    saveSnapshot: snapStore.saveSnapshot,
    deleteAllUnusedSnapshots: snapStore.deleteAllUnusedSnapshots,
    deleteVatSnapshots: snapStore.deleteVatSnapshots,
    stopUsingLastSnapshot: snapStore.stopUsingLastSnapshot,
    getSnapshotInfo: snapStore.getSnapshotInfo,
  };

  const bundleStorePublic = {
    addBundle: bundleStore.addBundle,
    hasBundle: bundleStore.hasBundle,
    getBundle: bundleStore.getBundle,
    deleteBundle: bundleStore.deleteBundle,
  };

  const kernelStorage = {
    kvStore: kernelKVStore,
    transcriptStore: transcriptStorePublic,
    snapStore: snapStorePublic,
    bundleStore: bundleStorePublic,
    startCrank,
    establishCrankSavepoint,
    rollbackCrank,
    emitCrankHashes,
    endCrank,
    getActivityhash,
  };
  const hostStorage = {
    repairMetadata,
    kvStore: hostKVStore,
    commit,
    close,
    diskUsage,
  };
  const debug = {
    serialize,
    dump,
    getDatabase,
  };

  return harden({
    kernelStorage,
    hostStorage,
    debug,
    internal,
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
    typeof dirPath === 'string' || Fail`dirPath must be a string`;
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
  typeof dirPath === 'string' || Fail`dirPath must be a string`;
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
  typeof dirPath === 'string' || Fail`dirPath must be a string`;
  if (fs.existsSync(dirPath)) {
    const storeFile = dbFileInDirectory(dirPath);
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
