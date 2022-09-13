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
 * @property {number | bigint} rawByteCount size of (uncompressed) snapshot
 * @property {number | bigint} rawSaveMillisec time to save (uncompressed) snapshot according to a provided "now" function
 * @property {number | bigint} [compressedByteCount] size of (compressed) snapshot
 * @property {number | bigint} [compressMillisec] time to compress and save snapshot according to a provided "now" function
 */

/**
 * @template T
 * @typedef {{
 *   has: (hash: string) => Promise<boolean>,
 *   load: (hash: string, loadRaw: (filePath: string) => Promise<T>) => Promise<T>,
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
 *
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
 * @template T
 * @param {string} root
 * @param {{
 *   tmpName: typeof import('tmp').tmpName,
 *   createReadStream: typeof import('fs').createReadStream,
 *   createWriteStream: typeof import('fs').createWriteStream,
 *   now: (() => number) | (() => bigint),
 *   open: typeof import('fs').promises.open,
 *   resolve: typeof import('path').resolve,
 *   rename: typeof import('fs').promises.rename,
 *   stat: typeof import('fs').promises.stat,
 *   unlink: typeof import('fs').promises.unlink,
 * }} io
 * @param {object} [options]
 * @param {boolean | undefined} [options.keepSnapshots]
 * @returns {SnapStore<T>}
 */
export function makeSnapStore(
  root,
  {
    tmpName,
    createReadStream,
    createWriteStream,
    now,
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
   * @param {(name: string) => Promise<T>} thunk
   * @param {string=} prefix
   * @returns {Promise<T>}
   * @template T
   */
  async function withTempName(thunk, prefix = 'tmp') {
    const name = await ptmpName({
      tmpdir: root,
      template: `${prefix}-XXXXXX.xss`,
    });
    let result;
    try {
      result = await thunk(name);
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
   * @param {string} dest absolute path of which root is a prefix
   * @param { (name: string) => Promise<void> } thunk
   * @returns { Promise<{ size: (number | bigint) }> }
   */
  async function atomicWrite(dest, thunk) {
    const tmp = await ptmpName({ tmpdir: root, template: 'atomic-XXXXXX' });
    let result;
    try {
      await thunk(tmp);
      await rename(tmp, dest);
      const { size } = await stat(dest);
      result = { size };
    } finally {
      try {
        await unlink(tmp);
      } catch (ignore) {
        // ignore
      }
    }
    return result;
  }

  /**
   * @param {string} input
   * @param {NodeJS.ReadWriteStream} f
   * @param {string} output
   * @param {object} [options]
   * @param {boolean} [options.flush]
   */
  async function filter(input, f, output, { flush = false } = {}) {
    const [source, destination] = await Promise.all([
      open(input, 'r'),
      open(output, 'wx'),
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
      await pipe(sourceStream, f, destinationStream);
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
    return withTempName(async snapFile => {
      const t0 = /** @type {number} */ (now());
      await saveRaw(snapFile);
      const rawSaveMillisec = /** @type {number} */ (now()) - t0;
      const { size: rawsize } = await stat(snapFile);
      const h = await fileHash(snapFile);
      if (toDelete.has(h)) {
        toDelete.delete(h);
      }
      // console.log('save', { snapFile, h });
      const filePath = hashPath(h);
      const info = { filePath, hash: h, rawByteCount: rawsize, rawSaveMillisec };
      const fileStat = await stat(filePath).catch(e => {
        if (e.code === 'ENOENT') {
          return undefined;
        }
        throw e;
      });
      if (fileStat) {
        return freeze(info);
      }
      const t1 = /** @type {number} */ (now());
      const { size: compressedByteCount } = await atomicWrite(filePath, gztmp =>
        filter(snapFile, createGzip(), gztmp, { flush: true }),
      );
      const compressMillisec = /** @type {number} */ (now()) - t1;
      return freeze({ ...info, compressMillisec, compressedByteCount });
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
    return withTempName(async raw => {
      await filter(hashPath(hash), createGunzip(), raw);
      const actual = await fileHash(raw);
      // console.log('load', { raw, hash });
      assert(actual === hash, d`actual hash ${actual} !== expected ${hash}`);
      // be sure to await loadRaw before exiting withTempName
      const result = await loadRaw(raw);
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
