import { makeWalletUtils } from './wallet.js';

export const networkConfig = {
  rpcAddrs: ['http://0.0.0.0:26657'],
  chainName: 'agoriclocal',
};

export const walletUtils = await makeWalletUtils();
