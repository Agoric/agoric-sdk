// @ts-check
/* eslint-env node */
import { normalizeBech32 } from '@cosmjs/encoding';
import { execFileSync as execFileSyncAmbient } from 'child_process';
import { makeAgoricQueryClient } from '@agoric/client-utils';

/**
 * @import {MinimalNetworkConfig} from '@agoric/client-utils';
 * @import {Params, ParamsSDKType} from '@agoric/cosmic-proto/agoric/swingset/swingset.js';
 */

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

/** @typedef {number | 'auto' | ['auto', adjustment?: number | undefined]} GasLimit */

/**
 * @param {GasLimit} limit
 * @returns {string[]}
 */
const makeGasOpts = limit => {
  if (Number.isFinite(limit) || limit === 'auto') {
    return [`--gas=${limit}`];
  }
  if (Array.isArray(limit) && limit.length >= 1 && limit[0] === 'auto') {
    const gasOpts = ['--gas=auto'];
    if (limit.length > 1) {
      const [adjustment, ...rest] = limit.slice(1);
      const adjustmentIsValid =
        adjustment === undefined ||
        (Number.isFinite(adjustment) && Number(adjustment) > 0);
      if (rest.length !== 0 || !adjustmentIsValid) {
        throw Error('invalid gas input');
      }
      if (adjustment !== undefined) {
        gasOpts.push(`--gas-adjustment=${adjustment}`);
      }
    }
    return gasOpts;
  }

  throw Error('invalid gas input');
};

/**
 * @param {ReadonlyArray<string>} swingsetArgs
 * @param {MinimalNetworkConfig & {
 *   from: string,
 *   fees?: string,
 *   gas?: GasLimit,
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
    fees,
    gas = ['auto', 1.2],
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
  const feeOpt = fees ? ['--fees', fees] : [];
  const cmd = [`--node=${rpcAddrs[0]}`, `--chain-id=${chainName}`].concat(
    homeOpt,
    backendOpt,
    feeOpt,
    makeGasOpts(gas),
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
    if (verbose) console.log('Executing ', agdBinary, yesCmd);
    const out = execFileSync(agdBinary, yesCmd, { encoding: 'utf-8' });

    // agd puts this diagnostic on stdout rather than stderr :-/
    // "Default sign-mode 'direct' not supported by Ledger, using sign-mode 'amino-json'.
    if (out.startsWith('Default sign-mode')) {
      const stripDiagnostic = out.replace(/^Default[^\n]+\n/, '');
      return stripDiagnostic;
    }
    return out;
  }
};
harden(execSwingsetTransaction);

/**
 *
 * @param {MinimalNetworkConfig} net
 * @returns {Promise<Params>}
 */
export const fetchSwingsetParams = async net => {
  const client = await makeAgoricQueryClient(net);
  const { params } = await client.agoric.swingset.params();
  return params;
};
harden(fetchSwingsetParams);

/**
 * @param {MinimalNetworkConfig & {
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
    const { latest_block_time: time, latest_block_height: height } =
      status.sync_info || status.SyncInfo;
    try {
      // see await null above
      const result = await lookup({ time, height });
      return result;
    } catch (_err) {
      console.error(
        time,
        retryMessage || 'not in block',
        height,
        'retrying...',
      );
      await delay(period);
    }
  }
};

/**
 * @param {string} txhash
 * @param {MinimalNetworkConfig & {
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 *   period?: number,
 * }} opts
 */
export const pollTx = async (txhash, opts) => {
  const { execFileSync, rpcAddrs } = opts;

  const nodeArgs = [`--node=${rpcAddrs[0]}`];
  const outJson = ['--output', 'json'];

  const lookup = async () => {
    const out = execFileSync(
      agdBinary,
      ['query', 'tx', txhash, ...nodeArgs, ...outJson],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    // XXX this type is defined in a .proto file somewhere
    /** @type {{ height: string, txhash: string, code: number, timestamp: string }} */
    const info = JSON.parse(out.toString());
    return info;
  };
  return pollBlocks({ ...opts, retryMessage: 'tx not in block' })(lookup);
};
