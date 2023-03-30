// @ts-check
/* global process */
import { normalizeBech32 } from '@cosmjs/encoding';
import { execFileSync as execFileSyncAmbient } from 'child_process';

const agdBinary = 'agd';

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
 * @param {ReadonlyArray<string>} swingsetArgs
 * @param {import('./rpc').MinimalNetworkConfig & {
 *   from: string,
 *   dryRun?: boolean,
 *   keyring?: {home: string, backend: string}
 *   stdout?: Pick<import('stream').Writable, 'write'>
 *   execFileSync?: typeof import('child_process').execFileSync
 * }} opts
 */
export const execSwingsetTransaction = (swingsetArgs, opts) => {
  const {
    from,
    dryRun = false,
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
    console.log('Executing ', yesCmd);
    execFileSync(agdBinary, yesCmd);
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
