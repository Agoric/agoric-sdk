import type { IBCChannelID, IBCConnectionID, IBCPortID } from '@agoric/vats';
import type { ExecSyncOptions } from 'node:child_process';

const kubectlBinary = 'kubectl';

type RelayerType = 'hermes' | 'go-relayer';

const getRelayerBinary = (relayer: RelayerType) => {
  switch (relayer) {
    case 'hermes':
      return 'hermes';
    case 'go-relayer':
      return 'rly';
    default:
      throw new Error(`Unsupported relayer type: ${relayer}`);
  }
};

const makeKubeArgs = (chainName: string, relayerType: RelayerType) => {
  return [
    'exec',
    '-i',
    `${relayerType}-agoric-${chainName}-0`,
    '-c',
    'relayer',
    '--tty=false',
    '--',
    getRelayerBinary(relayerType),
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

const getPathname = (srcChainId: string, dstChainId: string) =>
  [srcChainId, dstChainId].sort().join('-');

export const makeRelayer = ({
  execFileSync,
}: {
  execFileSync: (typeof import('node:child_process'))['execFileSync'];
}) => {
  const relayerType = (process.env.RELAYER_TYPE || 'hermes') as RelayerType;

  const exec = (
    chainName: string,
    args: string[],
    opts: ExecSyncOptions = {
      encoding: 'utf-8' as const,
      stdio: ['ignore', 'pipe', 'pipe'] as const,
    },
  ) =>
    execFileSync(
      kubectlBinary,
      [...makeKubeArgs(chainName, relayerType), ...args],
      opts,
    );

  /** Submit MsgChannelCloseInit to the src chain */
  const channelCloseInit = (
    chainName: string,
    dst: ChannelCloseParams['dst'],
    src: ChannelCloseParams['src'],
  ) => {
    let args: string[];
    if (relayerType === 'hermes') {
      args = [
        'tx',
        'chan-close-init',
        `--dst-chain=${dst.chainId}`,
        `--src-chain=${src.chainId}`,
        `--dst-connection=${dst.connectionID}`,
        `--dst-port=${dst.portID}`,
        `--src-port=${src.portID}`,
        `--dst-channel=${dst.channelID}`,
        `--src-channel=${src.channelID}`,
      ];
    } else if (relayerType === 'go-relayer') {
      args = [
        'tx',
        'channel-close',
        getPathname(src.chainId, dst.chainId),
        src.channelID,
        src.portID,
      ];
    } else {
      throw new Error(`Unsupported relayer type: ${relayerType}`);
    }
    return exec(chainName, args);
  };

  return {
    exec,
    channelCloseInit,
  };
};
