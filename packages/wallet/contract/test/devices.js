import bundleCentralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import bundleMintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';
import bundleSmartWallet from '@agoric/vats/bundles/bundle-smartWallet.js';

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
