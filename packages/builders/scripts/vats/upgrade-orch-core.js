import { makeHelpers } from '@agoric/deploy-script-support';

const bundleSources = {
  ibc: '@agoric/vats/src/vat-ibc.js',
  network: '@agoric/vats/src/vat-network.js',
  localchain: '@agoric/vats/src/vat-localchain.js',
  orchestration: '@agoric/orchestration/src/vat-orchestration.js',
  transfer: '@agoric/vats/src/vat-transfer.js',
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  opts = {},
) => {
  /** @type {{ bundleFilter: string[] | undefined}} */
  const { bundleFilter } = opts;
  const bundleRefs = Object.fromEntries(
    Object.entries(bundleSources)
      .filter(([name]) => !bundleFilter || bundleFilter.includes(name))
      .map(([name, source]) => [name, publishRef(install(source))]),
  );
  return harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-orch-core-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingOrchCore',
      {
        bundleRefs,
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-network', defaultProposalBuilder);
};
