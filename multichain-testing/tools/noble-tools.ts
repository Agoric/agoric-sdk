import type { IBCChannelID } from '@agoric/vats';
import type { ExecSync } from './agd-lib.js';
import type { ChainAddress } from '@agoric/orchestration';

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

export const makeNobleTools = ({
  execFileSync,
}: {
  execFileSync: ExecSync;
}) => {
  const exec = (
    args: string[],
    opts = { encoding: 'utf-8' as const, stdio: ['ignore', 'pipe', 'ignore'] },
  ) => execFileSync(kubectlBinary, [...makeKubeArgs(), ...args], opts);

  const checkEnv = () => {
    if (process.env.FILE !== 'config.fusdc.yaml') {
      console.error('Warning: Noble chain must be running for this to work');
    }
  };

  const registerForwardingAcct = (
    channelId: IBCChannelID,
    address: ChainAddress['value'],
  ) => {
    checkEnv();
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
    checkEnv();
    return JSON.parse(
      exec([
        'tx',
        'bank',
        'send',
        'faucet',
        destination,
        `${Number(amount)}uusdc`,
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
  ) => {
    checkEnv();
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
