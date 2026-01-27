import binaryVoteCounter from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import committee from '@agoric/governance/bundles/bundle-committee.js';
import contractGovernor from '@agoric/governance/bundles/bundle-contractGovernor.js';
import walletFactory from '@agoric/smart-wallet/bundles/bundle-walletFactory.js';
import centralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import mintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';
import provisionPool from '@agoric/vats/bundles/bundle-provisionPool.js';
// eslint-disable-next-line import/no-extraneous-dependencies -- cannot detect self-reference
import econCommitteeCharter from '@agoric/inter-protocol/bundles/bundle-econCommitteeCharter.js';
// eslint-disable-next-line import/no-extraneous-dependencies -- cannot detect self-reference
import psm from '@agoric/inter-protocol/bundles/bundle-psm.js';

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
