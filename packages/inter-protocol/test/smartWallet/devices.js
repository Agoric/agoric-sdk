import binaryVoteCounter from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import committee from '@agoric/governance/bundles/bundle-committee.js';
import contractGovernor from '@agoric/governance/bundles/bundle-contractGovernor.js';
import walletFactory from '@agoric/smart-wallet/bundles/bundle-walletFactory.js';
import centralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import mintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';
import provisionPool from '@agoric/vats/bundles/bundle-provisionPool.js';
import econCommitteeCharter from '../../bundles/bundle-econCommitteeCharter.js';
import psm from '../../bundles/bundle-psm.js';

export const bundles = {
  binaryVoteCounter,
  centralSupply,
  committee,
  contractGovernor,
  mintHolder,
  provisionPool,
  psm,
  econCommitteeCharter,
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
