import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-orch-core-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingOrchCore',
      {
        bundleRefs: {
          ibc: publishRef(install('@agoric/vats/src/vat-ibc.js')),
          network: publishRef(install('@agoric/vats/src/vat-network.js')),
          localchain: publishRef(install('@agoric/vats/src/vat-localchain.js')),
          transfer: publishRef(install('@agoric/vats/src/vat-transfer.js')),
        },
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-network', defaultProposalBuilder);
};
