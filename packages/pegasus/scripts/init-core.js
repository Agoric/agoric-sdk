import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '../src/proposals/core-proposal.js',
    getManifestCall: [
      'getManifestForPegasus',
      {
        pegasusRef: publishRef(
          install('../src/pegasus.js', '../bundles/bundle-pegasus.js'),
        ),
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-pegasus', defaultProposalBuilder);
};
