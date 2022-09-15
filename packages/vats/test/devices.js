import bundleCommittee from '@agoric/governance/bundles/bundle-committee.js';
import bundleContractGovernor from '@agoric/governance/bundles/bundle-contractGovernor.js';
import bundleBinaryVoteCounter from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import bundlePSM from '@agoric/inter-protocol/bundles/bundle-psm.js';
import bundlePSMCharter from '@agoric/inter-protocol/bundles/bundle-psmCharter.js';
import bundleWalletFactory from '@agoric/smart-wallet/bundles/bundle-walletFactory.js';

import bundleCentralSupply from '../bundles/bundle-centralSupply.js';
import bundleMintHolder from '../bundles/bundle-mintHolder.js';
import bundleProvisionPool from '../bundles/bundle-provisionPool.js';

const bundles = {
  centralSupply: bundleCentralSupply,
  mintHolder: bundleMintHolder,
  walletFactory: bundleWalletFactory,
  committee: bundleCommittee,
  contractGovernor: bundleContractGovernor,
  binaryVoteCounter: bundleBinaryVoteCounter,
  psm: bundlePSM,
  psmCharter: bundlePSMCharter,
  provisionPool: bundleProvisionPool,
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
