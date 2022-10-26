import binaryVoteCounter from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import committee from '@agoric/governance/bundles/bundle-committee.js';
import contractGovernor from '@agoric/governance/bundles/bundle-contractGovernor.js';
import psm from '@agoric/inter-protocol/bundles/bundle-psm.js';
import psmCharter from '@agoric/inter-protocol/bundles/bundle-psmCharter.js';
import walletFactory from '@agoric/smart-wallet/bundles/bundle-walletFactory.js';
import priceAggregator from '@agoric/zoe/bundles/bundle-priceAggregator.js';

import centralSupply from '../bundles/bundle-centralSupply.js';
import mintHolder from '../bundles/bundle-mintHolder.js';
import provisionPool from '../bundles/bundle-provisionPool.js';

const bundles = {
  binaryVoteCounter,
  centralSupply,
  committee,
  contractGovernor,
  mintHolder,
  priceAggregator,
  provisionPool,
  psm,
  psmCharter,
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
