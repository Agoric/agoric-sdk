import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-vats-generic-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingVats',
      {
        bundleRefs: {
          ibc: publishRef(install('@agoric/vats/src/vat-ibc.js')),
          network: publishRef(install('@agoric/vats/src/vat-network.js')),
          localchain: publishRef(install('@agoric/vats/src/vat-localchain.js')),
          transfer: publishRef(install('@agoric/vats/src/vat-transfer.js')),
          orchestration: publishRef(
            install('@agoric/orchestration/src/vat-orchestration.js'),
          ),
        },
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-network', defaultProposalBuilder);
};
