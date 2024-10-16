import type { IBCChannelID, IBCConnectionID, IBCPortID } from '@agoric/vats';
import type { ExecSync } from './agd-lib.js';

const kubectlBinary = 'kubectl';

// based on config.yaml
const relayerMap: { [key: string]: string } = {
  osmosis: 'hermes-agoric-osmosis-0',
  cosmoshub: 'hermes-agoric-gaia-0',
};

const makeKubeArgs = (chainName: string) => {
  if (!relayerMap[chainName]) throw Error('Unsupported chain: ' + chainName);
  return [
    'exec',
    '-i',
    relayerMap[chainName],
    '-c',
    'relayer',
    '--tty=false',
    '--',
    'hermes',
  ];
};

type ChannelCloseParams = {
  dst: {
    chainId: string;
    portID: IBCPortID;
    channelID: IBCChannelID;
    connectionID: IBCConnectionID;
  };
  src: {
    chainId: string;
    portID: IBCPortID;
    channelID: IBCChannelID;
  };
};

export const makeHermes = ({ execFileSync }: { execFileSync: ExecSync }) => {
  const exec = (
    chainName: string,
    args: string[],
    opts = { encoding: 'utf-8' as const, stdio: ['ignore', 'pipe', 'ignore'] },
  ) => execFileSync(kubectlBinary, [...makeKubeArgs(chainName), ...args], opts);

  /** Submit MsgChannelCloseInit to the src chain */
  const channelCloseInit = (
    chainName: string,
    dst: ChannelCloseParams['dst'],
    src: ChannelCloseParams['src'],
  ) => {
    return exec(chainName, [
      'tx',
      'chan-close-init',
      `--dst-chain=${dst.chainId}`,
      `--src-chain=${src.chainId}`,
      `--dst-connection=${dst.connectionID}`,
      `--dst-port=${dst.portID}`,
      `--src-port=${src.portID}`,
      `--dst-channel=${dst.channelID}`,
      `--src-channel=${src.channelID}`,
    ]);
  };

  return {
    exec,
    channelCloseInit,
  };
};
