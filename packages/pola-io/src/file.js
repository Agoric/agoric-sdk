// @ts-check

const { freeze } = Object;

// XXX: what hazards may not using endo assert.fail expose us to?
export const fail = reason => {
  throw Error(reason);
};
freeze(fail);

/**
 * Dynamic access
 *
 * @template {Record<string, any>} T
 * @param {Partial<T>} io
 * @returns {T}
 */
const dyn = io => {
  const it = new Proxy(io, {
    get(_t, p) {
      if (!(p in io)) {
        return () => fail(`no access to ${String(p)}`);
      }
      // @ts-expect-error tsc doesn't refine per p in o
      return io[p];
    },
  });
  return /** @type {T} */ (it);
};

/**
 * @template [T=any]
 * @typedef {{
 *   join(...segments: string[]): T;
 *   toString: () => string;
 *   basename: () => string;
 *   relative(to: string): string;
 * }} PathNode
 *
 * XXX how to test / assert / declare that FileRd and FileWR extend PathNode?
 * interfaces?
 */

/**
 * @typedef {ReturnType<typeof makeFileRd>} FileRd
 */

/**
 * Reify file read access as an object.
 *
 * @param {string} root
 * @param {object} [io]
 * @param {Partial<typeof import('fs')>} [io.fs]
 * @param {Partial<typeof import('fs/promises')>} [io.fsp]
 * @param {Partial<typeof import('path')>} [io.path]
 */
export const makeFileRd = (root, { fs = {}, fsp = {}, path = {} } = {}) => {
  const [fsio, fspio, pathio] = [dyn(fs), dyn(fsp), dyn(path)];

  /** @param {string} there */
  const make = there => {
    const self = {
      toString: () => there,
      /** @param {string[]} segments */
      join: (...segments) => make(pathio.join(there, ...segments)),
      /** @param {string} to */
      relative: to => pathio.relative(there, to),
      stat: () => fspio.stat(there),
      /**
       * @param {BufferEncoding | { encoding?: null | BufferEncoding; flag?: string; } | null} [options]
       */
      read: options => fspio.readFile(there, options),
      readText: () => fspio.readFile(there, 'utf8'),
      readJSON: () => self.readText().then(txt => JSON.parse(txt)),
      /** @param {string} [suffix] */
      basename: suffix => pathio.basename(there, suffix),
      existsSync: () => fsio.existsSync(there),
      /** @returns {Promise<FileRd[]>} */
      readdir: () =>
        fspio
          .readdir(there)
          .then(files => files.map(segment => self.join(segment))),
    };
    return freeze(self);
  };
  return make(root);
};
freeze(makeFileRd);

/**
 * Reify file read/write access as an object.
 *
 * @param {string} root
 * @param {object} [io]
 * @param {Partial<typeof import('fs')>} [io.fs]
 * @param {Partial<typeof import('fs/promises')>} [io.fsp]
 * @param {Partial<typeof import('path')>} [io.path]
 *
 * @typedef {ReturnType<typeof makeFileRW>} FileRW
 */
export const makeFileRW = (root, { fs = {}, fsp = {}, path = {} } = {}) => {
  // XXX share dyn with makeFileRd?
  const [fspio, pathio] = [dyn(fsp), dyn(path)];
  let atomicWriteSequence = 0;

  /** @param {string} there */
  const make = there => {
    const ro = makeFileRd(there, { fs, fsp, path });
    const self = {
      toString: () => there,
      readOnly: () => ro,
      /** @param {string[]} segments */
      join: (...segments) => make(pathio.join(there, ...segments)),
      /**
       * @param {string | Uint8Array} data
       * @param {*} [options]
       */
      write: (data, options) => fspio.writeFile(there, data, options),
      writeText: text => fspio.writeFile(there, text, 'utf8'),
      /**
       * @param {string | Uint8Array} data
       * @param {{ now?: () => number; pid?: number; options?: any }} [atomic]
       */
      writeAtomic: async (data, atomic = {}) => {
        const { now = Date.now, pid = process.pid, options } = atomic;
        atomicWriteSequence += 1;
        const tempPath = `${there}.${pid}.${now()}.${atomicWriteSequence}.tmp`;
        await fspio.writeFile(tempPath, data, { ...(options || {}), flag: 'wx' });
        await fspio.rename(tempPath, there);
      },
      unlink: () => fspio.unlink(there),
      /**
       * @param {{ recursive?: boolean; mode?: string | number }} [options]
       */
      mkdir: (options = { recursive: true }) => fspio.mkdir(there, options),
      /**
       * @param {string} [prefix]
       */
      mkdtemp: async (prefix = '') => {
        const dirPath = await fspio.mkdtemp(pathio.join(there, prefix));
        return make(dirPath);
      },
      /**
       * @param {{ recursive?: boolean; force?: boolean; maxRetries?: number; retryDelay?: number }} [options]
       */
      rm: options => fspio.rm(there, options),
      /**
       * @param {{ recursive?: boolean; maxRetries?: number; retryDelay?: number }} [options]
       */
      rmdir: options => fspio.rmdir(there, options),
    };
    return freeze(self);
  };
  return make(root);
};
freeze(makeFileRW);

/**
 * Reify file read/write access where `join()` uses `path.resolve()`.
 *
 * @param {string} root
 * @param {object} [io]
 * @param {Partial<typeof import('fs')>} [io.fs]
 * @param {Partial<typeof import('fs/promises')>} [io.fsp]
 * @param {Partial<typeof import('path')>} [io.path]
 */
export const makeFileRWResolve = (
  root,
  { fs = {}, fsp = {}, path = {} } = {},
) => {
  const resolvePath = {
    ...path,
    join: (...segments) => dyn(path).resolve(...segments),
  };
  return makeFileRW(root, { fs, fsp, path: resolvePath });
};
freeze(makeFileRWResolve);
