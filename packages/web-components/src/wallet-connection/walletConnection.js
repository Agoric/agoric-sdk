// @ts-check
import { getKeplrAddress } from '../getKeplrAddress.js';
import { watchWallet } from './watchWallet.js';

export const makeAgoricWalletConnection = async chainStorageWatcher => {
  const address = await getKeplrAddress(chainStorageWatcher.chainId);

  const walletNotifiers = await watchWallet(chainStorageWatcher, address);

  return {
    address,
    ...walletNotifiers,
  };
};
