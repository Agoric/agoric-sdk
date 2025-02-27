// @ts-check
import { makeTracer } from '@agoric/internal';
import assert from 'node:assert';
import { makeRetryUntilCondition } from './sleep.js';

const trace = makeTracer('Agd');

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

const outJson = flags({ output: 'json' });

/**
 * Access to run a command with flags appended.
 *
 * @example
 * const lsPlain = makeCmdRunner('ls', { execFileSync });
 * const ls = ls.withFlags('-F')
 * ls.exec('/tmp') // runs: ls /tmp -F
 *
 * TODO? .withPath('/opt') or .withEnv({PATH: `${env.PATH}:/opt`})
 *
 * @param {string} file
 * @param {object} io
 * @param {ExecSync} io.execFileSync
 */
const makeCmdRunner = (file, { execFileSync }) => {
  /** @param {string[]} [myFlags] */
  const make = (myFlags = []) => {
    return freeze({
      /**
       * @param {string[]} args
       * @param {*} [opts]
       */
      exec: (
        args,
        opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
      ) => execFileSync(file, [...args, ...myFlags], opts),
      /** @param {string[]} tailFlags */
      withFlags: (...tailFlags) => make([...myFlags, ...tailFlags]),
    });
  };
  return make();
};

/**
 * Access to run commands using kubectl exec
 *
 * @param {object} io
 * @param {ExecSync} io.execFileSync
 */
export const makeKubePod = ({ execFileSync }) => {
  /** @param {string[]} [myFlags] */
  const make = (myFlags = []) => {
    return freeze({
      /**
       * @param {string} bin
       * @param {string[]} args
       * @param {*} opts
       */
      exec: (bin, args, opts) =>
        execFileSync('kubectl', ['exec', ...myFlags, '--', bin, ...args], opts),
      /** @param {string[]} tailFlags */
      withFlags: (...tailFlags) => make([...myFlags, ...tailFlags]),
    });
  };
  return make();
};

/**
 * @example
 *   const ag0 = makeAgdRunner({ execFileSync })
 *   const ag1 = ag0.withFlags('--keyring-backend', 'test')
 *   const ag2 = ag1.withFlags('--node', 'https://devnet.rpc.agoric.net:443')
 *
 * @param {object} io
 * @param {ExecSync} io.execFileSync
 * @param {string} [agd] e.g. 'ag0'
 */
const makeAgdRunner = ({ execFileSync }, agd = 'agd') => {
  // agd puts this diagnostic on stdout rather than stderr :-/
  // "Default sign-mode 'direct' not supported by Ledger, using sign-mode 'amino-json'.
  const stripNoise = out => out.replace(/^Default[^\n]+\n/, '');

  /** @param {string[]} [myFlags] */
  const make = (myFlags = []) => {
    const runner = makeCmdRunner(agd, { execFileSync }).withFlags(...myFlags);
    return freeze({
      /** @param {string[]} tailFlags */
      withFlags: (...tailFlags) => make([...myFlags, ...tailFlags]),
      getCommand: () => agd,
      /**
       * @param {string[]} args
       * @param {*} [opts]
       */
      exec: (args, opts) => stripNoise(runner.exec(args, opts)),
    });
  };
  return make();
};
/** @typedef {ReturnType<typeof makeAgdRunner>} AgdRunner */

/**
 * Using agd to read the chain: status, query.
 *
 * @template {string[]} QS
 * @param {AgdRunner} agd
 */
export const makeChainRd = agd => {
  const execOpts = {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  };

  return freeze({
    status: async () => JSON.parse(agd.exec(['status'])),
    /**
     * @param {| [kind: 'gov', domain: string, ...rest: any]
     *         | [kind: 'tx', txhash: string]
     *         | [mod: 'vstorage', kind: 'data' | 'children', path: string]
     *         | QS
     * } qArgs
     */
    query: async qArgs => {
      const out = agd.withFlags(...outJson).exec(['query', ...qArgs], execOpts);

      try {
        return JSON.parse(out);
      } catch (e) {
        console.error(e);
        console.info('output:', out);
      }
    },
  });
};
/** @typedef {ReturnType<typeof makeChainRd>} ChainRd */

/**
 * Acccess to sign & broadcast transactions from an account using agd tx,
 * rate limited to one tx per block.
 *
 * @param {string} from
 * @param {string} chainId
 * @param {object} io
 * @param {AgdRunner} io.agd
 * @param {ChainRd} io.chainRd
 * @param {typeof setTimeout} io.setTimeout
 * @param {(...values: unknown[]) => void} [io.log]
 */
