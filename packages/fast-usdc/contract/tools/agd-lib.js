// @ts-check
import assert from 'node:assert';

const { freeze } = Object;

const agdBinary = 'agd';

/**
 * @param {Record<string, unknown>} record - e.g. { color: 'blue' }
 * @returns {string[]} - e.g. ['--color', 'blue']
 */
export const flags = record => {
  // TODO? support --yes with boolean?

  /** @type {[string, string][]} */
  // @ts-expect-error undefined is filtered out
  const skipUndef = Object.entries(record).filter(([_k, v]) => v !== undefined);
  return skipUndef.map(([k, v]) => [`--${k}`, v]).flat();
};

/**
 * @callback ExecSync
 * @param {string} file
 * @param {string[]} args
 * @param {{ encoding: 'utf-8' } & { [k: string]: unknown }} opts
 * @returns {string}
 */

/** tell execFileSync to return a string, not a Buffer */
const returnString = /** @type {const} */ ({ encoding: 'utf-8' });

/**
 * @param {{ execFileSync: ExecSync, log?: typeof console.log }} io
 */
export const makeAgd = ({ execFileSync, log = console.log }) => {
  /**
   * @param { {
   *       home?: string;
   *       keyringBackend?: string;
   *       rpcAddrs?: string[];
   *     }} opts
   */
  const make = ({ home, keyringBackend, rpcAddrs } = {}) => {
    const keyringArgs = flags({ home, 'keyring-backend': keyringBackend });
    if (rpcAddrs) {
      assert.equal(
        rpcAddrs.length,
        1,
        'XXX rpcAddrs must contain only one entry',
      );
    }
    const nodeArgs = flags({ node: rpcAddrs && rpcAddrs[0] });

    /**
     * @param {string[]} args
     * @param {*} [opts]
     */
    const exec = (args, opts = { encoding: 'utf-8' }) =>
      execFileSync(agdBinary, args, opts);

    const outJson = flags({ output: 'json' });

    const ro = freeze({
      status: async () => JSON.parse(exec([...nodeArgs, 'status'])),
      /**
       * @param {| [kind: 'gov', domain: string, ...rest: any]
       *         | [kind: 'tx', txhash: string]
       *         | [mod: 'vstorage', kind: 'data' | 'children', path: string]
       *         | [mod: 'ibc', ...rest: string[]]
       * } qArgs
       */
      query: async qArgs => {
        const out = exec(['query', ...qArgs, ...nodeArgs, ...outJson], {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });

        try {
          return JSON.parse(out);
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
    });
    const nameHub = freeze({
      /**
       * NOTE: synchronous I/O
       *
       * @param {string[]} path
       */
      lookup: (...path) => {
        if (!Array.isArray(path)) {
          // TODO: use COND || Fail``
          throw TypeError();
        }
        if (path.length !== 1) {
          throw Error(`path length limited to 1: ${path.length}`);
        }
        const [name] = path;
        const txt = exec(['keys', 'show', `--address`, name, ...keyringArgs]);
        return txt.trim();
      },
    });
    const rw = freeze({
      /**
       * TODO: gas
       * @param {string[]} txArgs
       * @param {{ chainId: string; from: string; yes?: boolean }} opts
       */
      tx: async (txArgs, { chainId, from, yes }) => {
        const args = [
          'tx',
          ...txArgs,
          ...nodeArgs,
          ...keyringArgs,
          ...flags({ 'chain-id': chainId, from }),
          ...flags({
            'broadcast-mode': 'block',
            gas: 'auto',
            'gas-adjustment': '1.4',
          }),
          ...(yes ? ['--yes'] : []),
          ...outJson,
        ];
        log('$$$', agdBinary, ...args);
        const out = exec(args);
        try {
          const detail = JSON.parse(out);
          if (detail.code !== 0) {
            throw Error(detail.raw_log);
          }
          return detail;
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
      ...ro,
      ...nameHub,
      readOnly: () => ro,
      nameHub: () => nameHub,
      keys: {
        /**
         * @param {string} name
         * @param {string} mnemonic
         */
        add: (name, mnemonic) => {
          return execFileSync(
            agdBinary,
            [...keyringArgs, 'keys', 'add', name, '--recover'],
            { encoding: 'utf-8', input: mnemonic },
          ).toString();
        },
        showAddress: nameHub.lookup,
        /** @param {string} name */
        delete: name => {
          return exec([...keyringArgs, 'keys', 'delete', name, '-y']);
        },
      },
      /**
       * @param {Record<string, unknown>} opts
       */
      withOpts: opts => make({ home, keyringBackend, rpcAddrs, ...opts }),
    });
    return rw;
  };
  return make();
};

/** @typedef {ReturnType<makeAgd>} Agd */

/**
 * @param {{
 *   pod?: string;
 *   container?: string;
 *   cmd?: string[];
 *   destDir?: string;
 *   execFileSync: ExecSync;
 *   log?: Console['log'];
 *   join?: (...paths: string[]) => string
 *   basename?: (path: string)  => string
 * }} io
 */
export const makeContainer = ({
  execFileSync,
  pod = 'agoriclocal-genesis-0',
  container = 'validator',
  destDir = '/root',
  cmd = ['kubectl', 'exec', '-i'],
  log = console.log,
  join = (...paths) => paths.join('/'),
  basename = path => path.split('/').at(-1) || assert.fail('bad path'),
}) => {
  /** @param {{ [k: string]: unknown }} hFlags */
  const make = (hFlags = {}) => {
    const runtime = {
      /**
       * @type {ExecSync}
       */
      execFileSync: (file, args, opts = returnString) => {
        const execArgs = [...cmd.slice(1), container];
        log(`${pod}/${container}$`, ...[file, ...args].map(x => `${x}`));
        const exFlags = flags({ container, ...hFlags });
        const [hFile, ...hArgs] = [...cmd, pod, ...exFlags];
        return execFileSync(hFile, [...hArgs, '--', file, ...args], opts);
      },
      /** @param {string[]} paths } */
      copyFiles: paths => {
        // Create the destination directory if it doesn't exist
        runtime.execFileSync('mkdir', ['-p', destDir], returnString);
        for (const path of paths) {
          execFileSync(
            'kubectl',
            [`cp`, path, `${pod}:${destDir}/`, ...flags({ container })],
            returnString,
          );
          log(`Copied ${path} to ${destDir} in pod ${pod}`);
        }
        const lsOutput = runtime.execFileSync('ls', [destDir], returnString);
        log(`ls ${destDir}:\n`, lsOutput);
        const destPaths = paths.map(p => join(destDir, basename(p)));
        return destPaths;
      },
      /** @param {{ [k: string]: unknown }} newFlags */
      withFlags: newFlags => make({ ...hFlags, ...newFlags }),
    };
    return runtime;
  };
  return make();
};

/** @typedef {ReturnType<makeContainer>} Container */
