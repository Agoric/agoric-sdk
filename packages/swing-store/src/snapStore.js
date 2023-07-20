// @ts-check
import { createHash } from 'crypto';
import { finished as finishedCallback, PassThrough, Readable } from 'stream';
import { promisify } from 'util';
import { createGzip, createGunzip } from 'zlib';
import { Fail, q } from '@agoric/assert';
import { aggregateTryFinally, PromiseAllOrErrors } from '@agoric/internal';
import { buffer } from './util.js';

/**
 * @typedef {object} SnapshotResult
 * @property {string} hash sha256 hash of (uncompressed) snapshot
 * @property {number} uncompressedSize size of (uncompressed) snapshot
 * @property {number} dbSaveSeconds time to write snapshot in DB
 * @property {number} compressedSize size of (compressed) snapshot
 * @property {number} compressSeconds time to generate and compress the snapshot
 */

/**
 * @typedef {object} SnapshotInfo
 * @property {number} snapPos
 * @property {string} hash
 * @property {number} uncompressedSize
 * @property {number} compressedSize
 */

/**
 * @typedef { import('./exporter').SwingStoreExporter } SwingStoreExporter
 *
 * @typedef {{
 *   loadSnapshot: (vatID: string) => AsyncIterableIterator<Uint8Array>,
 *   saveSnapshot: (vatID: string, snapPos: number, snapshotStream: AsyncIterable<Uint8Array>) => Promise<SnapshotResult>,
 *   deleteAllUnusedSnapshots: () => void,
 *   deleteVatSnapshots: (vatID: string) => void,
 *   stopUsingLastSnapshot: (vatID: string) => void,
 *   getSnapshotInfo: (vatID: string) => SnapshotInfo,
 * }} SnapStore
 *
 * @typedef {{
 *   exportSnapshot: (name: string, includeHistorical: boolean) => AsyncIterableIterator<Uint8Array>,
 *   importSnapshot: (artifactName: string, exporter: SwingStoreExporter, artifactMetadata: Map) => void,
 *   getExportRecords: (includeHistorical: boolean) => IterableIterator<readonly [key: string, value: string]>,
 *   getArtifactNames: (includeHistorical: boolean) => AsyncIterableIterator<string>,
 * }} SnapStoreInternal
 *
 * @typedef {{
 *   hasHash: (vatID: string, hash: string) => boolean,
 *   dumpSnapshots: (includeHistorical?: boolean) => {},
 *   deleteSnapshotByHash: (vatID: string, hash: string) => void,
 * }} SnapStoreDebug
 *
 */

const finished = promisify(finishedCallback);

/**
 * @param {*} db
 * @param {() => void} ensureTxn
 * @param {{
 *   measureSeconds: ReturnType<typeof import('@agoric/internal').makeMeasureSeconds>,
 * }} io
 * @param {(key: string, value: string | undefined) => void} noteExport
 * @param {object} [options]
 * @param {boolean | undefined} [options.keepSnapshots]
 * @returns {SnapStore & SnapStoreInternal & SnapStoreDebug}
 */
