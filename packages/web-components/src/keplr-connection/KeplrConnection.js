// @ts-check
import { makeLeader } from '@agoric/casting';
import { makeImportContext } from '@agoric/smart-wallet/src/marshal-contexts.js';
import { getKeplrAddress } from './getKeplrAddress.js';
import { getChainInfo } from './getChainInfo.js';
import { watchWallet } from './watchWallet.js';
import { watchWalletBatched } from './watchWalletBatched.js';

// TODO: We need a way to detect the appropriate network-config, and default it
// to mainnet.
const DEFAULT_NETWORK_CONFIG = 'https://main.agoric.net/network-config';

export const makeAgoricKeplrConnection = async (
  networkConfig = DEFAULT_NETWORK_CONFIG,
  context = makeImportContext(),
  chainStorageWatcher,
) => {
  const { chainId, rpcs } = await getChainInfo(networkConfig);
  const address = await getKeplrAddress(chainId);

  let walletNotifiers;
  let leader;
  if (chainStorageWatcher) {
    walletNotifiers = await watchWalletBatched(
      chainStorageWatcher,
      address,
      rpcs[Math.floor(Math.random() * rpcs.length)],
    );
  } else {
    leader = makeLeader(networkConfig);
    walletNotifiers = await watchWallet(leader, address, context, rpcs);
  }

  return {
    address,
    chainId,
    unserializer: chainStorageWatcher ? context.fromBoard : undefined,
    leader,
    ...walletNotifiers,
  };
};
