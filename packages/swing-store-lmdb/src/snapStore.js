// @ts-check
import { createHash } from 'crypto';
import { pipeline } from 'stream';
import { createGzip, createGunzip } from 'zlib';
import { assert, details as d } from '@agoric/assert';
import { promisify } from 'util';

const pipe = promisify(pipeline);

const { freeze } = Object;

/**
 * @param {string} root
 * @param {{
 *   tmpName: typeof import('tmp').tmpName,
 *   existsSync: typeof import('fs').existsSync
 *   createReadStream: typeof import('fs').createReadStream,
 *   createWriteStream: typeof import('fs').createWriteStream,
 *   resolve: typeof import('path').resolve,
 *   rename: typeof import('fs').promises.rename,
 *   unlink: typeof import('fs').promises.unlink,
 * }} io
 */
export function makeSnapStore(
  root,
  {
    tmpName,
    existsSync,
    createReadStream,
    createWriteStream,
    resolve,
    rename,
    unlink,
  },
) {
  /** @type {(opts: unknown) => Promise<string>} */
  const ptmpName = promisify(tmpName);
  /**
   * @param { (name: string) => Promise<T> } thunk
   * @param { string= } prefix
   * @returns { Promise<T> }
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
   * @param {string} dest
   * @param { (name: string) => Promise<T> } thunk
   * @returns { Promise<T> }
   * @template T
   */
  async function atomicWrite(dest, thunk) {
    const tmp = await ptmpName({ tmpdir: root, template: 'atomic-XXXXXX' });
    let result;
    try {
      result = await thunk(tmp);
      await rename(tmp, resolve(root, dest));
    } finally {
      try {
        await unlink(tmp);
      } catch (ignore) {
        // ignore
      }
    }
    return result;
  }

  /** @type {(input: string, f: NodeJS.ReadWriteStream, output: string) => Promise<void>} */
  async function filter(input, f, output) {
    const source = createReadStream(input);
    const destination = createWriteStream(output);
    await pipe(source, f, destination);
  }

  /** @type {(filename: string) => Promise<string>} */
  async function fileHash(filename) {
    const hash = createHash('sha256');
    const input = createReadStream(filename);
    await pipe(input, hash);
    return hash.digest('hex');
  }

  /** @type { Set<string> } */
  const toDelete = new Set();

  /**
   * @param {(fn: string) => Promise<void>} saveRaw
   * @returns { Promise<string> } sha256 hash of (uncompressed) snapshot
   */
  async function save(saveRaw) {
    return withTempName(async snapFile => {
      await saveRaw(snapFile);
      const h = await fileHash(snapFile);
      if (toDelete.has(h)) {
        toDelete.delete(h);
      }
      // console.log('save', { snapFile, h });
      if (existsSync(`${h}.gz`)) return h;
      await atomicWrite(`${h}.gz`, gztmp =>
        filter(snapFile, createGzip(), gztmp),
      );
      return h;
    }, 'save-raw');
  }

  /**
   * @param {string} hash
   * @param {(fn: string) => Promise<T>} loadRaw
   * @template T
   */
  async function load(hash, loadRaw) {
    assert(!hash.includes('/'));

    return withTempName(async raw => {
      await filter(resolve(root, `${hash}.gz`), createGunzip(), raw);
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
    toDelete.add(hash);
  }

  /**
   * @throws { Error } if any call to unlink() fails
   */
  function commitDeletes() {
    for (const hash of toDelete) {
      assert(!hash.includes('/'));
      unlink(resolve(root, `${hash}.gz`));
    }
  }

  return freeze({ load, save, prepareToDelete, commitDeletes });
}
