import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/releaseEmptyEscrow-proposal.js',
    getManifestCall: [
      'getManifestForReleaseEmptyEscrow',
      {
        zoeRef: publishRef(install('@agoric/vats/src/vat-zoe.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('releaseEmptyEscrow', defaultProposalBuilder);
};
