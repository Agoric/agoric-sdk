// @ts-check
/* global process */
import { normalizeBech32 } from '@cosmjs/encoding';
import { execSync } from 'child_process';

export const normalizeAddress = literalOrName => {
  try {
    return normalizeBech32(literalOrName);
  } catch (_) {
    // not an address so try as a key
    const buff = execSync(`agd keys show --address ${literalOrName}`);
    return normalizeBech32(buff.toString().trim());
  }
};
harden(normalizeAddress);

/**
 * SECURITY: closes over process and child_process
 *
 * @param {string} swingsetArgs
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

  const homeOpt = keyring?.home ? `--home=${keyring.home}` : '';
  const backendOpt = keyring?.backend
    ? `--keyring-backend=${keyring.backend}`
    : '';
  const cmd = `agd --node=${rpcAddrs[0]} --chain-id=${chainName} ${homeOpt} ${backendOpt} --from=${from} tx swingset ${swingsetArgs}`;

  if (dryRun) {
    process.stdout.write('Run this interactive command in shell:\n\n');
    process.stdout.write(cmd);
    process.stdout.write('\n');
  } else {
    const yesCmd = `${cmd} --yes`;
    console.log('Executing ', yesCmd);
    execSync(yesCmd);
  }
};
harden(execSwingsetTransaction);

// xxx rpc should be able to query this by HTTP without shelling out
export const fetchSwingsetParams = net => {
  const { chainName, rpcAddrs } = net;
  const cmd = `agd --node=${rpcAddrs[0]} --chain-id=${chainName} query swingset params --output --json`;
  const buffer = execSync(cmd);
  return JSON.parse(buffer.toString());
};
harden(fetchSwingsetParams);
