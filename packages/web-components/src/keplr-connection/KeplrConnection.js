// @ts-check
import { makeLeader } from '@agoric/casting';
import { makeImportContext } from '@agoric/wallet/api/src/marshal-contexts';
import { getKeplrAddress } from './getKeplrAddress';
import { getChainId } from './getChainId';
import { watchWallet } from './watchWallet';

// TODO: We need a way to detect the appropriate network-config, and default it
// to mainnet.
const DEFAULT_NETWORK_CONFIG = 'https://main.agoric.net/network-config';

export const makeAgoricKeplrConnection = async (
  networkConfig = DEFAULT_NETWORK_CONFIG,
  context = makeImportContext(),
) => {
  const chainId = await getChainId(networkConfig);
  const address = await getKeplrAddress(chainId);

  const leader = makeLeader(networkConfig);
  const walletNotifiers = await watchWallet(leader, address, context);

  return {
    address,
    chainId,
    unserializer: context.fromBoard,
    leader,
    ...walletNotifiers,
  };
};