export const makeAgdAcct = (
  from,
  chainId,
  { agd, chainRd, setTimeout, log },
) => {
  // TODO: let caller specify these?
  const txFlags = flags({
    'broadcast-mode': 'sync', // default
    gas: 'auto',
    'gas-adjustment': '1.4',
  });

  /**
   * @param {object} [opts]
   * @param {number} [opts.maxRetries]
   * @param {number} [opts.retryIntervalMs]
   * @param {number} [opts.lastUsedBlock]
   */
  const make = ({
    maxRetries = 6,
    retryIntervalMs = 3_500,
    lastUsedBlock = -1,
  } = {}) => {
    const retryUntilCondition = makeRetryUntilCondition({
      log,
      setTimeout,
      maxRetries,
      retryIntervalMs,
    });

    const self = freeze({
      /**
       * @param {object} opts
       * @param {number} [opts.maxTries]
       * @param {number} [opts.period]
       * @param {number} [opts.lastUsedBlock]
       */
      withOpts: opts =>
        make({ maxRetries, retryIntervalMs, lastUsedBlock, ...opts }),

      getAddr: () => from,
      getChainId: () => chainId,
      getChainRd: () => chainRd,
      getLastUsedBlock: () => lastUsedBlock,
      retryUntilCondition,
      /**
       * @param {string[]} txArgs
       * @param {boolean} [suppressErrors]
       */
      async tx(txArgs, suppressErrors = true) {
        trace('$ agd tx', ...txArgs);

        // limit to one tx per block
        const status = await retryUntilCondition(
          () => chainRd.status(),
          ({ SyncInfo }) => SyncInfo.latest_block_height > lastUsedBlock,
          `waiting until after ${lastUsedBlock}`,
        );
        lastUsedBlock = status.SyncInfo.latest_block_height;

        const out = agd
          .withFlags(
            ...flags({ 'chain-id': chainId, from }),
            ...txFlags,
            '--yes',
            ...outJson,
          )
          .exec(['tx', ...txArgs], { stdio: ['ignore', 'pipe', 'ignore'] });
        /** @type {{ height: string, txhash: string, code: number, codespace: string, raw_log: string }} */
        // XXX approximate type
        let detail;
        try {
          detail = JSON.parse(out);
        } catch (e) {
          if (suppressErrors) {
            console.error(e);
            console.info('output:', out);
            return;
          }
          throw Error('cannot parse agd tx output', { cause: e });
        }
        trace('agd returned;', detail);
        if (detail.code !== 0) {
          // FIXME we're getting: account sequence mismatch, expected 30, got 29: incorrect account sequence
          // Does that mean `broadcast-mode: block` didn't work?
          throw Error(detail.raw_log);
        }
        return detail;
      },
    });
    return self;
  };
  return make();
};

/**
 * Access to sign and broadcast swingset transactions
 * with optional polling for completion.
 *
 * @param {object} io
 * @param {ReturnType<typeof makeAgdAcct>} io.account
 */
export const makeSwingsetTx = ({ account }) => {
  /**
   * @param {object} [opts]
   * @param {number} [opts.maxRetries]
   * @param {number} [opts.retryIntervalMs]
   * @param {boolean} [opts.poll]
   */
  const make = ({
    maxRetries = 6,
    retryIntervalMs = 3_500,
    poll = true,
  } = {}) =>
    freeze({
      provisionOne: async (
        powerFlags = ['SMART_WALLET'],
        nickName = 'my-wallet',
      ) => {
        // TODO: check powerFlags syntax: no --foo, for example
        const out = await account.tx(
          [
            'swingset',
            'provision-one',
            nickName,
            account.getAddr(),
            ...powerFlags,
          ],
          false,
        );
        if (!out) throw Error('impossible; parse error was not suppressed');
        if (poll) {
          await account.retryUntilCondition(
            () => account.getChainRd().query(['tx', out.txhash]),
            result => result.code === 0,
            'tx not in block',
          );
        }
        return out;
      },

      /**
       * @param {object} opts
       * @param {number} [opts.maxTries]
       * @param {number} [opts.period]
       * @param {boolean} [opts.poll]
       */
      withOpts: opts => make({ maxRetries, retryIntervalMs, ...opts }),
    });
  return make();
};

