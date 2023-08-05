import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/zcf-proposal.js',
    getManifestCall: [
      'getManifestForZoe',
      {
        zoeRef: publishRef(install('../src/vat-zoe.js')),
        zcfRef: publishRef(install('../../zoe/src/contractFacet/vatRoot.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('replace-zcf', defaultProposalBuilder);
};
