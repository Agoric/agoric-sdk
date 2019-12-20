/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { defaultAcceptanceMsg, makeHelpers } from './helpers/userFlow';
import { secondPriceLogic, closeAuction } from './helpers/auctions';

export const makeContract = harden((zoe, terms) => {
  const { assays } = terms;
  const { rejectOffer, canTradeWith, hasValidPayoutRules } = makeHelpers(
    zoe,
    assays,
  );
  const numBidsAllowed = terms.numBidsAllowed || 3;

  let sellerInviteHandle;
  let minimumBid;
  let auctionedAssets;
  const allBidHandles = [];

  // The item up for auction is described first in the payoutRules array
  const ITEM_INDEX = 0;
  const BID_INDEX = 1;

  const makeBidderSeat = () => {
    const seat = harden({
      bid: () => {
        // Check that the item is still up for auction
        if (!zoe.isOfferActive(sellerInviteHandle)) {
          throw rejectOffer(
            inviteHandle,
            `The item up for auction has been withdrawn or the auction has completed`,
          );
        }
        if (allBidHandles.length >= numBidsAllowed) {
          throw rejectOffer(inviteHandle, `No further bids allowed.`);
        }
        if (
          !hasValidPayoutRules(['wantAtLeast', 'offerAtMost'], inviteHandle)
        ) {
          throw rejectOffer(inviteHandle);
        }
        if (!canTradeWith(harden([sellerInviteHandle, inviteHandle]))) {
          throw rejectOffer(
            inviteHandle,
            `Bid was under minimum bid or for the wrong assets`,
          );
        }

        // Save valid bid and try to close.
        allBidHandles.push(inviteHandle);
        if (allBidHandles.length >= numBidsAllowed) {
          closeAuction(zoe, assays, {
            auctionLogicFn: secondPriceLogic,
            itemIndex: ITEM_INDEX,
            bidIndex: BID_INDEX,
            sellerInviteHandle,
            allBidHandles,
          });
        }
        return defaultAcceptanceMsg;
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'bid',
      auctionedAssets,
      minimumBid,
    });
    return invite;
  };

  const makeSellerInvite = () => {
    const seat = harden({
      sellAssets: () => {
        if (
          auctionedAssets ||
          !hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)
        ) {
          throw rejectOffer(inviteHandle);
        }

        // Save the valid offer
        sellerInviteHandle = inviteHandle;
        const { payoutRules } = zoe.getOffer(inviteHandle);
        auctionedAssets = payoutRules[0].units;
        minimumBid = payoutRules[1].units;
        return defaultAcceptanceMsg;
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'sellAssets',
    });
    return invite;
  };

  return harden({
    invite: makeSellerInvite(),
    publicAPI: {
      makeInvites: numInvites => {
        const invites = [];
        for (let i = 0; i < numInvites; i += 1) {
          invites.push(makeBidderSeat());
        }
        return invites;
      },
      getAuctionedAssetsUnits: () => auctionedAssets,
      getMinimumBid: () => minimumBid,
    },
    terms,
  });
});
