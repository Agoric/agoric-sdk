import type { IBCChannelID } from '@agoric/vats';
import type { CosmosChainAddress } from '@agoric/orchestration';
import type { NobleAddress } from '@agoric/fast-usdc';
import type { ExecSyncOptions } from 'node:child_process';

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
    execFileSync: (typeof import('node:child_process'))['execFileSync'];
  },
  log: (...args: unknown[]) => void = (...args) =>
    console.log('NobleTools', ...args),
) => {
  const exec = (
    args: string[],
    opts: ExecSyncOptions = {
      encoding: 'utf-8' as const,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ) =>
    execFileSync(kubectlBinary, [...makeKubeArgs(), ...args], opts) as string;

  const registerForwardingAcct = (
    channelId: IBCChannelID,
    address: CosmosChainAddress['value'],
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
        // FIXME removed in cosmos-sdk https://github.com/Agoric/agoric-sdk/issues/9016
        '--broadcast-mode',
        'sync',
      ]),
    );
  };

  const mockCctpMint = (
    amount: bigint,
    destination: CosmosChainAddress['value'],
  ) => {
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
        // FIXME removed in cosmos-sdk https://github.com/Agoric/agoric-sdk/issues/9016
        '--broadcast-mode',
        'sync',
      ]),
    );
  };

  /**
 * Blocks synchronously for the given number of milliseconds.
 * @param {number} ms  Milliseconds to sleep
 */
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // spin
  }
}
  const queryForwardingAddress = (
    channelId: IBCChannelID,
    address: CosmosChainAddress['value'],
  ): { address: NobleAddress; exists: boolean } => {
    // want to sleep for 10 seconds
    log('sleeping for 10 seconds before querying forwarding address');
    sleepSync(10000);
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
