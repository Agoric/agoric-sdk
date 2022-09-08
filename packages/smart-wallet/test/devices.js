import bundleCentralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import bundleMintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';
import bundleWalletFactory from '@agoric/vats/bundles/bundle-legacy-walletFactory.js';

export const devices = {
  vatAdmin: {
    getNamedBundleCap: name => ({
      getBundle: () => {
        switch (name) {
          case 'centralSupply':
            return bundleCentralSupply;
          case 'mintHolder':
            return bundleMintHolder;
          // TODO(PS0) replace this bundle with the non-legacy smart-wallet
          case 'walletFactory':
            return bundleWalletFactory;
          default:
            throw new Error(`unknown bundle ${name}`);
        }
      },
    }),
  },
};
