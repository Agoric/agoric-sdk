// @ts-check
import { createHash } from 'crypto';
import { finished as finishedCallback, pipeline } from 'stream';
import { promisify } from 'util';
import { createGzip, createGunzip } from 'zlib';
import { assert, details as d } from '@agoric/assert';
import { aggregateTryFinally, PromiseAllOrErrors } from '@agoric/internal';

/**
 * @typedef {object} SnapshotInfo
 * @property {string} filePath absolute path of (compressed) snapshot
 * @property {string} hash sha256 hash of (uncompressed) snapshot
 * @property {boolean} newFile true if the compressed snapshot is new, false otherwise
 * @property {number} rawByteCount size of (uncompressed) snapshot
 * @property {number} rawSaveSeconds time to save (uncompressed) snapshot
 * @property {number} compressedByteCount size of (compressed) snapshot
 * @property {number} compressSeconds time to compress and save snapshot
 */

/**
 * @typedef {{
 *   has: (hash: string) => Promise<boolean>,
 *   load: <T>(hash: string, loadRaw: (filePath: string) => Promise<T>) => Promise<T>,
 *   save: (saveRaw: (filePath: string) => Promise<void>) => Promise<SnapshotInfo>,
 *   prepareToDelete: (hash: string) => void,
 *   commitDeletes: (ignoreErrors?: boolean) => Promise<void>,
 * }} SnapStore
 */

// TODO: Eliminate this promisify via e.g. `import { pipeline } from 'stream/promises'`.
const pipe = promisify(pipeline);
const finished = promisify(finishedCallback);

const { freeze } = Object;

const noPath = /** @type {import('fs').PathLike} */ (
  /** @type {unknown} */ (undefined)
);

/**
 * @param {import("fs").ReadStream | import("fs").WriteStream} stream
 * @returns {Promise<void>}
 */
export const fsStreamReady = stream =>
  new Promise((resolve, reject) => {
    if (stream.destroyed) {
      reject(new Error('Stream already destroyed'));
      return;
    }

    if (!stream.pending) {
      resolve();
      return;
    }

    const onReady = () => {
      cleanup(); // eslint-disable-line no-use-before-define
      resolve();
    };

    /** @param {Error} err */
    const onError = err => {
      cleanup(); // eslint-disable-line no-use-before-define
      reject(err);
    };

    const cleanup = () => {
      stream.off('ready', onReady);
      stream.off('error', onError);
    };

    stream.on('ready', onReady);
    stream.on('error', onError);
  });

/**
 * @param {string} root
 * @param {{
 *   createReadStream: typeof import('fs').createReadStream,
 *   createWriteStream: typeof import('fs').createWriteStream,
 *   fsync: typeof import('fs').fsync,
 *   measureSeconds: ReturnType<typeof import('@agoric/internal').makeMeasureSeconds>,
 *   open: typeof import('fs').promises.open,
 *   rename: typeof import('fs').promises.rename,
 *   resolve: typeof import('path').resolve,
 *   stat: typeof import('fs').promises.stat,
 *   tmpFile: typeof import('tmp').file,
 *   tmpName: typeof import('tmp').tmpName,
 *   unlink: typeof import('fs').promises.unlink,
 * }} io
 * @param {object} options
 * @param {boolean} [options.keepSnapshots]
 * @returns {SnapStore}
 */
