// @ts-check
import centralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import mintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';
import provisionPool from '@agoric/vats/bundles/bundle-provisionPool.js';
import priceAggregator from '@agoric/zoe/bundles/bundle-priceAggregator.js';

import walletFactory from '../bundles/bundle-walletFactory.js';

const bundles = {
  centralSupply,
  mintHolder,
  provisionPool,
  priceAggregator,
  walletFactory,
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
