// eslint-disable-next-line import/no-extraneous-dependencies -- cannot detect self-reference
import centralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
// eslint-disable-next-line import/no-extraneous-dependencies -- cannot detect self-reference
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
