import assert from 'node:assert';
import { toCLIOptions } from '@agoric/internal/src/cli-utils.js';

const { freeze } = Object;

const agdBinary = 'agd';

/**
 * @callback ExecSync
 * @param {string} file
 * @param {string[]} args
 * @param {{ encoding: 'utf-8' } & { [k: string]: unknown }} opts
 * @returns {string}
 */

/**
 * @param {{ execFileSync: ExecSync; log?: typeof console.log }} io
 */
export const makeAgd = ({ execFileSync, log = console.log }) => {
  /**
   * @param {{
   *   home?: string;
   *   keyringBackend?: string;
   *   rpcAddrs?: string[];
   * }} opts
   */
  const make = ({ home, keyringBackend, rpcAddrs } = {}) => {
    const keyringArgs = toCLIOptions({
      home,
      'keyring-backend': keyringBackend,
    });
    if (rpcAddrs) {
      assert.equal(
        rpcAddrs.length,
        1,
        'XXX rpcAddrs must contain only one entry',
      );
    }
    const nodeArgs = toCLIOptions({ node: rpcAddrs && rpcAddrs[0] });

    /**
     * @param {string[]} args
     * @param {any} [opts]
     */
    const exec = (args, opts = { encoding: 'utf-8' }) =>
      execFileSync(agdBinary, args, opts);

    const outJson = toCLIOptions({ output: 'json' });

    const ro = freeze({
      status: async () => JSON.parse(exec([...nodeArgs, 'status'])),
      /**
       * @param {[kind: 'gov', domain: string, ...rest: any]
       *   | [kind: 'tx', txhash: string]
       *   | [mod: 'vstorage', kind: 'data' | 'children', path: string]
       *   | [mod: 'ibc', ...rest: string[]]} qArgs
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
       *
       * @param {string[]} txArgs
       * @param {{ chainId: string; from: string; yes?: boolean }} opts
       */
      tx: async (txArgs, { chainId, from, yes }) => {
        const args = [
          'tx',
          ...txArgs,
          ...nodeArgs,
          ...keyringArgs,
          ...toCLIOptions({ 'chain-id': chainId, from }),
          ...toCLIOptions({
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
