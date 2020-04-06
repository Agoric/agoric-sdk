import harden from '@agoric/harden';
import Nat from '@agoric/nat';

import { defaultAcceptanceMsg, makeZoeHelpers } from './helpers/zoeHelpers';
import { secondPriceLogic, closeAuction } from './helpers/auctions';

export const makeContract = harden(zoe => {
  const { rejectOffer, canTradeWith, makeInvite } = makeZoeHelpers(zoe);

  let {
    terms: { numBidsAllowed },
  } = zoe.getInstanceRecord();
  numBidsAllowed = Nat(numBidsAllowed !== undefined ? numBidsAllowed : 3);

  let sellerInviteHandle;
  let minimumBid;
  let auctionedAssets;
  const allBidHandles = [];

  const makeBidderInvite = () => {
    return makeInvite(
      inviteHandle => {
        // Check that the item is still up for auction
        if (!zoe.isOfferActive(sellerInviteHandle)) {
          const rejectMsg = `The item up for auction is not available or the auction has completed`;
          throw rejectOffer(inviteHandle, rejectMsg);
        }
        if (allBidHandles.length >= numBidsAllowed) {
          throw rejectOffer(inviteHandle, `No further bids allowed.`);
        }
        if (!canTradeWith(sellerInviteHandle, inviteHandle)) {
          const rejectMsg = `Bid was under minimum bid or for the wrong assets`;
          throw rejectOffer(inviteHandle, rejectMsg);
        }

        // Save valid bid and try to close.
        allBidHandles.push(inviteHandle);
        if (allBidHandles.length >= numBidsAllowed) {
          closeAuction(zoe, {
            auctionLogicFn: secondPriceLogic,
            sellerInviteHandle,
            allBidHandles,
          });
        }
        return defaultAcceptanceMsg;
      },
      {
        seatDesc: 'bid',
        auctionedAssets,
        minimumBid,
      },
      {
        give: ['Bid'],
        want: ['Asset'],
      },
    );
  };

  const makeSellerInvite = () => {
    return makeInvite(
      inviteHandle => {
        if (auctionedAssets) {
          throw rejectOffer(inviteHandle, `assets already present`);
        }
        // Save the valid offer
        sellerInviteHandle = inviteHandle;
        const { proposal } = zoe.getOffer(inviteHandle);
        auctionedAssets = proposal.give.Asset;
        minimumBid = proposal.want.Bid;
        return defaultAcceptanceMsg;
      },
      {
        seatDesc: 'sellAssets',
      },
      {
        give: ['Asset'],
        want: ['Bid'],
      },
    );
  };

  return harden({
    invite: makeSellerInvite(),
    publicAPI: {
      makeInvites: numInvites => {
        if (auctionedAssets === undefined) {
          throw new Error(`No assets are up for auction.`);
        }
        const invites = [];
        for (let i = 0; i < numInvites; i += 1) {
          invites.push(makeBidderInvite());
        }
        return invites;
      },
      getAuctionedAssetsAmounts: () => auctionedAssets,
      getMinimumBid: () => minimumBid,
    },
  });
});
