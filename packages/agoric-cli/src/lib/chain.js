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

export const execSwingsetTransaction = (swingsetArgs, net, from, dryRun) => {
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
