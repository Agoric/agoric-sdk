// @ts-check
/* global process */
import { normalizeBech32 } from '@cosmjs/encoding';
import { execFileSync } from 'child_process';

const agdBinary = 'agd';

export const normalizeAddress = literalOrName => {
  try {
    return normalizeBech32(literalOrName);
  } catch (_) {
    // not an address so try as a key
    const buff = execFileSync(agdBinary, [
      `keys`,
      `show`,
      `--address`,
      literalOrName,
    ]);
    return normalizeBech32(buff.toString().trim());
  }
};
harden(normalizeAddress);

/**
 * SECURITY: closes over process and child_process
 *
 * @param {ReadonlyArray<string>} swingsetArgs
 * @param {import('./rpc').MinimalNetworkConfig} net
 * @param {string} from
 * @param {boolean} [dryRun]
 * @param {{home: string, backend: string}} [keyring]
 */
export const execSwingsetTransaction = (
  swingsetArgs,
  net,
  from,
  dryRun = false,
  keyring = undefined,
) => {
  const { chainName, rpcAddrs } = net;
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
    process.stdout.write(`Run this interactive command in shell:\n\n`);
    process.stdout.write(`${agdBinary} `);
    process.stdout.write(cmd.join(' '));
    process.stdout.write('\n');
  } else {
    const yesCmd = cmd.concat(['--yes']);
    console.log('Executing ', yesCmd);
    execFileSync(agdBinary, yesCmd);
  }
};
harden(execSwingsetTransaction);

// xxx rpc should be able to query this by HTTP without shelling out
export const fetchSwingsetParams = net => {
  const { chainName, rpcAddrs } = net;
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
