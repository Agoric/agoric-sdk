// @ts-check
import { makeTracer } from '@agoric/internal';
import assert from 'node:assert';

const trace = makeTracer('Agd', false);

const { freeze } = Object;

const kubectlBinary = 'kubectl';
const binaryArgs = [
  'exec',
  '-i',
  'agoriclocal-genesis-0',
  '-c',
  'validator',
  '--tty=false',
  '--',
  'agd',
];

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

/**
 * @callback ExecSync
 * @param {string} file
 * @param {string[]} args
 * @param {{ encoding: 'utf-8' } & { [k: string]: unknown }} opts
 * @returns {string}
 */

/**
 * @param {{ execFileSync: typeof import('node:child_process')['execFileSync'] }} io
 */
export const makeAgd = ({ execFileSync }) => {
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
    const exec = (
      args,
      opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    ) => execFileSync(kubectlBinary, [...binaryArgs, ...args], opts);

    const outJson = flags({ output: 'json' });

    const ro = freeze({
      status: async () => JSON.parse(exec([...nodeArgs, 'status'])),
      /**
       * @param {| [kind: 'gov', domain: string, ...rest: any]
       *         | [kind: 'tx', txhash: string]
       *         | [mod: 'vstorage', kind: 'data' | 'children', path: string]
       * } qArgs
       */
      query: async qArgs => {
        const out = exec(['query', ...qArgs, ...nodeArgs, ...outJson], {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
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
            // FIXME removed in cosmos-sdk https://github.com/Agoric/agoric-sdk/issues/9016
            'broadcast-mode': 'block',
            gas: 'auto',
            'gas-adjustment': '1.4',
          }),
          ...(yes ? ['--yes'] : []),
          ...outJson,
        ];
        trace('$ agd', ...args);
        const out = exec(args, { stdio: ['ignore', 'pipe', 'pipe'] });
        try {
          // XXX approximate type
          /** @type {{ height: string, txhash: string, code: number, codespace: string, raw_log: string }} */
          const detail = JSON.parse(out);
          trace('agd returned;', detail);
          if (detail.code !== 0) {
            // FIXME we're getting: account sequence mismatch, expected 30, got 29: incorrect account sequence
            // Does that mean `broadcast-mode: block` didn't work?
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
            kubectlBinary,
            [...binaryArgs, ...keyringArgs, 'keys', 'add', name, '--recover'],
            {
              encoding: 'utf-8',
              input: mnemonic,
              stdio: ['pipe', 'pipe', 'ignore'],
            },
          ).toString();
        },
        /** @param {string} name key name in keyring */
        showAddress: name => {
          return execFileSync(
            kubectlBinary,
            [...binaryArgs, 'keys', 'show', name, '-a', ...keyringArgs],
            {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'ignore'],
            },
          )
            .toString()
            .trim();
        },
        /** @param {string} name */
        delete: name => {
          return exec([...keyringArgs, 'keys', 'delete', name, '-y'], {
            stdio: ['pipe', 'pipe', 'ignore'],
          });
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

/** @typedef {ReturnType<typeof makeAgd>} Agd */

/**
 * @param {{ execFileSync: typeof import('child_process').execFileSync, log: typeof console.log }} powers
 * @param {*} [opts]
 */
export const makeCopyFiles = (
  { execFileSync, log },
  {
    podName = 'agoriclocal-genesis-0',
    containerName = 'validator',
    destDir = '/tmp/contracts',
  } = {},
) => {
  /**
   * @param {string[]} paths
   * @param {Record<string, string>} [texts]
   */
  return (paths, texts = {}) => {
    // Create the destination directory if it doesn't exist
    execFileSync(
      kubectlBinary,
      `exec -i ${podName} -c ${containerName} -- mkdir -p ${destDir}`.split(
        ' ',
      ),
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    for (const path of paths) {
      execFileSync(
        kubectlBinary,
        `cp ${path} ${podName}:${destDir}/ -c ${containerName}`.split(' '),
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      log(`Copied ${path} to ${destDir} in pod ${podName}`);
    }
    for (const [name, text] of Object.entries(texts)) {
      execFileSync(
        'kubectl',
        [
          'exec',
          '--stdin=true',
          '--container',
          containerName,
          podName,
          '--',
          'sh',
          '-c',
          `cat > "${destDir}/${name}"`,
        ],
        { input: text, stdio: ['pipe', 'inherit', 'inherit'] },
      );
      log(`Wrote '${text.slice(0, 5)}...' to ${podName}:${destDir}/${name}`);
    }
    const lsOutput = execFileSync(
      kubectlBinary,
      `exec -i ${podName} -c ${containerName}  -- ls ${destDir}`.split(' '),
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' },
    );
    log(`ls ${destDir}:\n${lsOutput}`);
    return lsOutput;
  };
};