export function makeSnapStore(
  db,
  ensureTxn,
  { measureSeconds },
  noteExport = () => {},
  { keepSnapshots = false } = {},
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      vatID TEXT,
      snapPos INTEGER,
      inUse INTEGER CHECK(inUse = 1),
      hash TEXT,
      uncompressedSize INTEGER,
      compressedSize INTEGER,
      compressedSnapshot BLOB,
      PRIMARY KEY (vatID, snapPos),
      UNIQUE (vatID, inUse),
      CHECK(compressedSnapshot is not null or inUse is null)
    )
  `);

  const sqlDeleteAllUnusedSnapshots = db.prepare(`
    DELETE FROM snapshots
    WHERE inUse is null
  `);

  /**
   * Delete all extant snapshots from the snapstore that are not currently in
   * use by some vat.
   */
  function deleteAllUnusedSnapshots() {
    ensureTxn();
    sqlDeleteAllUnusedSnapshots.run();
  }

  function snapshotArtifactName(rec) {
    return `snapshot.${rec.vatID}.${rec.snapPos}`;
  }

  function snapshotMetadataKey(rec) {
    return `snapshot.${rec.vatID}.${rec.snapPos}`;
  }

  function currentSnapshotMetadataKey(rec) {
    return `snapshot.${rec.vatID}.current`;
  }

  /**
   * @param {string} vatID
   * @param {number} snapPos
   * @param {string} [hash]
   * @param {number | null} [inUse]
   */
  function snapshotRec(vatID, snapPos, hash, inUse) {
    return { vatID, snapPos, hash, inUse: inUse ? 1 : 0 };
  }

  const sqlGetPriorSnapshotInfo = db.prepare(`
    SELECT snapPos, hash
    FROM snapshots
    WHERE vatID = ? AND inUse = 1
  `);

  const sqlClearLastSnapshot = db.prepare(`
    UPDATE snapshots
    SET inUse = null, compressedSnapshot = null
    WHERE inUse = 1 AND vatID = ?
  `);

  const sqlStopUsingLastSnapshot = db.prepare(`
    UPDATE snapshots
    SET inUse = null
    WHERE inUse = 1 AND vatID = ?
  `);

  function stopUsingLastSnapshot(vatID) {
    ensureTxn();
    const oldInfo = sqlGetPriorSnapshotInfo.get(vatID);
    if (oldInfo) {
      const rec = snapshotRec(vatID, oldInfo.snapPos, oldInfo.hash, 0);
      noteExport(snapshotMetadataKey(rec), JSON.stringify(rec));
      if (keepSnapshots) {
        sqlStopUsingLastSnapshot.run(vatID);
      } else {
        sqlClearLastSnapshot.run(vatID);
      }
    }
  }

  const sqlSaveSnapshot = db.prepare(`
    INSERT OR REPLACE INTO snapshots
      (vatID, snapPos, inUse, hash, uncompressedSize, compressedSize, compressedSnapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  /**
   * Generates a new XS heap snapshot, stores a gzipped copy of it into the
   * snapshots table, and reports information about the process, including
   * snapshot size and timing metrics.
   *
   * @param {string} vatID
   * @param {number} snapPos
   * @param {AsyncIterable<Uint8Array>} snapshotStream
   * @returns {Promise<SnapshotResult>}
   */
  async function saveSnapshot(vatID, snapPos, snapshotStream) {
    const cleanup = [];
    return aggregateTryFinally(
      async () => {
        const hashStream = createHash('sha256');
        const gzip = createGzip();
        let compressedSize = 0;
        let uncompressedSize = 0;

        const { duration: compressSeconds, result: compressedSnapshot } =
          await measureSeconds(async () => {
            const snapReader = Readable.from(snapshotStream);
            cleanup.push(
              () =>
                new Promise((resolve, reject) =>
                  snapReader.destroy(
                    null,
                    // @ts-expect-error incorrect types
                    err => (err ? reject(err) : resolve()),
                  ),
                ),
            );

            snapReader.on('data', chunk => {
              uncompressedSize += chunk.length;
            });
            snapReader.pipe(hashStream);
            const compressedSnapshotData = await buffer(snapReader.pipe(gzip));
            await finished(snapReader);
            return compressedSnapshotData;
          });
        const hash = hashStream.digest('hex');

        const { duration: dbSaveSeconds } = await measureSeconds(async () => {
          ensureTxn();
          stopUsingLastSnapshot(vatID);
          compressedSize = compressedSnapshot.length;
          sqlSaveSnapshot.run(
            vatID,
            snapPos,
            1,
            hash,
            uncompressedSize,
            compressedSize,
            compressedSnapshot,
          );
          const rec = snapshotRec(vatID, snapPos, hash, 1);
          const exportKey = snapshotMetadataKey(rec);
          noteExport(exportKey, JSON.stringify(rec));
          noteExport(
            currentSnapshotMetadataKey(rec),
            snapshotArtifactName(rec),
          );
        });

        return harden({
          hash,
          uncompressedSize,
          compressSeconds,
          dbSaveSeconds,
          compressedSize,
        });
      },
      async () => {
        await PromiseAllOrErrors(
          cleanup.reverse().map(fn => Promise.resolve().then(() => fn())),
        );
      },
    );
  }

  const sqlGetSnapshot = db.prepare(`
    SELECT compressedSnapshot, inUse
    FROM snapshots
    WHERE vatID = ? AND snapPos = ?
  `);

  /**
   * Read a snapshot and return it as a stream of data suitable for export to
   * another store.
   *
   * Snapshot artifact names should be strings of the form:
   *   `snapshot.${vatID}.${startPos}`
   *
   * @param {string} name
   * @param {boolean} includeHistorical
   * @returns {AsyncIterableIterator<Uint8Array>}
   */
  function exportSnapshot(name, includeHistorical) {
    typeof name === 'string' || Fail`artifact name must be a string`;
    const parts = name.split('.');
    const [type, vatID, pos] = parts;
    // prettier-ignore
    (parts.length === 3 && type === 'snapshot') ||
      Fail`expected artifact name of the form 'snapshot.{vatID}.{snapPos}', saw ${q(name)}`;
    const snapPos = Number(pos);
    const snapshotInfo = sqlGetSnapshot.get(vatID, snapPos);
    snapshotInfo || Fail`snapshot ${q(name)} not available`;
    const { inUse, compressedSnapshot } = snapshotInfo;
    compressedSnapshot || Fail`artifact ${q(name)} is not available`;
    inUse || includeHistorical || Fail`artifact ${q(name)} is not available`;
    // weird construct here is because we need to be able to throw before the generator starts
    async function* exporter() {
      const gzReader = Readable.from(compressedSnapshot);
      const unzipper = createGunzip();
      const snapshotReader = gzReader.pipe(unzipper);
      yield* snapshotReader;
    }
    return exporter();
  }

  const sqlLoadSnapshot = db.prepare(`
    SELECT hash, compressedSnapshot
    FROM snapshots
    WHERE vatID = ? AND inUse = 1
  `);

  /**
   * Loads the most recent snapshot for a given vat.
   *
   * @param {string} vatID
   * @returns {AsyncGenerator<Uint8Array, void, undefined>}
   */
  async function* loadSnapshot(vatID) {
    const loadInfo = sqlLoadSnapshot.get(vatID);
    loadInfo || Fail`no snapshot available for vat ${q(vatID)}`;
    const { hash: snapshotID, compressedSnapshot } = loadInfo;
    compressedSnapshot || Fail`no snapshot available for vat ${q(vatID)}`;
    const gzReader = Readable.from(compressedSnapshot);
    const snapReader = gzReader.pipe(createGunzip());
    const hashStream = createHash('sha256');
    const output = new PassThrough();
    snapReader.pipe(hashStream);
    snapReader.pipe(output);

    await null;
    try {
      yield* output;
    } finally {
      gzReader.destroy();
      await finished(gzReader);
      const hash = hashStream.digest('hex');
      hash === snapshotID ||
        Fail`actual hash ${q(hash)} !== expected ${q(snapshotID)}`;
    }
  }

  const sqlDeleteVatSnapshots = db.prepare(`
    DELETE FROM snapshots
    WHERE vatID = ?
  `);

  const sqlGetSnapshotList = db.prepare(`
    SELECT snapPos
    FROM snapshots
    WHERE vatID = ?
    ORDER BY snapPos
  `);
  sqlGetSnapshotList.pluck(true);

  /**
   * Delete all snapshots for a given vat (for use when, e.g., a vat is terminated)
   *
   * @param {string} vatID
   */
  function deleteVatSnapshots(vatID) {
    ensureTxn();
    const deletions = sqlGetSnapshotList.all(vatID);
    for (const snapPos of deletions) {
      const exportRec = snapshotRec(vatID, snapPos, undefined);
      noteExport(snapshotMetadataKey(exportRec), undefined);
    }
    noteExport(currentSnapshotMetadataKey({ vatID }), undefined);
    sqlDeleteVatSnapshots.run(vatID);
  }

  const sqlGetSnapshotInfo = db.prepare(`
    SELECT snapPos, hash, uncompressedSize, compressedSize
    FROM snapshots
    WHERE vatID = ? AND inUse = 1
  `);

  /**
   * Find out everything there is to know about a given vat's current snapshot
   * aside from the snapshot blob itself.
   *
   * @param {string} vatID
   *
   * @returns {SnapshotInfo}
   */
  function getSnapshotInfo(vatID) {
    return /** @type {SnapshotInfo} */ (sqlGetSnapshotInfo.get(vatID));
  }

  const sqlHasHash = db.prepare(`
    SELECT COUNT(*)
    FROM snapshots
    WHERE vatID = ? AND hash = ?
  `);
  sqlHasHash.pluck(true);

  /**
   * Test if a vat has a specific snapshot identified by its hash.
   *
   * Note: this is for use by testing and debugging code; normal clients of
   * snapStore shouldn't call this.
   *
   * @param {string} vatID
   * @param {string} hash
   *
   * @returns {boolean}
   */
  function hasHash(vatID, hash) {
    return !!sqlHasHash.get(vatID, hash);
  }

  const sqlDeleteSnapshotByHash = db.prepare(`
    DELETE FROM snapshots
    WHERE vatID = ? AND hash = ?
  `);

  /**
   * Delete a specific snapshot identified by its hash.
   *
   * Note: this is for use by testing and debugging code; normal clients of
   * snapStore shouldn't call this.
   *
   * @param {string} vatID
   * @param {string} hash
   */
  function deleteSnapshotByHash(vatID, hash) {
    ensureTxn();
    sqlDeleteSnapshotByHash.run(vatID, hash);
  }

  const sqlGetSnapshotMetadata = db.prepare(`
    SELECT vatID, snapPos, hash, uncompressedSize, compressedSize, inUse
    FROM snapshots
    WHERE inUse IS ?
    ORDER BY vatID, snapPos
  `);

  /**
   * Obtain artifact metadata records for spanshots contained in this store.
   *
   * @param {boolean} includeHistorical  If true, include all metadata that is
   *   present in the store regardless of its currency; if false, only include
   *   the metadata that is part of the swingset's active operational state.
   *
   * Note: in the currently anticipated operational mode, this flag should
   * always be set to `true`, because *all* snapshot metadata is, for now,
   * considered part of the consensus set.  This metadata is being retained for
   * diagnostic purposes and as a hedge against possible future need.  While
   * such a need seems highly unlikely, the future is uncertain and it will be
   * easier to purge this data later than to recover it if it is lost.  However,
   * the flag itself is present in case future operational policy allows for
   * pruning historical metadata, for example after further analysis and
   * practical experience tells us that it will not be needed.
   *
   * @yields {readonly [key: string, value: string]}
   * @returns {IterableIterator<readonly [key: string, value: string]>}
   */
  function* getExportRecords(includeHistorical = true) {
    for (const rec of sqlGetSnapshotMetadata.iterate(1)) {
      const exportRec = snapshotRec(rec.vatID, rec.snapPos, rec.hash, 1);
      const exportKey = snapshotMetadataKey(rec);
      yield [exportKey, JSON.stringify(exportRec)];
      yield [currentSnapshotMetadataKey(rec), snapshotArtifactName(rec)];
    }
    if (includeHistorical) {
      for (const rec of sqlGetSnapshotMetadata.iterate(null)) {
        const exportRec = snapshotRec(rec.vatID, rec.snapPos, rec.hash, 0);
        yield [snapshotMetadataKey(rec), JSON.stringify(exportRec)];
      }
    }
  }

  async function* getArtifactNames(includeHistorical) {
    for (const rec of sqlGetSnapshotMetadata.iterate(1)) {
      yield snapshotArtifactName(rec);
    }
    if (includeHistorical) {
      for (const rec of sqlGetSnapshotMetadata.iterate(null)) {
        yield snapshotArtifactName(rec);
      }
    }
  }

  /**
   * @param {string} name  Artifact name of the snapshot
   * @param {SwingStoreExporter} exporter  Whence to get the bits
   * @param {object} info  Metadata describing the artifact
   * @returns {Promise<void>}
   */
  async function importSnapshot(name, exporter, info) {
    const parts = name.split('.');
    const [type, vatID, rawEndPos] = parts;
    // prettier-ignore
    parts.length === 3 && type === 'snapshot' ||
      Fail`expected snapshot name of the form 'snapshot.{vatID}.{snapPos}', saw '${q(name)}'`;
    // prettier-ignore
    info.vatID === vatID ||
      Fail`snapshot name says vatID ${q(vatID)}, metadata says ${q(info.vatID)}`;
    const snapPos = Number(rawEndPos);
    // prettier-ignore
    info.snapPos === snapPos ||
      Fail`snapshot name says snapPos ${q(snapPos)}, metadata says ${q(info.snapPos)}`;

    const artifactChunks = exporter.getArtifact(name);
    const inStream = Readable.from(artifactChunks);
    let size = 0;
    inStream.on('data', chunk => (size += chunk.length));
    const hashStream = createHash('sha256');
    const gzip = createGzip();
    inStream.pipe(hashStream);
    inStream.pipe(gzip);
    const compressedArtifact = await buffer(gzip);
    await finished(inStream);
    const hash = hashStream.digest('hex');
    // prettier-ignore
    info.hash === hash ||
      Fail`snapshot ${q(name)} hash is ${q(hash)}, metadata says ${q(info.hash)}`;
    ensureTxn();
    sqlSaveSnapshot.run(
      vatID,
      snapPos,
      info.inUse ? 1 : null,
      info.hash,
      size,
      compressedArtifact.length,
      compressedArtifact,
    );
  }

  const sqlListAllSnapshots = db.prepare(`
    SELECT vatID, snapPos, inUse, hash, uncompressedSize, compressedSize
    FROM snapshots
    ORDER BY vatID, snapPos
  `);

  /**
   * debug function to list all snapshots
   *
   */
  function* listAllSnapshots() {
    yield* sqlListAllSnapshots.iterate();
  }

  const sqlDumpCurrentSnapshots = db.prepare(`
    SELECT vatID, snapPos, hash, compressedSnapshot, inUse
    FROM snapshots
    WHERE inUse = 1
    ORDER BY vatID, snapPos
  `);

  const sqlDumpAllSnapshots = db.prepare(`
    SELECT vatID, snapPos, hash, compressedSnapshot, inUse
    FROM snapshots
    ORDER BY vatID, snapPos
  `);

  /**
   * debug function to dump active snapshots
   *
   * @param {boolean} [includeHistorical]
   */
  function dumpSnapshots(includeHistorical = true) {
    const sql = includeHistorical
      ? sqlDumpAllSnapshots
      : sqlDumpCurrentSnapshots;
    const dump = {};
    for (const row of sql.iterate()) {
      const { vatID, snapPos, hash, compressedSnapshot, inUse } = row;
      if (!dump[vatID]) {
        dump[vatID] = [];
      }
      dump[vatID].push({
        snapPos,
        hash,
        compressedSnapshot,
        inUse: inUse ? 1 : 0,
      });
    }
    return dump;
  }

  return harden({
    saveSnapshot,
    loadSnapshot,
    deleteAllUnusedSnapshots,
    deleteVatSnapshots,
    stopUsingLastSnapshot,
    getSnapshotInfo,
    getExportRecords,
    getArtifactNames,
    exportSnapshot,
    importSnapshot,

    hasHash,
    listAllSnapshots,
    dumpSnapshots,
    deleteSnapshotByHash,
  });
}
