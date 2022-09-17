// @ts-check
/* global fetch, process */
import { normalizeBech32 } from '@cosmjs/encoding';
import { execSync } from 'child_process';

import { NonNullish } from '@agoric/assert';

/**
 * @typedef {{boardId: string, iface: string}} RpcRemote
 */

export const networkConfigUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.agoric.net/network-config`;
export const rpcUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.rpc.agoric.net:443`;

/**
 * @typedef {{ rpcAddrs: string[], chainName: string }} MinimalNetworkConfig
 */

/**
 *  @param {string} str
 * @returns {Promise<MinimalNetworkConfig>}
 */
const fromAgoricNet = str => {
  const [netName, chainName] = str.split(',');
  if (chainName) {
    return Promise.resolve({ chainName, rpcAddrs: [rpcUrl(netName)] });
  }
  return fetch(networkConfigUrl(netName)).then(res => res.json());
};

/** @type {Promise<MinimalNetworkConfig>} */
export const networkConfigP =
  'AGORIC_NET' in process.env && process.env.AGORIC_NET !== 'local'
    ? fromAgoricNet(NonNullish(process.env.AGORIC_NET))
    : Promise.resolve({
        rpcAddrs: ['http://0.0.0.0:26657'],
        chainName: 'agoric',
      });

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
 * @param {import('./chain').MinimalNetworkConfig} net
 * @param {string} from
 * @param {boolean} [dryRun]
 */
export const execSwingsetTransaction = (
  swingsetArgs,
  net,
  from,
  dryRun = false,
) => {
  const { chainName, rpcAddrs } = net;

  const cmd = `agd --node=${rpcAddrs[0]} --chain-id=${chainName} --from=${from} tx swingset ${swingsetArgs}`;

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
