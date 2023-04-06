// @ts-check
/* global process */
import { normalizeBech32 } from '@cosmjs/encoding';
import { execFileSync as execFileSyncAmbient } from 'child_process';

const agdBinary = 'agd';

/**
 * @param {string} literalOrName
 * @param {{ keyringBackend?: string }} opts
 * @param {{ execFileSync: typeof execFileSyncAmbient }} [io]
 */
export const normalizeAddressWithOptions = (
  literalOrName,
  { keyringBackend = undefined } = {},
  io = { execFileSync: execFileSyncAmbient },
) => {
  try {
    return normalizeBech32(literalOrName);
  } catch (_) {
    // not an address so try as a key
    const backendOpt = keyringBackend
      ? [`--keyring-backend=${keyringBackend}`]
      : [];
    const buff = io.execFileSync(agdBinary, [
      `keys`,
      ...backendOpt,
      `show`,
      `--address`,
      literalOrName,
    ]);
    return normalizeBech32(buff.toString().trim());
  }
};
harden(normalizeAddressWithOptions);

/**
 * @param {string} literalOrName
 * @param {{ agd: ReturnType<typeof makeAgd> }} opts
 */
export const normalizeAddressWithAgd = (literalOrName, { agd }) => {
  try {
    return normalizeBech32(literalOrName);
  } catch (_) {
    const addr = agd.nameToAddress(literalOrName);
    return normalizeBech32(addr);
  }
};
harden(normalizeAddressWithAgd);

/**
 * @param {ReadonlyArray<string>} swingsetArgs
 * @param {import('./rpc').MinimalNetworkConfig & {
 *   from: string,
 *   dryRun?: boolean,
 *   verbose?: boolean,
 *   keyring?: {home?: string, backend: string}
 *   stdout?: Pick<import('stream').Writable, 'write'>
 *   execFileSync?: typeof import('child_process').execFileSync
 * }} opts
 */
export const execSwingsetTransaction = (swingsetArgs, opts) => {
  const {
    from,
    dryRun = false,
    verbose = true,
    keyring = undefined,
    chainName,
    rpcAddrs,
    stdout = process.stdout,
    execFileSync = execFileSyncAmbient,
  } = opts;
  const homeOpt = keyring?.home ? [`--home=${keyring.home}`] : [];
  const backendOpt = keyring?.backend
    ? [`--keyring-backend=${keyring.backend}`]
    : [];
  const cmd = [`--node=${rpcAddrs[0]}`, `--chain-id=${chainName}`].concat(
    homeOpt,
    backendOpt,
    [`--from=${from}`, 'tx', 'swingset'],
    swingsetArgs,
  );

  if (dryRun) {
    stdout.write(`Run this interactive command in shell:\n\n`);
    stdout.write(`${agdBinary} `);
    stdout.write(cmd.join(' '));
    stdout.write('\n');
  } else {
    const yesCmd = cmd.concat(['--yes']);
    if (verbose) console.log('Executing ', yesCmd);
    const out = execFileSync(agdBinary, yesCmd).toString();
    console.log('@@@exec result:', out);
    return out;
  }
};
harden(execSwingsetTransaction);

// xxx rpc should be able to query this by HTTP without shelling out
export const fetchSwingsetParams = net => {
  const { chainName, rpcAddrs, execFileSync = execFileSyncAmbient } = net;
  const cmd = [
    `--node=${rpcAddrs[0]}`,
    `--chain-id=${chainName}`,
    'query',
    'swingset',
    'params',
    '--output',
    '--json',
  ];
  const buffer = execFileSync(agdBinary, cmd);
  return JSON.parse(buffer.toString());
};
harden(fetchSwingsetParams);

/**
 * @param {import('./rpc').MinimalNetworkConfig & {
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 *   period?: number,
 *   retryMessage?: string,
 * }} opts
 * @returns {<T>(l: (b: { time: string, height: string }) => Promise<T>) => Promise<T>}
 */
