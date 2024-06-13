import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-provisionPool-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingProvisionPool',
      {
        provisionPoolRef: publishRef(
          install('@agoric/inter-protocol/src/provisionPool.js'),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-provision-pool', defaultProposalBuilder);
};
