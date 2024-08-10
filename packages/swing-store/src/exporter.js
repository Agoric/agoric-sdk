import sqlite3 from 'better-sqlite3';

import { Fail, q } from '@endo/errors';

import { dbFileInDirectory } from './util.js';
import { getKeyType } from './kvStore.js';
import { makeBundleStore } from './bundleStore.js';
import { makeSnapStore } from './snapStore.js';
import { makeSnapStoreIO } from './snapStoreIO.js';
import { makeTranscriptStore } from './transcriptStore.js';
import { assertComplete } from './assertComplete.js';
import { validateArtifactMode } from './internal.js';

/**
 * @template T
 * @typedef  { Iterable<T> | AsyncIterable<T> } AnyIterable
 */
/**
 * @template T
 * @typedef  { IterableIterator<T> | AsyncIterableIterator<T> } AnyIterableIterator
 */

/**
 *
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
 * @property {(key: string) => string | undefined} getHostKV
 *
 * Retrieve a value from the "host" portion of the kvStore, just like
 * hostStorage.hostKVStore.get() would do.
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
 * - snapshot.${vatID}.${snapPos} = ${{ vatID, snapPos, hash }};
 * - snapshot.${vatID}.current = `snapshot.${vatID}.${snapPos}`
 * - transcript.${vatID}.${startPos} = ${{ vatID, startPos, endPos, hash }}
 * - transcript.${vatID}.current = ${{ vatID, startPos, endPos, hash }}
 *
 * @property {() => AnyIterableIterator<string>} getArtifactNames
 *
 * Get a list of name of artifacts available from the swingStore.  A name
 * returned by this method guarantees that a call to `getArtifact` on the same
 * exporter instance will succeed.  The `artifactMode` option to
 * `makeSwingStoreExporter` controls the filtering of the artifact names
 * yielded.
 *
 * Artifact names:
 * - transcript.${vatID}.${startPos}.${endPos}
 * - snapshot.${vatID}.${snapPos}
 * - bundle.${bundleID}
 *
 * @property {(name: string) => AnyIterableIterator<Uint8Array>} getArtifact
 *
 * Retrieve an artifact by name as a sequence of binary chunks.  May throw if
 * the artifact is not available, which can occur if the artifact is historical
 * and wasn't preserved.
 *
 * @property {() => Promise<void>} close
 *
 * Dispose of all resources held by this exporter. Any further operation on this
 * exporter or its outstanding iterators will fail.
 */

/**
 * @typedef { object } ExportSwingStoreOptions
 * @property { import('./internal.js').ArtifactMode } [artifactMode]  What artifacts should/must the exporter provide?
 */

/**
 * @param {string} dirPath
 * @param { ExportSwingStoreOptions } [options]
 * @returns {SwingStoreExporter}
 */
export function makeSwingStoreExporter(dirPath, options = {}) {
  typeof dirPath === 'string' || Fail`dirPath must be a string`;
  const { artifactMode = 'operational' } = options;
  validateArtifactMode(artifactMode);

  const filePath = dbFileInDirectory(dirPath);
  const db = sqlite3(filePath);

  // Execute the data export in a (read) transaction, to ensure that we are
  // capturing the state of the database at a single point in time. Our close()
  // will ROLLBACK the txn just in case some bug tried to change the DB.
  const sqlBeginTransaction = db.prepare('BEGIN TRANSACTION');
  sqlBeginTransaction.run();

  // ensureTxn can be a dummy, we just started one
  const ensureTxn = () => {};
  const snapStore = makeSnapStore(db, ensureTxn, makeSnapStoreIO());
  const bundleStore = makeBundleStore(db, ensureTxn);
  const transcriptStore = makeTranscriptStore(db, ensureTxn, () => {});

  const sqlKVGet = db.prepare(`
    SELECT value
    FROM kvStore
    WHERE key = ?
  `);
  sqlKVGet.pluck(true);

  /**
   * Obtain the value stored for a given host key. This is for the
   * benefit of clients who need to briefly query the DB to ensure
   * they are exporting the right thing, and need to avoid modifying
   * anything (or creating a read-write DB lock) in the process.
   *
   * @param {string} key  The key whose value is sought.
   *
   * @returns {string | undefined} the (string) value for the given key, or
   *    undefined if there is no such value.
   *
   * @throws if key is not a string, or the key is not in the host
   * section
   */
  function getHostKV(key) {
    typeof key === 'string' || Fail`key must be a string`;
    getKeyType(key) === 'host' || Fail`getHostKV requires host keys`;
    // @ts-expect-error unknown
    return sqlKVGet.get(key);
  }

  /** @type {any} */
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
    for (const { key, value } of sqlGetAllKVData.iterate()) {
      if (getKeyType(key) === 'consensus') {
        yield [`kv.${key}`, value];
      }
    }
    yield* snapStore.getExportRecords(true);
    yield* transcriptStore.getExportRecords(true);
    yield* bundleStore.getExportRecords();
  }
  harden(getExportData);

  /** @yields {string} */
  async function* generateArtifactNames() {
    yield* snapStore.getArtifactNames(artifactMode);
    yield* transcriptStore.getArtifactNames(artifactMode);
    yield* bundleStore.getArtifactNames();
  }
  harden(generateArtifactNames);

  /**
   * @returns {AsyncIterableIterator<string>}
   */
  function getArtifactNames() {
    if (artifactMode !== 'debug') {
      // synchronously throw if this DB will not be able to yield all the desired artifacts
      const internal = { snapStore, bundleStore, transcriptStore };
      assertComplete(internal, artifactMode);
    }
    return generateArtifactNames();
  }

  /**
   * @param {string} name
   * @returns {AsyncIterableIterator<Uint8Array>}
   */
  function getArtifact(name) {
    typeof name === 'string' || Fail`artifact name must be a string`;
    const [type] = name.split('.', 1);

    if (type === 'snapshot') {
      return snapStore.exportSnapshot(name);
    } else if (type === 'transcript') {
      return transcriptStore.exportSpan(name);
    } else if (type === 'bundle') {
      return bundleStore.exportBundle(name);
    } else {
      throw Fail`invalid type in artifact name ${q(name)}`;
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
    getHostKV,
    getExportData,
    getArtifactNames,
    getArtifact,
    close,
  });
}