/** @param {AgdRunner} agd */
export const makeKeyring = agd => {
  /** @param {string} name key name in keyring */
  const showAddress = name => {
    return agd.exec(['keys', 'show', name, '-a']).toString().trim();
  };

  return freeze({ showAddress });
};

/** @param {AgdRunner} agd */
export const makeKeyRingEdit = agd => {
  const ro = makeKeyring(agd);
  const stdio = ['pipe', 'pipe', 'ignore'];

  return freeze({
    readOnly: () => ro,
    /**
     * @param {string} name
     * @param {string} mnemonic
     */
    add: (name, mnemonic) => {
      return agd
        .withFlags('--recover')
        .exec(['keys', 'add', name], {
          encoding: 'utf-8',
          input: mnemonic,
          stdio,
        })
        .toString();
    },
    /** @param {string} name */
    delete: name => {
      return agd.withFlags('-y').exec(['keys', 'delete', name], { stdio });
    },
  });
};

/**
 * @param {{ execFileSync: ExecSync, setTimeout?: typeof setTimeout }} io
 * @param {string[]} [howWhere]
 */
export const makeAgd2 = (
  { execFileSync, setTimeout = globalThis.setTimeout },
  howWhere = flags({
    i: 'agoriclocal-genesis-0',
    c: 'validator',
    tty: 'false',
  }),
) => {
  const pod = makeKubePod({ execFileSync });
  const kagd = makeAgdRunner({ execFileSync: pod.withFlags(...howWhere).exec });

  const make = (opts = {}) => {
    const { home, keyringBackend, rpcAddrs } = opts;
    const keyringArgs = flags({ home, 'keyring-backend': keyringBackend });
    if (rpcAddrs) {
      assert.equal(
        rpcAddrs.length,
        1,
        'XXX rpcAddrs must contain only one entry',
      );
    }
    const nodeArgs = flags({ node: rpcAddrs && rpcAddrs[0] });
    const refine = [...keyringArgs, ...nodeArgs];
    const agd = refine.length ? kagd.withFlags(...refine) : kagd;

    const chainRd = makeChainRd(agd);
    const keyringEdit = makeKeyRingEdit(agd);
    const keyring = keyringEdit.readOnly();
    const nameHub = freeze({ lookup: keyring.showAddress });

    return freeze({
      ...chainRd,
      tx: async (txArgs, { chainId, from, yes }) => {
        if (!yes) throw Error('unsupported');
        // XXX can't track 1-tx-per-block obligation
        const acct = makeAgdAcct(from, chainId, { agd, chainRd, setTimeout });
        return acct.tx(txArgs);
      },
      ro: () => chainRd,
      nameHub: () => nameHub,
      keys: {
        ...keyring,
        ...keyringEdit,
      },
      /** @param {Record<string, unknown>} override */
      withOpts: override => make({ ...opts, ...override }),
    });
  };
  return make();
};

/**
 * @callback ExecSync
 * @param {string} file
 * @param {string[]} args
 * @param {{ encoding: 'utf-8' } & { [k: string]: unknown }} opts
 * @returns {string}
 */

/**
 * @param {{ execFileSync: ExecSync }} io
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
      opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    ) => execFileSync(kubectlBinary, [...binaryArgs, ...args], opts);

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
        trace('$ agd', ...args);
        const out = exec(args, { stdio: ['ignore', 'pipe', 'ignore'] });
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
 * @param root0
 * @param root0.podName
 * @param root0.containerName
 * @param root0.destDir
 */
export const makeCopyFiles = (
  { execFileSync, log },
  {
    podName = 'agoriclocal-genesis-0',
    containerName = 'validator',
    destDir = '/tmp/contracts',
  } = {},
) => {
  /** @param {string[]} paths } */
  return paths => {
    // Create the destination directory if it doesn't exist
    execFileSync(
      kubectlBinary,
      `exec -i ${podName} -c ${containerName} -- mkdir -p ${destDir}`.split(
        ' ',
      ),
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    for (const path of paths) {
      execFileSync(
        kubectlBinary,
        `cp ${path} ${podName}:${destDir}/ -c ${containerName}`.split(' '),
        { stdio: ['ignore', 'pipe', 'ignore'] },
      );
      log(`Copied ${path} to ${destDir} in pod ${podName}`);
    }
    const lsOutput = execFileSync(
      kubectlBinary,
      `exec -i ${podName} -c ${containerName}  -- ls ${destDir}`.split(' '),
      { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' },
    );
    log(`ls ${destDir}:\n${lsOutput}`);
    return lsOutput;
  };
};
