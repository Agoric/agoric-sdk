import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { vatsSourceSpecRegistry } from '@agoric/vats/source-spec-registry.js';
import { governanceSourceSpecRegistry } from '@agoric/governance/source-spec-registry.js';
import { smartWalletSourceSpecRegistry } from '@agoric/smart-wallet/source-spec-registry.js';
import { interProtocolBundleSpecs } from '../../source-spec-registry.js';

const bundleCache = await unsafeMakeBundleCache('bundles/');
const {
  binaryVoteCounterBundle: binaryVoteCounter,
  committeeBundle: committee,
  contractGovernorBundle: contractGovernor,
} = await bundleCache.loadRegistry(governanceSourceSpecRegistry);
const { walletFactoryBundle: walletFactory } = await bundleCache.loadRegistry(
  smartWalletSourceSpecRegistry,
);
const { centralSupplyBundle: centralSupply, mintHolderBundle: mintHolder } =
  await bundleCache.loadRegistry(vatsSourceSpecRegistry);
const {
  provisionPoolBundle: provisionPool,
  econCommitteeCharterBundle: econCommitteeCharter,
  psmBundle: psm,
} = await bundleCache.loadRegistry(interProtocolBundleSpecs);

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
