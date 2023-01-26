// @ts-check
import { makeLeader } from '@agoric/casting';
import { makeImportContext } from '@agoric/smart-wallet/src/marshal-contexts.js';
import { getKeplrAddress } from './getKeplrAddress';
import { getChainInfo } from './getChainInfo';
import { watchWallet } from './watchWallet';

// TODO: We need a way to detect the appropriate network-config, and default it
// to mainnet.
const DEFAULT_NETWORK_CONFIG = 'https://main.agoric.net/network-config';

export const makeAgoricKeplrConnection = async (
  networkConfig = DEFAULT_NETWORK_CONFIG,
  context = makeImportContext(),
) => {
  const { chainId, rpcs } = await getChainInfo(networkConfig);
  const address = await getKeplrAddress(chainId);

  const leader = makeLeader(networkConfig);
  const walletNotifiers = await watchWallet(leader, address, context, rpcs);

  return {
    address,
    chainId,
    unserializer: context.fromBoard,
    leader,
    ...walletNotifiers,
  };
};
