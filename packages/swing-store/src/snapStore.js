// @ts-check
import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { finished as finishedCallback, Readable } from 'stream';
import { promisify } from 'util';
import { createGzip, createGunzip } from 'zlib';
import { assert, details as d } from '@agoric/assert';
import { aggregateTryFinally, PromiseAllOrErrors } from '@agoric/internal';
import { fsStreamReady } from '@agoric/internal/src/fs-stream.js';

/**
 * @typedef {object} SnapshotResult
 * @property {string} hash sha256 hash of (uncompressed) snapshot
 * @property {number} uncompressedSize size of (uncompressed) snapshot
 * @property {number} rawSaveSeconds time to save (uncompressed) snapshot
 * @property {number} compressedSize size of (compressed) snapshot
 * @property {number} compressSeconds time to compress and save snapshot
 */

/**
 * @typedef {object} SnapshotInfo
 * @property {number} endPos
 * @property {string} hash
 * @property {number} uncompressedSize
 * @property {number} compressedSize
 */

/**
 * @typedef { import('./swingStore').SwingStoreExporter } SwingStoreExporter
 *
 * @typedef {{
 *   loadSnapshot: <T>(vatID: string, loadRaw: (filePath: string) => Promise<T>) => Promise<T>,
 *   saveSnapshot: (vatID: string, endPos: number, saveRaw: (filePath: string) => Promise<void>) => Promise<SnapshotResult>,
 *   deleteAllUnusedSnapshots: () => void,
 *   deleteVatSnapshots: (vatID: string) => void,
 *   getSnapshotInfo: (vatID: string) => SnapshotInfo,
 * }} SnapStore
 *
 * @typedef {{
 *   exportSnapshot: (vatID: string, endPos: number) => AsyncIterable<Uint8Array>,
 *   importSnapshot: (artifactName: string, exporter: SwingStoreExporter, artifactMetadata: Map) => void,
 *   getExportRecords: (includeHistorical: boolean) => Iterable<[key: string, value: string]>,
 *   getArtifactNames: (includeHistorical: boolean) => AsyncIterable<string>,
 * }} SnapStoreInternal
 *
 * @typedef {{
 *   hasHash: (vatID: string, hash: string) => boolean,
 *   dumpSnapshots: (includeHistorical?: boolean) => {},
 *   deleteSnapshotByHash: (vatID: string, hash: string) => void,
 * }} SnapStoreDebug
 *
 */

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

const finished = promisify(finishedCallback);

const noPath = /** @type {import('fs').PathLike} */ (
  /** @type {unknown} */ (undefined)
);

/**
 * @param {*} db
 * @param {{
 *   createReadStream: typeof import('fs').createReadStream,
 *   createWriteStream: typeof import('fs').createWriteStream,
 *   measureSeconds: ReturnType<typeof import('@agoric/internal').makeMeasureSeconds>,
 *   open: typeof import('fs').promises.open,
 *   stat: typeof import('fs').promises.stat,
 *   tmpFile: typeof import('tmp').file,
 *   tmpName: typeof import('tmp').tmpName,
 *   unlink: typeof import('fs').promises.unlink,
 * }} io
 * @param {(key: string, value: string) => void} noteExport
 * @param {object} [options]
 * @param {boolean | undefined} [options.keepSnapshots]
 * @returns {SnapStore & SnapStoreInternal & SnapStoreDebug}
 */
