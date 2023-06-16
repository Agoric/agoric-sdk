import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '../src/proposals/zcf-proposal.js',
    getManifestCall: [
      'getManifestForZoe',
      {
        zcfRef: {
          bundleID:
            'b1-8674abc9a8de561c4a33fb475b87be75708cd901c37931fd5ac1f40d3ee99937a459a6ca7b4a8b7907512626caf98c125f22c15384826e37dfc899dc0bf2a63a',
        },
        zoeRef: {
          bundleID:
            'b1-68963663488ee6d178293b559b9d902cea1857dddac257f08540cb9748647d0218a991ce02cf9f61e1e49cca3979b20473103a7fee509cf808de43e323afab54',
        },
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('replace-zcf', defaultProposalBuilder);
};
