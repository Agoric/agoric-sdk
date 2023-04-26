// @ts-check
/* global Buffer */
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { file as tmpFile, tmpName } from 'tmp';

import sqlite3 from 'better-sqlite3';

import { assert, Fail, q } from '@agoric/assert';
import { makeMeasureSeconds } from '@agoric/internal';

import { makeTranscriptStore } from './transcriptStore.js';
import { makeSnapStore } from './snapStore.js';
import { makeBundleStore } from './bundleStore.js';
import { createSHA256 } from './hasher.js';

export { makeSnapStore, makeBundleStore };

/**
 * This is a polyfill for the `buffer` function from Node's
 * 'stream/consumers' package, which unfortunately only exists in newer versions
 * of Node.
 *
 * @param {AsyncIterable<Buffer>} inStream
 */
export const buffer = async inStream => {
  const chunks = [];
  for await (const chunk of inStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

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

/**
 * @typedef {{
 *   has: (key: string) => boolean,
 *   get: (key: string) => string | undefined,
 *   getNextKey: (previousKey: string) => string | undefined,
 *   set: (key: string, value: string, bypassHash?: boolean ) => void,
 *   delete: (key: string) => void,
 * }} KVStore
 *
 * @typedef { import('./snapStore').SnapStore } SnapStore
 * @typedef { import('./snapStore').SnapStoreInternal } SnapStoreInternal
 * @typedef { import('./snapStore').SnapshotResult } SnapshotResult
 *
 * @typedef { import('./transcriptStore').TranscriptStore } TranscriptStore
 * @typedef { import('./transcriptStore').TranscriptStoreInternal } TranscriptStoreInternal
 * @typedef { import('./transcriptStore').TranscriptStoreDebug } TranscriptStoreDebug
 *
 * @typedef { import('./bundleStore').BundleStore } BundleStore
 * @typedef { import('./bundleStore').BundleStoreInternal } BundleStoreInternal
 * @typedef { import('./bundleStore').BundleStoreDebug } BundleStoreDebug
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
 *   setExportCallback: (cb: (updates: KVPair[]) => void) => void, // Set a callback invoked by swingStore when new serializable data is available for export
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
 *    transcriptStore: TranscriptStoreInternal,
 *    snapStore: SnapStoreInternal,
 *    bundleStore: BundleStoreInternal,
 * }} SwingStoreInternal
 *
 * @typedef {{
 *  kernelStorage: SwingStoreKernelStorage,
 *  hostStorage: SwingStoreHostStorage,
 *  debug: SwingStoreDebugTools,
 *  internal: SwingStoreInternal,
 * }} SwingStore
 */

/**
 * @template T
 *  @typedef  { Iterable<T> | AsyncIterable<T> } AnyIterable<T>
 */
/**
 * @template T
 *  @typedef  { IterableIterator<T> | AsyncIterableIterator<T> } AnyIterableIterator<T>
 */

/**
 * @typedef {readonly [
 *   key: string,
 *   value?: string | null | undefined,
 * ]} KVPair
 *
 * @typedef {object} SwingStoreExporter
 *
 * Allows export of data from a swingStore as a fixed view onto the content as
 * of the most recent commit point at the time the exporter was created.  The
 * exporter may be used while another SwingStore instance is active for the same
 * DB, possibly in another thread or process.  It guarantees that regardless of
 * the concurrent activity of other swingStore instances, the data representing
 * the commit point will stay consistent and available.
 *
 * @property {() => AnyIterableIterator<KVPair>} getExportData
 *
 * Get a full copy of the first-stage export data (key-value pairs) from the
 * swingStore. This represents both the contents of the KVStore (excluding host
 * and local prefixes), as well as any data needed to validate all artifacts,
 * both current and historical. As such it represents the root of trust for the
 * application.
 *
 * Content of validation data (with supporting entries for indexing):
 * - kv.${key} = ${value}  // ordinary kvStore data entry
 * - snapshot.${vatID}.${endPos} = ${{ vatID, endPos, hash });
 * - snapshot.${vatID}.current = `snapshot.${vatID}.${endPos}`
 * - transcript.${vatID}.${startPos} = ${{ vatID, startPos, endPos, hash }}
 * - transcript.${vatID}.current = ${{ vatID, startPos, endPos, hash }}
 *
 * @property {() => AnyIterableIterator<string>} getArtifactNames
 *
 * Get a list of name of artifacts available from the swingStore.  A name returned
 * by this method guarantees that a call to `getArtifact` on the same exporter
 * instance will succeed. Options control the filtering of the artifact names
 * yielded.
 *
 * Artifact names:
 * - transcript.${vatID}.${startPos}.${endPos}
 * - snapshot.${vatID}.${endPos}
 *
 * @property {(name: string) => AnyIterableIterator<Uint8Array>} getArtifact
 *
 * Retrieve an artifact by name.  May throw if the artifact is not available,
 * which can occur if the artifact is historical and wasn't been preserved.
 *
 * @property {() => Promise<void>} close
 *
 * Dispose of all resources held by this exporter. Any further operation on this
 * exporter or its outstanding iterators will fail.
 */

/**
 * @param {string} dirPath
 * @param {string} exportMode
 * @returns {SwingStoreExporter}
 */
export function makeSwingStoreExporter(dirPath, exportMode = 'current') {
  typeof dirPath === 'string' || Fail`dirPath must be a string`;
  exportMode === 'current' ||
    exportMode === 'archival' ||
    exportMode === 'debug' ||
    Fail`invalid exportMode ${q(exportMode)}`;
  const exportHistoricalSnapshots = exportMode === 'debug';
  const exportHistoricalTranscripts = exportMode !== 'current';
  const filePath = path.join(dirPath, 'swingstore.sqlite');
  const db = sqlite3(filePath);

  // Execute the data export in a (read) transaction, to ensure that we are
  // capturing the state of the database at a single point in time.
  const sqlBeginTransaction = db.prepare('BEGIN TRANSACTION');
  sqlBeginTransaction.run();

  // ensureTxn can be a dummy, we just started one
  const ensureTxn = () => {};
  const snapStore = makeSnapStore(db, ensureTxn, makeSnapStoreIO());
  const bundleStore = makeBundleStore(db, ensureTxn);
  const transcriptStore = makeTranscriptStore(db, ensureTxn, () => {});

  const sqlGetAllKVData = db.prepare(`
    SELECT key, value
    FROM kvStore
    ORDER BY key
  `);

  /**
   * @returns {AsyncIterableIterator<KVPair>}
   * @yields {KVPair}
   */
  async function* getExportData() {
    const kvPairs = sqlGetAllKVData.iterate();
    for (const kv of kvPairs) {
      if (getKeyType(kv.key) === 'consensus') {
        yield [`kv.${kv.key}`, kv.value];
      }
    }
    yield* snapStore.getExportRecords(true);
    yield* transcriptStore.getExportRecords(true);
    yield* bundleStore.getExportRecords();
  }

  /**
   * @returns {AsyncIterableIterator<string>}
   * @yields {string}
   */
  async function* getArtifactNames() {
    yield* snapStore.getArtifactNames(exportHistoricalSnapshots);
    yield* transcriptStore.getArtifactNames(exportHistoricalTranscripts);
    yield* bundleStore.getArtifactNames();
  }

  /**
   * @param {string} name
   * @returns {AsyncIterableIterator<Uint8Array>}
   */
  function getArtifact(name) {
    typeof name === 'string' || Fail`artifact name must be a string`;
    const [type] = name.split('.', 1);

    if (type === 'snapshot') {
      return snapStore.exportSnapshot(name, exportHistoricalSnapshots);
    } else if (type === 'transcript') {
      return transcriptStore.exportSpan(name, exportHistoricalTranscripts);
    } else if (type === 'bundle') {
      return bundleStore.exportBundle(name);
    } else {
      throw Fail`invalid artifact type ${q(type)}`;
    }
  }

  const sqlAbort = db.prepare('ROLLBACK');

  async function close() {
    // After all the data has been extracted, always abort the export
    // transaction to ensure that the export was read-only (i.e., that no bugs
    // inadvertantly modified the database).
    sqlAbort.run();
    db.close();
  }

  return harden({
    getExportData,
    getArtifactNames,
    getArtifact,
    close,
  });
}

/**
 * Function used to create a new swingStore from an object implementing the
 * exporter API. The exporter API may be provided by a swingStore instance, or
 * implemented by a host to restore data that was previously exported.
 *
 * @typedef {(exporter: SwingStoreExporter) => Promise<SwingStore>} ImportSwingStore
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
function makeSwingStore(dirPath, forceReset, options = {}) {
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
    filePath = path.join(dirPath, 'swingstore.sqlite');
  } else {
    filePath = ':memory:';
  }

  const { traceFile, keepSnapshots, keepTranscripts } = options;

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

  // PRAGMAs have to happen outside a transaction
  db.exec(`PRAGMA journal_mode=WAL`);
  db.exec(`PRAGMA synchronous=FULL`);

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
    CREATE TABLE IF NOT EXISTS kvStore (
      key TEXT,
      value TEXT,
      PRIMARY KEY (key)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pendingExports (
      key TEXT,
      value TEXT,
      PRIMARY KEY (key)
    )
  `);

  const { dumpTranscripts, ...transcriptStore } = makeTranscriptStore(
    db,
    ensureTxn,
    // eslint-disable-next-line no-use-before-define
    noteExport,
    {
      keepTranscripts,
    },
  );
  const { dumpSnapshots, ...snapStore } = makeSnapStore(
    db,
    ensureTxn,
    makeSnapStoreIO(),
    // eslint-disable-next-line no-use-before-define
    noteExport,
    {
      keepSnapshots,
    },
  );
  const { dumpBundles, ...bundleStore } = makeBundleStore(
    db,
    ensureTxn,
    // eslint-disable-next-line no-use-before-define
    noteExport,
  );

  const sqlCommit = db.prepare('COMMIT');

  // At this point, all database initialization should be complete, so commit now.
  sqlCommit.run();

  let exportCallback;
  function setExportCallback(cb) {
    typeof cb === 'function' || Fail`callback must be a function`;
    exportCallback = cb;
  }
  if (options.exportCallback) {
    setExportCallback(options.exportCallback);
  }

  let inCrank = false;

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

  const kernelKVStore = {
    ...kvStore,
    set(key, value) {
      typeof key === 'string' || Fail`key must be a string`;
      const keyType = getKeyType(key);
      keyType !== 'host' || Fail`kernelKVStore refuses host keys`;
      set(key, value);
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
      del(key);
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
      set(key, value);
    },
    delete(key) {
      const keyType = getKeyType(key);
      keyType === 'host' || Fail`hostKVStore requires host keys`;
      del(key);
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
    // Need to explicitly call noteExport here because activityhash is written
    // directly to the low-level store to avoid recursive hashing, which
    // bypasses the normal notification mechanism
    noteExport(`kv.activityhash`, activityhash);

    return { crankhash, activityhash };
  }

  function getActivityhash() {
    return get('activityhash') || '';
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

  const transcriptStorePublic = {
    initTranscript: transcriptStore.initTranscript,
    rolloverSpan: transcriptStore.rolloverSpan,
    rolloverIncarnation: transcriptStore.rolloverIncarnation,
    getCurrentSpanBounds: transcriptStore.getCurrentSpanBounds,
    addItem: transcriptStore.addItem,
    readSpan: transcriptStore.readSpan,
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
    kvStore: hostKVStore,
    commit,
    close,
    diskUsage,
    setExportCallback,
  };
  const debug = {
    serialize,
    dump,
  };
  const internal = {
    snapStore,
    transcriptStore,
    bundleStore,
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

function parseVatArtifactExportKey(key) {
  const parts = key.split('.');
  const [_type, vatID, rawPos] = parts;
  // prettier-ignore
  parts.length === 3 ||
    Fail`expected artifact name of the form '{type}.{vatID}.{pos}', saw ${q(key)}`;
  const isCurrent = rawPos === 'current';
  let pos;
  if (isCurrent) {
    pos = -1;
  } else {
    pos = Number(rawPos);
  }

  return { vatID, isCurrent, pos };
}

function artifactKey(type, vatID, pos) {
  return `${type}.${vatID}.${pos}`;
}

/**
 * @param {SwingStoreExporter} exporter
 * @param {string | null} [dirPath]
 * @param {object} options
 * @returns {Promise<SwingStore>}
 */
export async function importSwingStore(exporter, dirPath = null, options = {}) {
  if (dirPath) {
    typeof dirPath === 'string' || Fail`dirPath must be a string`;
  }
  const { includeHistorical = false } = options;
  const store = makeSwingStore(dirPath, true, options);
  const { kernelStorage, internal } = store;

  // Artifact metadata, keyed as `${type}.${vatID}.${pos}`
  //
  // Note that this key is almost but not quite the artifact name, since the
  // names of transcript span artifacts also include the endPos, but the endPos
  // value is in flux until the span is complete.
  const artifactMetadata = new Map();

  // Each vat requires a transcript span and (usually) a snapshot.  This table
  // tracks which of these we've seen, keyed by vatID.
  // vatID -> { snapshotKey: metadataKey, transcriptKey: metatdataKey }
  const vatArtifacts = new Map();
  const bundleArtifacts = new Map();

  for await (const [key, value] of exporter.getExportData()) {
    const [tag] = key.split('.', 1);
    const subKey = key.substring(tag.length + 1);
    if (tag === 'kv') {
      // 'kv' keys contain individual kvStore entries
      if (value == null) {
        // Note '==' rather than '===': any nullish value implies deletion
        kernelStorage.kvStore.delete(subKey);
      } else {
        kernelStorage.kvStore.set(subKey, value);
      }
    } else if (tag === 'bundle') {
      // 'bundle' keys contain bundle IDs
      if (value == null) {
        bundleArtifacts.delete(key);
      } else {
        bundleArtifacts.set(key, value);
      }
    } else if (tag === 'transcript' || tag === 'snapshot') {
      // 'transcript' and 'snapshot' keys contain artifact description info.
      assert(value); // make TypeScript shut up
      const { vatID, isCurrent, pos } = parseVatArtifactExportKey(key);
      if (isCurrent) {
        const vatInfo = vatArtifacts.get(vatID) || {};
        if (tag === 'snapshot') {
          // `export.snapshot.{vatID}.current` directly identifies the current snapshot artifact
          vatInfo.snapshotKey = value;
        } else if (tag === 'transcript') {
          // `export.transcript.${vatID}.current` contains a metadata record for the current
          // state of the current transcript span as of the time of export
          const metadata = JSON.parse(value);
          vatInfo.transcriptKey = artifactKey(tag, vatID, metadata.startPos);
          artifactMetadata.set(vatInfo.transcriptKey, metadata);
        }
        vatArtifacts.set(vatID, vatInfo);
      } else {
        artifactMetadata.set(artifactKey(tag, vatID, pos), JSON.parse(value));
      }
    } else {
      Fail`unknown artifact type tag ${q(tag)} on import`;
    }
  }

  // At this point we should have acquired the entire KV store state, plus
  // sufficient metadata to identify the complete set of artifacts we'll need to
  // fetch along with the information required to validate each of them after
  // fetching.
  //
  // Depending on how the export was parameterized, the metadata may also include
  // information about historical artifacts that we might or might not actually
  // fetch depending on how this import was parameterized

  // Fetch the set of current artifacts.

  // Keep track of fetched artifacts in this set so we don't fetch them a second
  // time if we are trying for historical artifacts also.
  const fetchedArtifacts = new Set();

  for await (const [vatID, vatInfo] of vatArtifacts.entries()) {
    // For each vat, we *must* have a transcript span.  If this is not the very
    // first transcript span in the history of that vat, then we also must have
    // a snapshot for the state of the vat immediately prior to when the
    // transcript span begins.
    vatInfo.transcriptKey ||
      Fail`missing current transcript key for vat ${q(vatID)}`;
    const transcriptInfo = artifactMetadata.get(vatInfo.transcriptKey);
    transcriptInfo || Fail`missing transcript metadata for vat ${q(vatID)}`;
    let snapshotInfo;
    if (vatInfo.snapshotKey) {
      snapshotInfo = artifactMetadata.get(vatInfo.snapshotKey);
      snapshotInfo || Fail`missing snapshot metadata for vat ${q(vatID)}`;
    }
    if (!snapshotInfo) {
      transcriptInfo.startPos === 0 ||
        Fail`missing current snapshot for vat ${q(vatID)}`;
    } else {
      snapshotInfo.endPos + 1 === transcriptInfo.startPos ||
        Fail`current transcript for vat ${q(vatID)} doesn't go with snapshot`;
      fetchedArtifacts.add(vatInfo.snapshotKey);
    }
    await (!snapshotInfo ||
      internal.snapStore.importSnapshot(
        vatInfo.snapshotKey,
        exporter,
        snapshotInfo,
      ));

    const transcriptArtifactName = `${vatInfo.transcriptKey}.${transcriptInfo.endPos}`;
    await internal.transcriptStore.importSpan(
      transcriptArtifactName,
      exporter,
      transcriptInfo,
    );
    fetchedArtifacts.add(transcriptArtifactName);
  }
  const bundleArtifactNames = Array.from(bundleArtifacts.keys()).sort();
  for await (const bundleArtifactName of bundleArtifactNames) {
    await internal.bundleStore.importBundle(
      bundleArtifactName,
      exporter,
      bundleArtifacts.get(bundleArtifactName),
    );
  }

  if (!includeHistorical) {
    // eslint-disable-next-line @jessie.js/no-nested-await
    await exporter.close();
    return store;
  }

  // If we're also importing historical artifacts, have the exporter enumerate
  // the complete set of artifacts it has and fetch all of them except for the
  // ones we've already fetched.
  for await (const artifactName of exporter.getArtifactNames()) {
    if (fetchedArtifacts.has(artifactName)) {
      continue;
    }
    let fetchedP;
    if (artifactName.startsWith('snapshot.')) {
      fetchedP = internal.snapStore.importSnapshot(
        artifactName,
        exporter,
        artifactMetadata.get(artifactName),
      );
    } else if (artifactName.startsWith('transcript.')) {
      // strip endPos off artifact name
      const metadataKey = artifactName.split('.').slice(0, 3).join('.');
      fetchedP = internal.transcriptStore.importSpan(
        artifactName,
        exporter,
        artifactMetadata.get(metadataKey),
      );
    } else if (artifactName.startsWith('bundle.')) {
      // already taken care of
      continue;
    } else {
      Fail`unknown artifact type: ${artifactName}`;
    }
    await fetchedP;
  }
  await exporter.close();
  return store;
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
    const storeFile = path.resolve(dirPath, 'swingstore.sqlite');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
