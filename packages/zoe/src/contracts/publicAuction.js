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
    inviteAnOffer,
  } = makeZoeHelpers(zcf);

  let {
    terms: { numBidsAllowed },
  } = zcf.getInstanceRecord();
  numBidsAllowed = Nat(numBidsAllowed !== undefined ? numBidsAllowed : 3);

  let sellerOfferHandle;
  let minimumBid;
  let auctionedAssets;
  const allBidHandles = [];

  assertKeywords(harden(['Asset', 'Bid']));

  const bidderOfferHook = offerHandle => {
    // Check that the item is still up for auction
    if (!zcf.isOfferActive(sellerOfferHandle)) {
      const rejectMsg = `The item up for auction is not available or the auction has completed`;
      throw rejectOffer(offerHandle, rejectMsg);
    }
    if (allBidHandles.length >= numBidsAllowed) {
      throw rejectOffer(offerHandle, `No further bids allowed.`);
    }
    if (!canTradeWith(sellerOfferHandle, offerHandle)) {
      const rejectMsg = `Bid was under minimum bid or for the wrong assets`;
      throw rejectOffer(offerHandle, rejectMsg);
    }

    // Save valid bid and try to close.
    allBidHandles.push(offerHandle);
    if (allBidHandles.length >= numBidsAllowed) {
      closeAuction(zcf, {
        auctionLogicFn: secondPriceLogic,
        sellerOfferHandle,
        allBidHandles,
      });
    }
    return defaultAcceptanceMsg;
  };

  const makeBidderInvite = () => {
    return inviteAnOffer({
      offerHook: bidderOfferHook,
      customProperties: {
        inviteDesc: 'bid',
        auctionedAssets,
        minimumBid,
      },
      expected: {
        give: { Bid: null },
        want: { Asset: null },
      },
    });
  };

  const sellerOfferHook = offerHandle => {
    if (auctionedAssets) {
      throw rejectOffer(offerHandle, `assets already present`);
    }
    // Save the valid offer
    sellerOfferHandle = offerHandle;
    const { proposal } = zcf.getOffer(offerHandle);
    auctionedAssets = proposal.give.Asset;
    minimumBid = proposal.want.Bid;
    return defaultAcceptanceMsg;
  };

  const makeSellerInvite = () => {
    return inviteAnOffer({
      offerHook: sellerOfferHook,
      customProperties: {
        inviteDesc: 'sellAssets',
      },
      expected: {
        give: { Asset: null },
        want: { Bid: null },
      },
    });
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
