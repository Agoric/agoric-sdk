import bundleCentralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import bundleMintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';
import bundleSingleWallet from '@agoric/vats/bundles/bundle-singleWallet.js';
import bundleWalletFactory from '@agoric/vats/bundles/bundle-walletFactory.js';
import bundleProvisionPool from '@agoric/vats/bundles/bundle-provisionPool.js';

export const devices = {
  vatAdmin: {
    getNamedBundleCap: name => ({
      getBundle: () => {
        switch (name) {
          case 'centralSupply':
            return bundleCentralSupply;
          case 'mintHolder':
            return bundleMintHolder;
          case 'singleWallet':
            return bundleSingleWallet;
          case 'walletFactory':
            return bundleWalletFactory;
          case 'provisionPool':
            return bundleProvisionPool;
          default:
            throw new Error(`unknown bundle ${name}`);
        }
      },
    }),
  },
};
