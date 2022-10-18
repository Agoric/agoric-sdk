// @ts-check
import { makeLeader } from '@agoric/casting';
import { makeImportContext } from '@agoric/wallet/api/src/marshal-contexts';
import { getKeplrAddress } from './getKeplrAddress';
import { getChainId } from './getChainId';
import { watchWallet } from './watchWallet';

// TODO: We need a way to detect the appropriate network-config, and default it
// to mainnet.
const DEFAULT_NETWORK_CONFIG = 'https://ollinet.agoric.net/network-config';
const LOCALHOST_NETWORK_CONFIG = 'http://localhost:3000/wallet/network-config';
export const makeAgoricKeplrConnection = async (
  networkConfig = DEFAULT_NETWORK_CONFIG,
) => {
  const chainId = await getChainId(networkConfig);
  const address = await getKeplrAddress(chainId);

  const context = makeImportContext();
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
