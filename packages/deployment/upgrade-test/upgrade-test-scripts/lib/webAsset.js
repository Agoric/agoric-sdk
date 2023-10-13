// @ts-check
import { tmpName } from 'tmp';

const dbg = label => x => {
  label;
  // console.log(label, x);
  return x;
};

/**
 *
 * @param {string} root
 * @param {{ fetch: typeof fetch }} io
 *
 * @typedef {ReturnType<typeof makeWebRd>} TextRd
 */
export const makeWebRd = (root, { fetch }) => {
  /** @param {string} there */
  const make = there => {
    const join = (...segments) => {
      dbg('web.join')({ there, segments });
      let out = there;
      for (const segment of segments) {
        out = `${new URL(segment, out)}`;
      }
      return out;
    };
    const self = {
      toString: () => there,
      /** @param {string[]} segments */
      join: (...segments) => make(join(...segments)),
      readText: async () => {
        console.log('WebRd fetch:', there);
        const res = await fetch(there);
        if (!res.ok) {
          throw Error(`${res.statusText} @ ${there}`);
        }
        return res.text();
      },
    };
    return self;
  };
  return make(root);
};

/**
 * Reify file read access as an object.
 *
 * @param {string} root
 * @param {object} io
 * @param {Pick<typeof import('fs/promises'), 'stat' | 'readFile'>} io.fsp
 * @param {Pick<typeof import('path'), 'join'>} io.path
 *
 * @typedef {ReturnType<typeof makeFileRd>} FileRd
 */
export const makeFileRd = (root, { fsp, path }) => {
  /** @param {string} there */
  const make = there => {
    const self = {
      toString: () => there,
      /** @param {string[]} segments */
      join: (...segments) => make(path.join(there, ...segments)),
      stat: () => fsp.stat(there),
      readText: () => fsp.readFile(there, 'utf8'),
    };
    return self;
  };
  return make(root);
};

/**
 * Reify file read/write access as an object.
 *
 * @param {string} root
 * @param {object} io
 * @param {Pick<typeof import('fs/promises'),
 *         'stat' | 'readFile' | 'writeFile' | 'unlink' | 'mkdir' | 'rmdir'
 *        >} io.fsp
 * @param {Pick<typeof import('path'), 'join'>} io.path
 *
 * @typedef {ReturnType<typeof makeFileRW>} FileRW
 */
export const makeFileRW = (root, { fsp, path }) => {
  /** @param {string} there */
  const make = there => {
    const ro = makeFileRd(there, { fsp, path });
    const self = {
      toString: () => there,
      readOnly: () => ro,
      /** @param {string[]} segments */
      join: (...segments) =>
        make(dbg('FileRW join')(path.join(there, ...segments))),
      writeText: text => fsp.writeFile(there, text, 'utf8'),
      unlink: () => fsp.unlink(there),
      mkdir: () => fsp.mkdir(there, { recursive: true }),
      rmdir: () => fsp.rmdir(there),
    };
    return self;
  };
  return make(root);
};

/**
 * @param {TextRd} src
 * @param {FileRW} dest
 *
 * @typedef {ReturnType<typeof makeWebCache>} WebCache
 */
export const makeWebCache = (src, dest) => {
  /** @type {Map<string, Promise<FileRd>>} */
  const saved = new Map();

  /** @param {string} segment */
  const getFileP = segment => {
    const target = src.join(segment);
    const addr = `${target}`;
    const cached = saved.get(addr);
    if (cached) return cached;

    const f = dest.join(segment);
    /** @type {Promise<FileRd>} */
    const p = new Promise((resolve, reject) =>
      target
        .readText()
        .then(txt =>
          dest
            .mkdir()
            .then(() => f.writeText(txt).then(_ => resolve(f.readOnly()))),
        )
        .catch(reject),
    );
    saved.set(addr, p);
    return p;
  };

  const remove = async () => {
    await Promise.all([...saved.values()].map(p => p.then(f => f.unlink())));
    await dest.rmdir();
  };

  const self = {
    toString: () => `${src} -> ${dest}`,
    /** @param {string} segment */
    getText: async segment => {
      const fr = await getFileP(segment);
      return fr.readText();
    },
    /** @param {string} segment */
    storedPath: segment => getFileP(segment).then(f => f.toString()),
    /** @param {string} segment */
    size: async segment => {
      const fr = await getFileP(segment);
      const info = await fr.stat();
      return info.size;
    },
    remove,
  };
  return self;
};

const buildInfo = [
  {
    evals: [
      {
        permit: 'kread-invite-committee-permit.json',
        script: 'kread-invite-committee.js',
      },
    ],
    bundles: [
      'b1-51085a4ad4ac3448ccf039c0b54b41bd11e9367dfbd641deda38e614a7f647d7f1c0d34e55ba354d0331b1bf54c999fca911e6a796c90c30869f7fb8887b3024.json',
      'b1-a724453e7bfcaae1843be4532e18c1236c3d6d33bf6c44011f2966e155bc7149b904573014e583fdcde2b9cf2913cb8b337fc9daf79c59a38a37c99030fcf7dc.json',
    ],
  },
  {
    evals: [{ permit: 'start-kread-permit.json', script: 'start-kread.js' }],
    bundles: [
      '/Users/wietzes/.agoric/cache/b1-853acd6ba3993f0f19d6c5b0a88c9a722c9b41da17cf7f98ff7705e131860c4737d7faa758ca2120773632dbaf949e4bcce2a2cbf2db224fa09cd165678f64ac.json',
      '/Users/wietzes/.agoric/cache/b1-0c3363b8737677076e141a84b84c8499012f6ba79c0871fc906c8be1bb6d11312a7d14d5a3356828a1de6baa4bee818a37b7cb1ca2064f6eecbabc0a40d28136.json',
    ],
  },
];

const main = async () => {
  const td = await new Promise((resolve, reject) =>
    tmpName({ prefix: 'assets' }, (err, x) => (err ? reject(err) : resolve(x))),
  );
  const src = makeWebRd(
    'https://github.com/Kryha/KREAd/releases/download/KREAd-rc1/',
    { fetch },
  );
  const fsp = await import('fs/promises');
  const path = await import('path');
  const dest = makeFileRW(td, { fsp, path });
  const assets = makeWebCache(src, dest);
  const segment = buildInfo[0].bundles[0];
  const info = await assets.size(segment);
  console.log(`${segment}:`, info);
};

// main().catch(err => console.error(err));
