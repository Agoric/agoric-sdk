import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/orchestration-proposal.js',
    getManifestCall: [
      'getManifestForOrchestration',
      {
        orchestrationRef: publishRef(
          install('@agoric/vats/src/vat-orchestration.js'),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-orchestration', defaultProposalBuilder);
};
