import centralSupply from '../bundles/bundle-centralSupply.js';
import mintHolder from '../bundles/bundle-mintHolder.js';

export const bundles = {
  centralSupply,
  mintHolder,
};

export const devices = {
  vatAdmin: {
    getNamedBundleCap: name => ({
      getBundle: () => {
        const bundle = bundles[name];
        assert(bundle, `unknown bundle ${name}`);
        return bundle;
      },
    }),
  },
};
