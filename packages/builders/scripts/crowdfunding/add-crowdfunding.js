/**
 * @file Proposal Builder: Add Crowdfunding
 *
 * Usage:
 *   agoric run add-crowdfunding.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  // XXX do we need to repeat the contract name so much?
  harden({
    sourceSpec: '@agoric/crowdfunding/src/proposals/startCrowdfunding.js',
    getManifestCall: [
      'getManifestForCrowdfunding',
      {
        crowdfundingRef: publishRef(
          install(
            '@agoric/crowdfunding/src/crowdfunding.contract.js',
            '../bundles/bundle-crowdfunding.js',
          ),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-add-crowdfunding', defaultProposalBuilder);
};
