import bundleCentralSupply from '../bundles/bundle-centralSupply.js';
import bundleMintHolder from '../bundles/bundle-mintHolder.js';
import bundleSmartWallet from '../bundles/bundle-smartWallet.js';

export const devices = {
  vatAdmin: {
    getNamedBundleCap: name => ({
      getBundle: () => {
        switch (name) {
          case 'centralSupply':
            return bundleCentralSupply;
          case 'mintHolder':
            return bundleMintHolder;
          case 'smartWallet':
            return bundleSmartWallet;
          default:
            throw new Error(`unknown bundle ${name}`);
        }
      },
    }),
  },
};