export const pollBlocks = opts => async lookup => {
  const { execFileSync, delay, rpcAddrs, period = 3 * 1000 } = opts;
  const { retryMessage } = opts;

  const nodeArgs = [`--node=${rpcAddrs[0]}`];

  await null; // separate sync prologue

  for (;;) {
    const sTxt = execFileSync(agdBinary, ['status', ...nodeArgs]);
    const status = JSON.parse(sTxt.toString());
    const {
      SyncInfo: { latest_block_time: time, latest_block_height: height },
    } = status;
    try {
      // see await null above
      // eslint-disable-next-line @jessie.js/no-nested-await, no-await-in-loop
      const result = await lookup({ time, height });
      return result;
    } catch (_err) {
      console.error(
        time,
        retryMessage || 'not in block',
        height,
        'retrying...',
      );
      // eslint-disable-next-line @jessie.js/no-nested-await, no-await-in-loop
      await delay(period);
    }
  }
};

/**
 * @template T
 * @param {{
 *   agd: ReturnType<typeof makeAgd>,
 *   delay: (ms: number) => Promise<void>,
 *   blockPeriod?: number,
 *   lookup: (b: { time: string, height: string }) => Promise<T>
 * }} opts
 * @returns {Promise<T>}
 */
export const pollBlocks2 = async ({ agd, lookup, delay, blockPeriod = 6 }) => {
  await null; // separate sync prologue

  for (;;) {
    // eslint-disable-next-line @jessie.js/no-nested-await, no-await-in-loop
    const status = await agd.status();
    const {
      SyncInfo: { latest_block_time: time, latest_block_height: height },
    } = status;
    try {
      // see await null above
      // eslint-disable-next-line @jessie.js/no-nested-await, no-await-in-loop
      const result = await lookup({ time, height });
      return result;
    } catch (_err) {
      // eslint-disable-next-line @jessie.js/no-nested-await, no-await-in-loop
      await delay((blockPeriod / 2) * 1000);
    }
  }
};

/**
 * @param {string} txhash
 * @param {import('./rpc').MinimalNetworkConfig & {
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 *   period?: number,
 * }} opts
 */
