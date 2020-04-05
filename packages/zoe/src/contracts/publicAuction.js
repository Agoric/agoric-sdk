/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import Nat from '@agoric/nat';

import { defaultAcceptanceMsg, makeZoeHelpers } from './helpers/zoeHelpers';
import { secondPriceLogic, closeAuction } from './helpers/auctions';

export const makeContract = harden(zoe => {
  const {
    rejectOffer,
    canTradeWith,
    assertKeywords,
    rejectIfNotProposal,
  } = makeZoeHelpers(zoe);

  let {
    terms: { numBidsAllowed },
  } = zoe.getInstanceRecord();
  numBidsAllowed = Nat(numBidsAllowed !== undefined ? numBidsAllowed : 3);

  let sellerInviteHandle;
  let minimumBid;
  let auctionedAssets;
  const allBidHandles = [];

  assertKeywords(harden(['Asset', 'Bid']));

  const makeBidderInvite = () => {
    const seat = harden({
      bid: () => {
        // Check that the item is still up for auction
        if (!zoe.isOfferActive(sellerInviteHandle)) {
          const rejectMsg = `The item up for auction is not available or the auction has completed`;
          throw rejectOffer(inviteHandle, rejectMsg);
        }
        if (allBidHandles.length >= numBidsAllowed) {
          throw rejectOffer(inviteHandle, `No further bids allowed.`);
        }
        const expected = harden({ give: ['Bid'], want: ['Asset'] });
        rejectIfNotProposal(inviteHandle, expected);
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
    });
    const { invite, inviteHandle } = zoe.makeInvitePair(seat, {
      seatDesc: 'bid',
      auctionedAssets,
      minimumBid,
    });
    return invite;
  };

  const makeSellerInvite = () => {
    const seat = harden({
      sellAssets: () => {
        if (auctionedAssets) {
          throw rejectOffer(inviteHandle, `assets already present`);
        }
        const expected = harden({ give: ['Asset'], want: ['Bid'] });
        rejectIfNotProposal(inviteHandle, expected);
        // Save the valid offer
        sellerInviteHandle = inviteHandle;
        const { proposal } = zoe.getOffer(inviteHandle);
        auctionedAssets = proposal.give.Asset;
        minimumBid = proposal.want.Bid;
        return defaultAcceptanceMsg;
      },
    });
    const { invite, inviteHandle } = zoe.makeInvitePair(seat, {
      seatDesc: 'sellAssets',
    });
    return invite;
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
