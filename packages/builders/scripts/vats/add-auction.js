import { makeHelpers } from '@agoric/deploy-script-support';
import {
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';

// Build proposal for sim-chain etc.
/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async () => {
  const auctionParams = harden({
    StartFrequency: 1n * SECONDS_PER_HOUR,
    ClockStep: 3n * SECONDS_PER_MINUTE,
    StartingRate: 10500n,
    LowestRate: 6500n,
    DiscountStep: 500n,
    AuctionStartDelay: 2n,
    PriceLockPeriod: SECONDS_PER_HOUR / 2n,
  });
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/add-auction.js',
    getManifestCall: ['getManifestForAddAuction', auctionParams],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('add-auction', defaultProposalBuilder);
};