export const pollTx = async (txhash, opts) => {
  const { execFileSync, rpcAddrs, chainName } = opts;

  const nodeArgs = [`--node=${rpcAddrs[0]}`];
  const outJson = ['--output', 'json'];

  const lookup = async () => {
    const out = execFileSync(
      agdBinary,
      [
        'query',
        'tx',
        txhash,
        `--chain-id=${chainName}`,
        ...nodeArgs,
        ...outJson,
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    // XXX this type is defined in a .proto file somewhere
    /** @type {{ height: string, txhash: string, code: number, timestamp: string }} */
    const info = JSON.parse(out.toString());
    return info;
  };
  return pollBlocks({ ...opts, retryMessage: 'tx not in block' })(lookup);
};

const { freeze } = Object; // XXX use harden?

/**
 * @param {import('commander').Command} cmd
 * @param {{ env: Record<string, string|undefined> }} opts
 */
export const withAgdOptions = (cmd, { env }) =>
  cmd
    .option('--home <dir>', 'agd CosmosSDK application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      `keyring's backend (os|file|test) (default "${
        env.AGORIC_KEYRING_BACKEND || 'os'
      }")`,
      env.AGORIC_KEYRING_BACKEND,
    );

/** @param {{ execFileSync: typeof import('child_process').execFileSync }} io */
export const makeAgd = ({ execFileSync }) => {
  /** @param {{ home?: string, keyringBackend?: string, rpcAddrs?: string[] }} keyringOpts */
  const make = ({ home, keyringBackend, rpcAddrs } = {}) => {
    const keyringArgs = [
      ...(home ? ['--home', home] : []),
      ...(keyringBackend ? [`--keyring-backend`, keyringBackend] : []),
    ];
    const nodeArgs = [...(rpcAddrs ? [`--node`, rpcAddrs[0]] : [])];

    const l = a => {
      console.log(a);
      return a;
    };
    /**
     * @param {string[]} args
     * @param {*} [opts]
     */
    const exec = (args, opts) =>
      execFileSync(agdBinary, l(args), opts).toString();

    const outJson = ['--output', 'json'];

    // TODO: break this into facets?
    // nameToAddress
    // query, status
    // tx
    return freeze({
      status: async () => JSON.parse(exec([...nodeArgs, 'status'])),
      /**
       * @param {string} name
       * NOTE: synchronous I/O
       */
      nameToAddress: name => {
        const txt = exec(['keys', 'show', `--address`, name, ...keyringArgs]);
        return txt.trim();
      },
      /**
       * @param {[kind: 'tx', txhash: string]} qArgs
       */
      query: async qArgs => {
        const out = await exec(['query', ...qArgs, ...nodeArgs, ...outJson], {
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        return JSON.parse(out);
      },
      /**
       * TODO: gas
       *
       * @param {string[]} txArgs
       * @param {{ chainId: string, from: string, yes?: boolean }} opts
       */
      tx: async (txArgs, { chainId, from, yes }) => {
        const yesArg = yes ? ['--yes'] : [];
        const args = [
          ...nodeArgs,
          ...[`--chain-id`, chainId],
          ...keyringArgs,
          ...[`--from`, from],
          'tx',
          ...txArgs,
          ...['--broadcast-mode', 'block'],
          ...yesArg,
          ...outJson,
        ];
        const out = exec(args);
        return JSON.parse(out);
      },
      withOpts: opts => make({ home, keyringBackend, rpcAddrs, ...opts }),
    });
  };
  return make();
};

/**
 * TODO: this is more about swingset than signing. rename.
 *
 * @param {{ agd: ReturnType<makeAgd>, chainId: string }} input
 */
export const makeSigner = ({ agd, chainId }) => {
  /** @param {Parameters<typeof signAndBroadcast>[0]} tx */
  const makeTxArgs = tx => {
    let txArgs;
    switch (tx.kind) {
      case 'wallet-action':
        txArgs = [
          tx.kind,
          ...(tx.allowSpend ? ['--allow-spend'] : []),
          tx.action,
        ];
        break;
      case 'provision-one':
        txArgs = [tx.kind, tx.nickname, tx.addr];
        break;
      default:
        throw new Error(`unknown tx kind: ${tx}`);
    }

    return ['swingset', ...txArgs];
  };

  /**
   * Sign and broadcast a swingset transaction.
   *
   * @param {(
   *   { kind: 'wallet-action', action: string, allowSpend?: boolean } |
   *   { kind: 'provision-one', nickname: string, addr: string }) & {
   *   from: string,
   * }} txOpts
   * @param {{
   *   delay: (ms: number) => Promise<void>,
   *   tui: import('./format').TUI,
   * }} io
   * @throws { Error & { code: number } } if transaction fails
   */
  const signAndBroadcast = async (txOpts, { tui, delay }) => {
    /** @type {{ code: number, txhash: string }} */
    const tx = await agd.tx(makeTxArgs(txOpts), {
      chainId,
      from: txOpts.from,
      yes: true,
    });
    if (tx.code !== 0) {
      const err = Error(`failed to send action. code: ${tx.code}`);
      // @ts-expect-error XXX how to add properties to an error?
      err.code = tx.code;
      throw err;
    }

    /** @param {{ time: string, height: string }} blockInfo */
    const lookup = async ({ time, height }) => {
      await null; // separate sync prologue
      try {
        // XXX this type is defined in a .proto file somewhere
        /** @type {{ height: string, txhash: string, code: number, timestamp: string }} */
        // eslint-disable-next-line @jessie.js/no-nested-await
        const info = await agd.query(['tx', tx.txhash]);
        return info;
      } catch (err) {
        // TODO: suppress expected messages
        tui.warn(time, 'tx not in block', height);
        throw Error('retry');
      }
    };
    return pollBlocks2({ agd, delay, lookup });
  };

  return freeze({
    makeTxArgs,
    signAndBroadcast,
    pollBlocks: ({ delay, lookup }) => pollBlocks2({ agd, delay, lookup }),
  });
};
