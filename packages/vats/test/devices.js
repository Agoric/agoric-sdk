import bundleCentralSupply from '../bundles/bundle-centralSupply.js';
import bundleMintHolder from '../bundles/bundle-mintHolder.js';

export const devices = {
  vatAdmin: {
    getNamedBundleCap: name => ({
      getBundle: () => {
        if (name === 'centralSupply') {
          return bundleCentralSupply;
        } else if (name === 'mintHolder') {
          return bundleMintHolder;
        }
        throw new Error(`unknown bundle ${name}`);
      },
    }),
  },
};
