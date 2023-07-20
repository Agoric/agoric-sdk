import sqlite3 from 'better-sqlite3';

import { Fail, q } from '@agoric/assert';

import { dbFileInDirectory } from './util.js';
import { getKeyType } from './kvStore.js';
import { makeBundleStore } from './bundleStore.js';
import { makeSnapStore } from './snapStore.js';
import { makeSnapStoreIO } from './snapStoreIO.js';
import { makeTranscriptStore } from './transcriptStore.js';

/**
 * @template T
 *  @typedef  { Iterable<T> | AsyncIterable<T> } AnyIterable<T>
 */
/**
 * @template T
 *  @typedef  { IterableIterator<T> | AsyncIterableIterator<T> } AnyIterableIterator<T>
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
 * - snapshot.${vatID}.${snapPos} = ${{ vatID, snapPos, hash });
 * - snapshot.${vatID}.current = `snapshot.${vatID}.${snapPos}`
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
 * - snapshot.${vatID}.${snapPos}
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
 * @typedef {'current' | 'archival' | 'debug'} ExportMode
 */

/**
 * @param {string} dirPath
 * @param { ExportMode } exportMode
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
