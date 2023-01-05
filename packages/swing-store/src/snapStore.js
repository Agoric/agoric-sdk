// @ts-check
import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { finished as finishedCallback, Readable } from 'stream';
import { promisify } from 'util';
import { createGzip, createGunzip } from 'zlib';
import { assert, details as d } from '@agoric/assert';
import {
  aggregateTryFinally,
  fsStreamReady,
  PromiseAllOrErrors,
} from '@agoric/internal';

/**
 * @typedef {object} SnapshotInfo
 * @property {string} hash sha256 hash of (uncompressed) snapshot
 * @property {number} rawByteCount size of (uncompressed) snapshot
 * @property {number} rawSaveSeconds time to save (uncompressed) snapshot
 * @property {number} compressedByteCount size of (compressed) snapshot
 * @property {number} compressSeconds time to compress and save snapshot
 */

/**
 * @typedef {{
 *   has: (hash: string) => boolean,
 *   load: <T>(hash: string, loadRaw: (filePath: string) => Promise<T>) => Promise<T>,
 *   save: (saveRaw: (filePath: string) => Promise<void>) => Promise<SnapshotInfo>,
 *   deleteSnapshot: (hash: string) => void,
 * }} SnapStore
 */

/** @type {AssertFail} */
function fail() {
  assert.fail('snapStore not available in ephemeral swingStore');
}

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

/** @type {SnapStore} */
export const ephemeralSnapStore = {
  has: fail,
  load: fail,
  save: fail,
  deleteSnapshot: fail,
};

const finished = promisify(finishedCallback);

const { freeze } = Object;

const noPath = /** @type {import('fs').PathLike} */ (
  /** @type {unknown} */ (undefined)
);

/**
 * @param {*} db
 * @param {string} root
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
 * @param {object} [options]
 * @param {boolean | undefined} [options.keepSnapshots]
 * @returns {SnapStore}
 */
export function makeSnapStore(
  db,
  root,
  {
    createReadStream,
    createWriteStream,
    measureSeconds,
    stat,
    tmpFile,
    tmpName,
    unlink,
  },
  { keepSnapshots = false } = {},
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      hash TEXT,
      compressedSnapshot BLOB,
      PRIMARY KEY (hash)
    )
  `);
  const sqlSaveSnapshot = db.prepare(`
    INSERT INTO snapshots (hash, compressedSnapshot)
    VALUES (?, ?)
    ON CONFLICT DO NOTHING
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

  /**
   * Generates a new XS heap snapshot, stores a gzipped copy of it into the
   * snapshots table, and reports information about the process, including
   * snapshot size and timing metrics.
   *
   * @param {(filePath: string) => Promise<void>} saveRaw
   * @returns {Promise<SnapshotInfo>}
   */
  async function save(saveRaw) {
    const cleanup = [];
    return aggregateTryFinally(
      async () => {
        // TODO: Refactor to use tmpFile rather than tmpName.
        const tmpSnapPath = await ptmpName({ template: 'save-raw-XXXXXX.xss' });
        cleanup.push(() => unlink(tmpSnapPath));
        const { duration: rawSaveSeconds } = await measureSeconds(async () =>
          saveRaw(tmpSnapPath),
        );
        const { size: rawByteCount } = await stat(tmpSnapPath);

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
        let compressedByteCount = 0;

        const { result: hash, duration: compressSeconds } =
          await measureSeconds(async () => {
            snapReader.pipe(hashStream);
            const compressedSnapshot = await buffer(snapReader.pipe(gzip));
            await finished(snapReader);

            const h = hashStream.digest('hex');
            sqlSaveSnapshot.run(h, compressedSnapshot);
            compressedByteCount = compressedSnapshot.length;

            return h;
          });

        return freeze({
          hash,
          rawByteCount,
          rawSaveSeconds,
          compressSeconds,
          compressedByteCount,
        });
      },
      async () => {
        await PromiseAllOrErrors(
          cleanup.reverse().map(fn => Promise.resolve().then(() => fn())),
        );
      },
    );
  }

  const sqlHasHash = db.prepare(`
    SELECT COUNT(*)
    FROM snapshots
    WHERE hash = ?
  `);
  sqlHasHash.pluck(true);

  /**
   * @param {string} hash
   * @returns {boolean}
   */
  function has(hash) {
    return !!sqlHasHash.get(hash);
  }

  const sqlLoadSnapshot = db.prepare(`
    SELECT compressedSnapshot
    FROM snapshots
    WHERE hash = ?
  `);
  sqlLoadSnapshot.pluck(true);

  /**
   * @param {string} hash
   * @param {(filePath: string) => Promise<T>} loadRaw
   * @template T
   */
  async function load(hash, loadRaw) {
    const cleanup = [];
    return aggregateTryFinally(
      async () => {
        const compressedSnapshot = sqlLoadSnapshot.get(hash);
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

        const result = await loadRaw(path);
        return result;
      },
      async () => {
        await PromiseAllOrErrors(
          cleanup.reverse().map(fn => Promise.resolve().then(() => fn())),
        );
      },
    );
  }

  const sqlDeleteSnapshot = db.prepare(`
    DELETE FROM snapshots
    WHERE hash = ?
  `);

  /**
   * @param {string} hash
   */
  function deleteSnapshot(hash) {
    if (!keepSnapshots) {
      sqlDeleteSnapshot.run(hash);
    }
  }

  return freeze({ has, load, save, deleteSnapshot });
}
