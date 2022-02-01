import { E, Far } from '@endo/far';
import walletBundle from '@agoric/wallet-backend/bundles/bundle-wallet.js';

export const buildRootObject = _vatPowers => {
  return Far('walletManager root', {
    buildWalletManager: vatAdminSvc =>
      Far('walletManager', {
        makeWallet: async terms => {
          // agoricNames, namesByAddress, myAddressNameAdmin, zoe, board, localTimerService
          const { bank, feePurse } = terms;

          // FIXME: This is unsustainable.  We need either a single-vat wallet
          // service that switches meters, or to create a meter-limited
          // single-wallet vat.
          const meter = await E(vatAdminSvc).createUnlimitedMeter();
          const opts = { meter };
          const { root } = await E(vatAdminSvc).createVat(walletBundle, opts);

          // We have the wallet vat, so we can now start a wallet.
          await E(root).startup(terms);
          return E(root).getWallet(bank, feePurse);
        },
      }),
  });
};
