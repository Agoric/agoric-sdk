/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import Nat from '@agoric/nat';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  defaultAcceptanceMsg,
  makeZoeHelpers,
  secondPriceLogic,
  closeAuction,
} from '../contractSupport';

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  const {
    rejectOffer,
    canTradeWith,
    assertKeywords,
    rejectIfNotProposal,
  } = makeZoeHelpers(zcf);

  let {
    terms: { numBidsAllowed },
  } = zcf.getInstanceRecord();
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
        if (!zcf.isOfferActive(sellerInviteHandle)) {
          const rejectMsg = `The item up for auction is not available or the auction has completed`;
          throw rejectOffer(inviteHandle, rejectMsg);
        }
        if (allBidHandles.length >= numBidsAllowed) {
          throw rejectOffer(inviteHandle, `No further bids allowed.`);
        }
        const expected = harden({
          give: { Bid: null },
          want: { Asset: null },
        });
        rejectIfNotProposal(inviteHandle, expected);
        if (!canTradeWith(sellerInviteHandle, inviteHandle)) {
          const rejectMsg = `Bid was under minimum bid or for the wrong assets`;
          throw rejectOffer(inviteHandle, rejectMsg);
        }

        // Save valid bid and try to close.
        allBidHandles.push(inviteHandle);
        if (allBidHandles.length >= numBidsAllowed) {
          closeAuction(zcf, {
            auctionLogicFn: secondPriceLogic,
            sellerInviteHandle,
            allBidHandles,
          });
        }
        return defaultAcceptanceMsg;
      },
    });
    const { invite, inviteHandle } = zcf.makeInvite(seat, {
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
        const expected = harden({
          give: { Asset: null },
          want: { Bid: null },
        });
        rejectIfNotProposal(inviteHandle, expected);
        // Save the valid offer
        sellerInviteHandle = inviteHandle;
        const { proposal } = zcf.getOffer(inviteHandle);
        auctionedAssets = proposal.give.Asset;
        minimumBid = proposal.want.Bid;
        return defaultAcceptanceMsg;
      },
    });
    const { invite, inviteHandle } = zcf.makeInvite(seat, {
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
