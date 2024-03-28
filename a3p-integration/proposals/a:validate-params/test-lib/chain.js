/** @file copied from packages/agoric-cli */
// TODO DRY in https://github.com/Agoric/agoric-sdk/issues/9109
// @ts-check
/* global process */

const agdBinary = 'agd';

/**
 * @param {ReadonlyArray<string>} swingsetArgs
 * @param {import('./rpc.js').MinimalNetworkConfig & {
 *   from: string,
 *   fees?: string,
 *   dryRun?: boolean,
 *   verbose?: boolean,
 *   keyring?: {home?: string, backend: string}
 *   stdout?: Pick<import('stream').Writable, 'write'>
 *   execFileSync: typeof import('child_process').execFileSync
 * }} opts
 */
export const execSwingsetTransaction = (swingsetArgs, opts) => {
  const {
    from,
    fees,
    dryRun = false,
    verbose = true,
    keyring = undefined,
    chainName,
    rpcAddrs,
    stdout = process.stdout,
    execFileSync,
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
 * @param {import('./rpc.js').MinimalNetworkConfig & {
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 *   period?: number,
 *   retryMessage?: string,
 * }} opts
 * @returns {<T>(l: (b: { time: string, height: string }) => Promise<T>) => Promise<T>}
 */
export const pollBlocks = opts => async lookup => {
  const { execFileSync, delay, rpcAddrs, period = 3 * 1000 } = opts;
  assert(execFileSync, 'missing execFileSync');
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
 * @param {import('./rpc.js').MinimalNetworkConfig & {
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 *   period?: number,
 * }} opts
 */
export const pollTx = async (txhash, opts) => {
  const { execFileSync, rpcAddrs, chainName } = opts;
  assert(execFileSync, 'missing execFileSync in pollTx');

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