export function makeSnapStore(
  root,
  {
    createReadStream,
    createWriteStream,
    measureSeconds,
    fsync,
    open,
    rename,
    resolve: pathResolve,
    stat,
    tmpFile,
    tmpName,
    unlink,
  },
  { keepSnapshots = false } = {},
) {
  /** @type {(opts: unknown) => Promise<string>} */
  const ptmpName = promisify(tmpName);

  /** @type {(fd: number) => Promise<void>} */
  const pfsync = promisify(fsync);

  /**
   * Returns the result of calling a function with the name
   * of a temp file that exists only for the duration of
   * its invocation.
   *
   * @param {(name: string) => Promise<T>} fn
   * @param {string=} prefix
   * @returns {Promise<T>}
   * @template T
   */
  async function withTempName(fn, prefix = 'tmp') {
    const name = await ptmpName({
      tmpdir: root,
      template: `${prefix}-XXXXXX.xss`,
    });
    let result;
    try {
      result = await fn(name);
    } finally {
      try {
        await unlink(name);
      } catch (ignore) {
        // ignore
      }
    }
    return result;
  }

  /**
   * Populates destPath by streaming the contents of srcPath through a transform.
   *
   * @param {string} srcPath
   * @param {NodeJS.ReadWriteStream} transform
   * @param {string} destPath
   * @param {object} options
   * @param {boolean} [options.flush]
   */
  async function filter(srcPath, transform, destPath, { flush = false } = {}) {
    const [source, destination] = await Promise.all([
      open(srcPath, 'r'),
      open(destPath, 'wx'),
    ]);
    const sourceStream = createReadStream(noPath, {
      fd: source.fd,
      autoClose: false,
    });
    const destinationStream = createWriteStream(noPath, {
      fd: destination.fd,
      autoClose: false,
    });
    try {
      await Promise.all([
        fsStreamReady(sourceStream),
        fsStreamReady(destinationStream),
      ]);
      await pipe(sourceStream, transform, destinationStream);
      if (flush) {
        await destination.sync();
      }
    } finally {
      await Promise.all([destination.close(), source.close()]);
    }
  }

  /** @type {(filename: string) => Promise<string>} */
  async function fileHash(filename) {
    const hash = createHash('sha256');
    const input = createReadStream(filename);
    await fsStreamReady(input);
    await pipe(input, hash);
    return hash.digest('hex');
  }

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

  /** @param {string} hash */
  function baseNameFromHash(hash) {
    assert.typeof(hash, 'string');
    assert(!hash.includes('/'));
    return `${hash}.gz`;
  }

  /** @param {string} hash */
  function fullPathFromHash(hash) {
    return pathResolve(root, baseNameFromHash(hash));
  }

  /** @type { Set<string> } */
  const toDelete = new Set();

  /**
   * Creates a new gzipped snapshot file in the `root` directory
   * and reports information about the process,
   * including file size and timing metrics.
   * Note that timing metrics exclude file open.
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

        // Create a file for the compressed snapshot in-place
        // to be atomically renamed once we know its name
        // from the hash of raw snapshot contents.
        const {
          path: tmpGzPath,
          fd: tmpGzFd,
          cleanup: tmpGzCleanup,
        } = await ptmpFile({ tmpdir: root });
        cleanup.push(tmpGzCleanup);
        const gzWriter = createWriteStream(noPath, {
          fd: tmpGzFd,
          autoClose: false,
        });
        cleanup.push(() => gzWriter.close());

        await Promise.all([fsStreamReady(snapReader), fsStreamReady(gzWriter)]);

        const hashStream = createHash('sha256');
        const gzip = createGzip();

        const { result: hash, duration: compressSeconds } =
          await measureSeconds(async () => {
            snapReader.pipe(hashStream);
            snapReader.pipe(gzip).pipe(gzWriter);

            await Promise.all([finished(snapReader), finished(gzWriter)]);

            const h = hashStream.digest('hex');
            await pfsync(tmpGzFd);

            const tmpGzClose = cleanup.pop();
            tmpGzClose();

            return h;
          });

        toDelete.delete(hash);
        const baseName = baseNameFromHash(hash);
        const filePath = pathResolve(root, baseName);
        const infoBase = {
          filePath,
          hash,
          rawByteCount,
          rawSaveSeconds,
          compressSeconds,
        };
        const fileStat = await stat(filePath).catch(err => {
          if (err.code !== 'ENOENT') {
            throw err;
          }
        });
        if (fileStat) {
          const { size: compressedByteCount } = fileStat;
          return freeze({
            ...infoBase,
            newFile: false,
            compressedByteCount,
          });
        }

        // Atomically rename.
        await rename(tmpGzPath, filePath);
        const { size: compressedByteCount } = await stat(filePath);
        return freeze({
          ...infoBase,
          newFile: true,
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

  /**
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  function has(hash) {
    return stat(fullPathFromHash(hash))
      .then(_stats => true)
      .catch(err => {
        if (err.code === 'ENOENT') {
          return false;
        }
        throw err;
      });
  }

  /**
   * @param {string} hash
   * @param {(filePath: string) => Promise<T>} loadRaw
   * @template T
   */
  async function load(hash, loadRaw) {
    return withTempName(async tmpFilePath => {
      await filter(fullPathFromHash(hash), createGunzip(), tmpFilePath);
      const actual = await fileHash(tmpFilePath);
      assert(actual === hash, d`actual hash ${actual} !== expected ${hash}`);
      const result = await loadRaw(tmpFilePath);
      return result;
    }, `${hash}-load`);
  }

  /**
   * @param {string} hash
   */
  function prepareToDelete(hash) {
    fullPathFromHash(hash); // check constraints early
    toDelete.add(hash);
  }

  async function commitDeletes(ignoreErrors = false) {
    const errors = [];

    await Promise.all(
      [...toDelete].map(async hash => {
        const fullPath = fullPathFromHash(hash);
        try {
          if (keepSnapshots !== true) {
            await unlink(fullPath);
          }
          toDelete.delete(hash);
        } catch (error) {
          if (ignoreErrors) {
            toDelete.delete(hash);
          } else {
            errors.push(error);
          }
        }
      }),
    );

    if (errors.length) {
      throw Error(JSON.stringify(errors));
    }
  }

  return freeze({ has, load, save, prepareToDelete, commitDeletes });
}
