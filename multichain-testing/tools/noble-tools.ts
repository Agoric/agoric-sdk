import type { IBCChannelID } from '@agoric/vats';
import type { ExecSync } from './agd-lib.js';
import type { ChainAddress } from '@agoric/orchestration';
import type { NobleAddress } from '@agoric/fast-usdc';

const kubectlBinary = 'kubectl';
const noblePod = 'noblelocal-genesis-0';
const nobleBinary = 'nobled';

const makeKubeArgs = () => {
  return [
    'exec',
    '-i',
    noblePod,
    '-c',
    'validator',
    '--tty=false',
    '--',
    nobleBinary,
  ];
};

export const makeNobleTools = (
  {
    execFileSync,
  }: {
    execFileSync: ExecSync;
  },
  log: (...args: unknown[]) => void = (...args) =>
    console.log('NobleTools', ...args),
) => {
  const exec = (
    args: string[],
    opts = { encoding: 'utf-8' as const, stdio: ['ignore', 'pipe', 'ignore'] },
  ) => execFileSync(kubectlBinary, [...makeKubeArgs(), ...args], opts);

  const registerForwardingAcct = (
    channelId: IBCChannelID,
    address: ChainAddress['value'],
  ): { txhash: string; code: number; data: string; height: string } => {
    log('creating forwarding address', address, channelId);
    return JSON.parse(
      exec([
        'tx',
        'forwarding',
        'register-account',
        channelId,
        address,
        '--from=genesis',
        '-y',
        '-b',
        'block',
      ]),
    );
  };

  const mockCctpMint = (amount: bigint, destination: ChainAddress['value']) => {
    const denomAmount = `${Number(amount)}uusdc`;
    log('mock cctp mint', destination, denomAmount);
    return JSON.parse(
      exec([
        'tx',
        'bank',
        'send',
        'faucet',
        destination,
        denomAmount,
        '--from=faucet',
        '-y',
        '-b',
        'block',
      ]),
    );
  };

  const queryForwardingAddress = (
    channelId: IBCChannelID,
    address: ChainAddress['value'],
  ): { address: NobleAddress; exists: boolean } => {
    log('querying forwarding address', address, channelId);
    return JSON.parse(
      exec([
        'query',
        'forwarding',
        'address',
        channelId,
        address,
        '--output=json',
      ]),
    );
  };

  return {
    mockCctpMint,
    queryForwardingAddress,
    registerForwardingAcct,
  };
};

export type NobleTools = ReturnType<typeof makeNobleTools>;
