import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/add-auction.js',
    getManifestCall: [
      'getManifestForAddAuction',
      {
        auctioneerRef: publishRef(
          install(
            '@agoric/inter-protocol/src/auction/auctioneer.js',
            '../../inter-protocol/bundles/bundle-auctioneer.js',
          ),
        ),
        contractGovernorRef: publishRef(
          install(
            '@agoric/governance/src/contractGovernor.js',
            '../bundles/bundle-contractGovernor.js',
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('add-auction', defaultProposalBuilder);
};
