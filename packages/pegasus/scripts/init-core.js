import { makeHelpers } from '@agoric/deploy-script-support';

export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '../src/core-proposal.js',
    getManifestCall: [
      'getManifestForPegasus',
      {
        pegasusRef: publishRef(
          install('../src/pegasus.js', '../bundles/bundle-pegasus.js'),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-pegasus', defaultProposalBuilder);
};
