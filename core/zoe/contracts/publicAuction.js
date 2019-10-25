import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import { hasRulesAndAssays } from './helpers/offerDesc';
import {
  isOverMinimumBid,
  secondPriceLogic,
  closeAuction,
} from './helpers/auctions';

export const makeContract = harden((zoe, terms) => {
  const numBidsAllowed = terms.numBidsAllowed || 3;

  let creatorOfferHandle;
  const allBidHandles = [];

  // The item up for auction is described first in the offerDesc array
  const ITEM_INDEX = 0;
  const BID_INDEX = 1;

  const publicAuction = harden({
    startAuction: async escrowReceipt => {
      const {
        offerHandle,
        conditions: { offerDesc: offerMadeDesc },
      } = await zoe.burnEscrowReceipt(escrowReceipt);

      const ruleFormat = ['offerExactly', 'wantAtLeast'];
      if (!hasRulesAndAssays(ruleFormat, terms.assays, offerMadeDesc)) {
        return rejectOffer(offerHandle);
      }

      // Save the valid offer
      creatorOfferHandle = offerHandle;
      return defaultAcceptanceMsg;
    },
    bid: async escrowReceipt => {
      const {
        offerHandle,
        conditions: { offerDesc: offerMadeDesc },
      } = await zoe.burnEscrowReceipt(escrowReceipt);

      // Check that the item is still up for auction
      const { inactive } = zoe.getStatusFor(harden([creatorOfferHandle]));
      if (inactive.length > 0) {
        return rejectOffer(
          zoe,
          offerHandle,
          'The item up for auction has been withdrawn or the auction has completed',
        );
      }

      if (allBidHandles.length >= numBidsAllowed) {
        return rejectOffer(zoe, offerHandle, `No further bids allowed.`);
      }

      const ruleFormat = ['wantExactly', 'offerAtMost'];
      if (!hasRulesAndAssays(ruleFormat, terms.assays, offerMadeDesc)) {
        return rejectOffer(zoe, offerHandle);
      }

      if (!isOverMinimumBid(zoe, BID_INDEX, creatorOfferHandle, offerHandle)) {
        return rejectOffer(zoe, offerHandle, `Bid was under minimum bid`);
      }

      // Save valid bid and try to close.
      allBidHandles.push(offerHandle);
      if (allBidHandles.length >= numBidsAllowed) {
        closeAuction(zoe, {
          auctionLogicFn: secondPriceLogic,
          itemIndex: ITEM_INDEX,
          bidIndex: BID_INDEX,
          creatorOfferHandle,
          allBidHandles,
        });
      }
      return defaultAcceptanceMsg;
    },
  });

  return harden({
    instance: publicAuction,
    assays: terms.assays,
  });
});
