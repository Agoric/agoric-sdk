import centralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import mintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';

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
