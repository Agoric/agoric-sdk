import { execFile as execFileAmbient } from 'child_process';
import { promisify } from 'node:util';

/**
 * Reify file read access as an object.
 *
 * @param {string} root
 * @param {object} [io]
 * @param {Partial<typeof import('fs')>} [io.fs]
 * @param {Partial<typeof import('fs/promises')>} [io.fsp]
 * @param {Partial<typeof import('path')>} [io.path]
 *
 * @typedef {ReturnType<typeof makeFileRd>} FileRd
 */
export const makeFileRd = (root, { fs = {}, fsp = {}, path = {} } = {}) => {
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
          return () => assert.fail(`no access to ${String(p)}`);
        }
        // @ts-expect-error tsc doesn't refine per p in o
        return io[p];
      },
    });
    return /** @type {T} */ (it);
  };

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
    return self;
  };
  return make(root);
};

/**
 * Access to run a command with flags appended.
 *
 * @example
 * const lsPlain = makeCmdRunner('ls', { execFile });
 * const ls = ls.withFlags('-F')
 * await ls.exec('/tmp') // runs: ls /tmp -F
 *
 * TODO? .withPath('/opt') or .withEnv({PATH: `${env.PATH}:/opt`})
 *
 * @param {string} file
 * @param {{ execFile: any }} io
 */
export const makeCmdRunner = (
  file,
  { execFile = promisify(execFileAmbient) },
) => {
  /** @param {{ preArgs?: string[], postArgs?: string[] }} [opts] */
  const make = ({ preArgs = [], postArgs = [] } = {}) => {
    return harden({
      /**
       * @param {string[]} args
       * @param {*} [opts]
       */
      exec: (
        args,
        opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
      ) => execFile(file, [...preArgs, ...args, ...postArgs], opts),
      /**
       * @param {string} name
        @param {string[]} [opts] */
      subCommand: (name, opts = []) =>
        make({ preArgs: [name, ...opts, ...preArgs], postArgs }),
      /** @param {string[]} tailFlags */
      withFlags: (...tailFlags) =>
        make({ preArgs, postArgs: [...postArgs, ...tailFlags] }),
    });
  };
  return make();
};
/** @typedef {ReturnType<makeCmdRunner>} CmdRunner */

/**
 * @param {Record<string, string | string[] | undefined>} record - e.g. { color: 'blue' }
 * @returns {string[]} - e.g. ['--color', 'blue']
 */
export const flags = record => {
  // TODO? support --yes with boolean?

  /** @type {[string, string][]} */
  // @ts-expect-error undefined is filtered out
  const skipUndef = Object.entries(record).filter(([_k, v]) => v !== undefined);
  return skipUndef.flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.flatMap(v => [`--${key}`, v]);
    }
    return [`--${key}`, value];
  });
};

const DBG = (l, x) => {
  console.log('@@@', l, x);
  return x;
};

/**
 *
 * TODO: builder should be a FileRd
 *
 * @param {CmdRunner} agoric
 * @param {FileRd} builder
 * @param {Record<string, string | string[]>} [builderOpts]
 * @param {{cwd?: FileRd}} [io]
 *
 * @returns {Promise<Plan>}
 *
 * @typedef {{
 *   name: string,
 *   script: string,
 *   permit: string,
 *   bundles: { entrypoint:string, bundleID:string, fileName:string}[];
 * }} Plan
 */
export const runBuilder = async (
  agoric,
  builder,
  builderOpts = {},
  { cwd = builder.join('../../') } = {},
) => {
  const cmd = agoric.withFlags(...(builderOpts ? flags(builderOpts) : []));
  const { stdout } = await cmd.exec(['run', String(builder)]);
  const match = stdout?.match(/ (?<name>[-\w]+)-permit.json/);
  if (!(match && match.groups)) {
    throw Error('no permit found');
  }
  /** @type {Plan} */
  const plan = await cwd.join(`${match.groups.name}-plan.json`).readJSON();
  return plan;
};

export const txFlags = ({
  node,
  from,
  chainId,
  keyringBackend = 'test',
  broadcastMode = 'block',
}) => ({
  node,
  from,
  'chain-id': chainId,
  'keyring-backend': keyringBackend,
  'broadcast-mode': broadcastMode,
  // TODO: parameterize these?
  gas: 'auto',
  'gas-adjustment': '1.4',
});

/**
 * @param {CmdRunner} agd
 * @param {string[]} txArgs
 */
export const runTx = (agd, txArgs) => {
  const { stdout } = agd.withFlags('-o', 'json').exec(['tx', ...txArgs]);
  const result = JSON.parse(stdout);
  if (result.code !== 0) {
    throw Object.assign(Error(result.raw_log), result);
  }
  return result;
};

/**
 * @param {CmdRunner} agd
 * @param {FileRd} bundle
 */
export const installBundle = async (agd, bundle) =>
  runTx(agd, ['swingset', 'install-bundle', `@${bundle}`]);

export const txAbbr = tx => {
  const { txhash, code, height, gas_used: g } = tx;

  return { txhash, code, height, gas_used: g };
};

/**
 * @param {CmdRunner} agd
 * @param {Plan['bundles']} bundles
 * @param {FileRd} files
 */
export const installBundles = (agd, bundles, files) => {
  const ps = bundles.map(b =>
    installBundle(agd, files.join(files.relative(b.fileName))),
  );
  return Promise.all(ps);
};

/**
 * @param {CmdRunner} agd
 * @param {Pick<Plan, 'permit' | 'script'>[]} evals
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {object} [opts.depositOpts]
 * @param {string} [opts.depositOpts.denom]
 * @param {number} [opts.depositOpts.unit]
 * @param {number} [opts.depositOpts.qty]
 * @param {string} [opts.deposit]
 */
export const submitCoreEval = async (
  agd,
  evals,
  {
    title = evals[0].script,
    description = title,
    depositOpts: { denom = 'ubld', unit = 1_000_000, qty = 1 } = {},
    deposit = `${qty * unit}${denom}`,
  } = {},
) =>
  runTx(agd, [
    ...'gov submit-proposal swingset-core-eval'.split(' '),
    ...evals.map(e => [e.permit, e.script]).flat(),
    ...flags({ title, description, deposit }),
  ]);