export function makeSnapStore(
  db,
  {
    createReadStream,
    createWriteStream,
    measureSeconds,
    stat,
    tmpFile,
    tmpName,
    unlink,
  },
  noteExport = () => {},
  { keepSnapshots = false } = {},
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      vatID TEXT,
      endPos INTEGER,
      inUse INTEGER,
      hash TEXT,
      uncompressedSize INTEGER,
      compressedSize INTEGER,
      compressedSnapshot BLOB,
      PRIMARY KEY (vatID, endPos)
    )
  `);

  /** @type {(opts: unknown) => Promise<string>} */
  const ptmpName = promisify(tmpName);

  // Manually promisify `tmpFile` to preserve its post-`error` callback arguments.
  const ptmpFile = (options = {}) => {
    return new Promise((resolve, reject) => {
      tmpFile(options, (err, path, fd, cleanupCallback) => {
        if (err) {
          reject(err);
        } else {
          resolve({ path, fd, cleanup: cleanupCallback });
        }
      });
    });
  };

  const sqlDeleteAllUnusedSnapshots = db.prepare(`
    DELETE FROM snapshots
    WHERE inUse = 0
  `);

  /**
   * Delete all extant snapshots from the snapstore that are not currently in
   * use by some vat.
   */
  function deleteAllUnusedSnapshots() {
    sqlDeleteAllUnusedSnapshots.run();
  }

  function snapshotArtifactName(rec) {
    return `snapshot.${rec.vatID}.${rec.endPos}`;
  }

  function snapshotMetadataKey(rec) {
    return `snapshot.${rec.vatID}.${rec.endPos}`;
  }

  function currentSnapshotMetadataKey(rec) {
    return `snapshot.${rec.vatID}.current`;
  }

  function snapshotRec(vatID, endPos, hash) {
    return { vatID, endPos, hash };
  }

  const sqlStopUsingLastSnapshot = db.prepare(`
    UPDATE snapshots
    SET inUse = 0
    WHERE inUse = 1 AND vatID = ?
  `);

  const sqlSaveSnapshot = db.prepare(`
    INSERT OR REPLACE INTO snapshots
      (vatID, endPos, inUse, hash, uncompressedSize, compressedSize, compressedSnapshot)
    VALUES (?, ?, 1, ?, ?, ?, ?)
  `);

  /**
   * Generates a new XS heap snapshot, stores a gzipped copy of it into the
   * snapshots table, and reports information about the process, including
   * snapshot size and timing metrics.
   *
   * @param {string} vatID
   * @param {number} endPos
   * @param {(filePath: string) => Promise<void>} saveRaw
   * @returns {Promise<SnapshotResult>}
   */
  async function saveSnapshot(vatID, endPos, saveRaw) {
    const cleanup = [];
    return aggregateTryFinally(
      async () => {
        // TODO: Refactor to use tmpFile rather than tmpName.
        const tmpSnapPath = await ptmpName({ template: 'save-raw-XXXXXX.xss' });
        cleanup.push(() => unlink(tmpSnapPath));
        const { duration: rawSaveSeconds } = await measureSeconds(async () =>
          saveRaw(tmpSnapPath),
        );
        const { size: uncompressedSize } = await stat(tmpSnapPath);

        // Perform operations that read snapshot data in parallel.
        // We still serialize the stat and opening of tmpSnapPath
        // and creation of tmpGzPath for readability, but we could
        // parallelize those as well if the cost is significant.
        const snapReader = createReadStream(tmpSnapPath);
        cleanup.push(() => {
          snapReader.destroy();
        });

        await fsStreamReady(snapReader);

        const hashStream = createHash('sha256');
        const gzip = createGzip();
        let compressedSize = 0;

        const { result: hash, duration: compressSeconds } =
          await measureSeconds(async () => {
            snapReader.pipe(hashStream);
            const compressedSnapshot = await buffer(snapReader.pipe(gzip));
            await finished(snapReader);

            const h = hashStream.digest('hex');
            sqlStopUsingLastSnapshot.run(vatID);
            if (!keepSnapshots) {
              deleteAllUnusedSnapshots();
            }
            compressedSize = compressedSnapshot.length;
            sqlSaveSnapshot.run(
              vatID,
              endPos,
              h,
              uncompressedSize,
              compressedSize,
              compressedSnapshot,
            );
            const rec = snapshotRec(vatID, endPos, h);
            const exportKey = snapshotMetadataKey(rec);
            noteExport(exportKey, JSON.stringify(rec));
            noteExport(
              currentSnapshotMetadataKey(rec),
              snapshotArtifactName(rec),
            );
            return h;
          });

        return harden({
          hash,
          uncompressedSize,
          rawSaveSeconds,
          compressSeconds,
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
    SELECT compressedSnapshot
    FROM snapshots
    WHERE vatID = ? AND endPos = ?
  `);
  sqlGetSnapshot.pluck(true);

  /**
   * @param {string} vatID
   * @param {number} endPos
   * @returns {AsyncIterable<Uint8Array>}
   * @yields {Uint8Array}
   */
  async function* exportSnapshot(vatID, endPos) {
    const compressedSnapshot = sqlGetSnapshot.get(vatID, endPos);
    const gzReader = Readable.from(compressedSnapshot);
    const unzipper = createGunzip();
    const snapshotReader = gzReader.pipe(unzipper);
    yield* snapshotReader;
  }

  const sqlLoadSnapshot = db.prepare(`
    SELECT hash, compressedSnapshot
    FROM snapshots
    WHERE vatID = ?
    ORDER BY endPos DESC
    LIMIT 1
  `);

  /**
   * Loads the most recent snapshot for a given vat.
   *
   * @param {string} vatID
   * @param {(filePath: string) => Promise<T>} loadRaw
   * @template T
   */
  async function loadSnapshot(vatID, loadRaw) {
    const cleanup = [];
    return aggregateTryFinally(
      async () => {
        const loadInfo = sqlLoadSnapshot.get(vatID);
        assert(loadInfo, `no snapshot available for vat ${vatID}`);
        const { hash, compressedSnapshot } = loadInfo;
        const gzReader = Readable.from(compressedSnapshot);
        cleanup.push(() => gzReader.destroy());
        const snapReader = gzReader.pipe(createGunzip());

        const {
          path,
          fd,
          cleanup: tmpCleanup,
        } = await ptmpFile({ template: `load-${hash}-XXXXXX.xss` });
        cleanup.push(tmpCleanup);
        const snapWriter = createWriteStream(noPath, {
          fd,
          autoClose: false,
        });
        cleanup.push(() => snapWriter.close());

        await fsStreamReady(snapWriter);
        const hashStream = createHash('sha256');
        snapReader.pipe(hashStream);
        snapReader.pipe(snapWriter);

        await Promise.all([finished(gzReader), finished(snapWriter)]);
        const h = hashStream.digest('hex');
        h === hash || assert.fail(d`actual hash ${h} !== expected ${hash}`);
        const snapWriterClose = cleanup.pop();
        snapWriterClose();

        return loadRaw(path);
      },
      async () => {
        await PromiseAllOrErrors(
          cleanup.reverse().map(fn => Promise.resolve().then(() => fn())),
        );
      },
    );
  }

  const sqlDeleteVatSnapshots = db.prepare(`
    DELETE FROM snapshots
    WHERE vatID = ?
  `);

  /**
   * Delete all snapshots for a given vat (for use when, e.g., a vat is terminated)
   *
   * @param {string} vatID
   */
  function deleteVatSnapshots(vatID) {
    sqlDeleteVatSnapshots.run(vatID);
  }

  const sqlGetSnapshotInfo = db.prepare(`
    SELECT endPos, hash, uncompressedSize, compressedSize
    FROM snapshots
    WHERE vatID = ?
    ORDER BY endPos DESC
    LIMIT 1
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
    sqlDeleteSnapshotByHash.run(vatID, hash);
  }

  const sqlGetSnapshotMetadata = db.prepare(`
    SELECT vatID, endPos, hash, uncompressedSize, compressedSize
    FROM snapshots
    WHERE inUse = ?
    ORDER BY vatID, endPos
  `);

  /**
   * @param {boolean} includeHistorical
   * @yields {[key: string, value: string]}
   * @returns {Iterable<[key: string, value: string]>}
   */
  function* getExportRecords(includeHistorical) {
    for (const rec of sqlGetSnapshotMetadata.iterate(1)) {
      const exportRec = snapshotRec(rec.vatID, rec.endPos, rec.hash);
      const exportKey = snapshotMetadataKey(rec);
      yield [exportKey, JSON.stringify(exportRec)];
      yield [currentSnapshotMetadataKey(rec), snapshotArtifactName(rec)];
    }
    if (includeHistorical) {
      for (const rec of sqlGetSnapshotMetadata.iterate(0)) {
        const exportRec = snapshotRec(rec.vatID, rec.endPos, rec.hash);
        yield [snapshotMetadataKey(rec), JSON.stringify(exportRec)];
      }
    }
  }

  async function* getArtifactNames(includeHistorical) {
    for (const rec of sqlGetSnapshotMetadata.iterate(1)) {
      yield snapshotArtifactName(rec);
    }
    if (includeHistorical) {
      for (const rec of sqlGetSnapshotMetadata.iterate(0)) {
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
    assert(
      parts.length === 3 && type === 'snapshot',
      `expected snapshot name of the form 'snapshot.{vatID}.{endPos}', saw '${name}'`,
    );
    assert(
      info.vatID === vatID,
      `snapshot name says vatID ${vatID}, metadata says ${info.vatID}`,
    );
    const endPos = Number(rawEndPos);
    assert(
      info.endPos === endPos,
      `snapshot name says endPos ${endPos}, metadata says ${info.endPos}`,
    );

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
    assert(
      info.hash === hash,
      `snapshot ${name} hash is ${hash}, metadata says ${info.hash}`,
    );
    sqlSaveSnapshot.run(
      vatID,
      endPos,
      info.hash,
      size,
      compressedArtifact.length,
      compressedArtifact,
    );
  }

  const sqlDumpCurrentSnapshots = db.prepare(`
    SELECT vatID, endPos, hash, compressedSnapshot
    FROM snapshots
    WHERE inUse = 1
    ORDER BY vatID, endPos
  `);

  const sqlDumpAllSnapshots = db.prepare(`
    SELECT vatID, endPos, hash, compressedSnapshot
    FROM snapshots
    ORDER BY vatID, endPos
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
      const { vatID, endPos, hash, compressedSnapshot } = row;
      dump[vatID] = { endPos, hash, compressedSnapshot };
    }
    return dump;
  }

  return harden({
    saveSnapshot,
    loadSnapshot,
    deleteAllUnusedSnapshots,
    deleteVatSnapshots,
    getSnapshotInfo,
    getExportRecords,
    getArtifactNames,
    exportSnapshot,
    importSnapshot,

    hasHash,
    dumpSnapshots,
    deleteSnapshotByHash,
  });
}
