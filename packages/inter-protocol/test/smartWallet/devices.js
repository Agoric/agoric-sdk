import centralSupply from '@agoric/vats/bundles/bundle-centralSupply.js';
import mintHolder from '@agoric/vats/bundles/bundle-mintHolder.js';
import provisionPool from '@agoric/vats/bundles/bundle-provisionPool.js';
import walletFactory from '@agoric/smart-wallet/bundles/bundle-walletFactory.js';
import contractGovernor from '@agoric/governance/bundles/bundle-contractGovernor.js';
import committee from '@agoric/governance/bundles/bundle-committee.js';
import binaryVoteCounter from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import psm from '../../bundles/bundle-psm.js';
import econCommitteeCharter from '../../bundles/bundle-econCommitteeCharter.js';

const bundles = {
  binaryVoteCounter,
  centralSupply,
  committee,
  contractGovernor,
  econCommitteeCharter,
  mintHolder,
  provisionPool,
  psm,
  walletFactory,
};

export const devices = {
  bridge: {
    registerInboundHandler() {
      // nothing
    },
    callOutbound(dstID, obj) {
      // FIXME
      return null;
    },
  },
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
