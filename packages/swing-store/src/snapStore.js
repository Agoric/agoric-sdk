// @ts-check
import { createHash } from 'crypto';
import { pipeline } from 'stream';
import { createGzip, createGunzip } from 'zlib';
import { assert, details as d } from '@agoric/assert';
import { promisify } from 'util';

/**
 * @typedef {object} SnapshotInfo
 * @property {string} filePath absolute path of (compressed) snapshot
 * @property {string} hash sha256 hash of (uncompressed) snapshot
 * @property {number} rawByteCount size of (uncompressed) snapshot
 * @property {number} rawSaveSeconds time to save (uncompressed) snapshot
 * @property {number} hashSeconds time to calculate snapshot hash
 * @property {number} [compressedByteCount] size of (compressed) snapshot
 * @property {number} [compressSeconds] time to compress and save snapshot
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

const pipe = promisify(pipeline);

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
 *   tmpName: typeof import('tmp').tmpName,
 *   createReadStream: typeof import('fs').createReadStream,
 *   createWriteStream: typeof import('fs').createWriteStream,
 *   measureSeconds: <T>(fn: () => Promise<T>) => Promise<{ result: T, duration: number }>,
 *   open: typeof import('fs').promises.open,
 *   resolve: typeof import('path').resolve,
 *   rename: typeof import('fs').promises.rename,
 *   stat: typeof import('fs').promises.stat,
 *   unlink: typeof import('fs').promises.unlink,
 * }} io
 * @param {object} [options]
 * @param {boolean | undefined} [options.keepSnapshots]
 * @returns {SnapStore}
 */
export function makeSnapStore(
  root,
  {
    tmpName,
    createReadStream,
    createWriteStream,
    measureSeconds,
    open,
    resolve,
    rename,
    stat,
    unlink,
  },
  { keepSnapshots = false } = {},
) {
  /** @type {(opts: unknown) => Promise<string>} */
  const ptmpName = promisify(tmpName);

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
   * Creates a file atomically by moving in place a temp file
   * populated by a callback.
   *
   * @param {string} destFilePath absolute path of file to be written
   * @param { (name: string) => Promise<void> } writeContents
   * @returns {Promise<void>}
   */
  async function atomicWrite(destFilePath, writeContents) {
    // Atomicity requires remaining on the same filesystem,
    // so we perform all operations in the destination directory.
    const dir = resolve(destFilePath, '..');
    const tmpFilePath = await ptmpName({
      tmpdir: dir,
      template: 'atomic-XXXXXX',
    });
    try {
      await writeContents(tmpFilePath);
      await rename(tmpFilePath, destFilePath);
    } finally {
      try {
        await unlink(tmpFilePath);
      } catch (ignore) {
        // ignore
      }
    }
  }

  /**
   * Populates destPath by streaming the contents of srcPath through a transform.
   *
   * @param {string} srcPath
   * @param {NodeJS.ReadWriteStream} transform
   * @param {string} destPath
   * @param {object} [options]
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

  /** @param {unknown} hash */
  function hashPath(hash) {
    assert.typeof(hash, 'string');
    assert(!hash.includes('/'));
    return resolve(root, `${hash}.gz`);
  }

  /** @type { Set<string> } */
  const toDelete = new Set();

  /**
   * @param {(filePath: string) => Promise<void>} saveRaw
   * @returns {Promise<SnapshotInfo>}
   */
  async function save(saveRaw) {
    return withTempName(async tmpSnapPath => {
      const { duration: rawSaveSeconds } = await measureSeconds(() =>
        saveRaw(tmpSnapPath),
      );
      const { size: rawByteCount } = await stat(tmpSnapPath);
      const { result: hash, duration: hashSeconds } = await measureSeconds(() =>
        fileHash(tmpSnapPath),
      );
      toDelete.delete(hash);
      const filePath = hashPath(hash);
      const info = {
        filePath,
        hash,
        rawByteCount,
        rawSaveSeconds,
        hashSeconds,
      };
      const fileStat = await stat(filePath).catch(e => {
        if (e.code === 'ENOENT') {
          return undefined;
        }
        throw e;
      });
      if (fileStat) {
        return freeze(info);
      }
      const { duration: compressSeconds } = await measureSeconds(() =>
        atomicWrite(filePath, tmpGzPath =>
          filter(tmpSnapPath, createGzip(), tmpGzPath, { flush: true }),
        ),
      );
      const { size: compressedByteCount } = await stat(filePath);
      return freeze({ ...info, compressSeconds, compressedByteCount });
    }, 'save-raw');
  }

  /**
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  function has(hash) {
    return stat(hashPath(hash))
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
      await filter(hashPath(hash), createGunzip(), tmpFilePath);
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
    hashPath(hash); // check constraints early
    toDelete.add(hash);
  }

  async function commitDeletes(ignoreErrors = false) {
    const errors = [];

    await Promise.all(
      [...toDelete].map(async hash => {
        const fullPath = hashPath(hash);
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
