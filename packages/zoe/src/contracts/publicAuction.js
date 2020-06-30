/* global harden */
// @ts-check

import Nat from '@agoric/nat';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  defaultAcceptanceMsg,
  makeZoeHelpers,
  secondPriceLogic,
  closeAuction,
} from '../contractSupport';

/**
 * An auction contract in which the seller offers an Asset for sale, and states
 * a minimum price. A pre-announced number of bidders compete to offer the best
 * price. When the appropriate number of bids have been received, the second
 * price rule is followed, so the highest bidder pays the amount bid by the
 * second highest bidder.
 *
 * makeInstance() specifies the issuers and terms ({ numBidsAllowed }) specify
 * the number of bids required. An invitation for the seller is returned. The
 * seller's offer should look like
 * { give: { Asset: asset }, want: { Ask: minimumBidAmount } }
 * The asset can be non-fungible, but the Ask amount should be of a fungible
 * brand.
 * The bidder invitations are available from publicAPI.makeInvites(n). Each
 * bidder can submit an offer: { give: { Bid: null } want: { Asset: null } }.
 *
 * publicAPI also has methods to find out what's being auctioned
 * (getAuctionedAssetsAmounts()), or the minimum bid (getMinimumBid()).
 *
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { rejectOffer, satisfies, assertKeywords, checkHook } = makeZoeHelpers(
    zcf,
  );

  let {
    terms: { numBidsAllowed },
  } = zcf.getInstanceRecord();
  numBidsAllowed = Nat(numBidsAllowed !== undefined ? numBidsAllowed : 3);

  let sellerOfferHandle;
  let minimumBid;
  let auctionedAssets;
  const allBidHandles = [];

  // seller will use 'Asset' and 'Ask'. buyer will use 'Asset' and 'Bid'
  assertKeywords(harden(['Asset', 'Ask']));

  const bidderOfferHook = offerHandle => {
    // Check that the item is still up for auction
    if (!zcf.isOfferActive(sellerOfferHandle)) {
      const rejectMsg = `The item up for auction is not available or the auction has completed`;
      throw rejectOffer(offerHandle, rejectMsg);
    }
    if (allBidHandles.length >= numBidsAllowed) {
      throw rejectOffer(offerHandle, `No further bids allowed.`);
    }
    const sellerSatisfied = satisfies(sellerOfferHandle, {
      Ask: zcf.getCurrentAllocation(offerHandle).Bid,
      Asset: zcf.getAmountMath(auctionedAssets.brand).getEmpty(),
    });
    const bidderSatisfied = satisfies(offerHandle, {
      Asset: zcf.getCurrentAllocation(sellerOfferHandle).Asset,
      Bid: zcf.getAmountMath(minimumBid.brand).getEmpty(),
    });
    if (!(sellerSatisfied && bidderSatisfied)) {
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

  const bidderOfferExpected = harden({
    give: { Bid: null },
    want: { Asset: null },
  });

  const makeBidderInvite = () =>
    zcf.makeInvitation(
      checkHook(bidderOfferHook, bidderOfferExpected),
      'bid',
      harden({
        customProperties: {
          auctionedAssets,
          minimumBid,
        },
      }),
    );

  const sellerOfferHook = offerHandle => {
    if (auctionedAssets) {
      throw rejectOffer(offerHandle, `assets already present`);
    }
    // Save the valid offer
    sellerOfferHandle = offerHandle;
    const { proposal } = zcf.getOffer(offerHandle);
    auctionedAssets = proposal.give.Asset;
    minimumBid = proposal.want.Ask;
    return defaultAcceptanceMsg;
  };

  const sellerOfferExpected = harden({
    give: { Asset: null },
    want: { Ask: null },
  });

  const makeSellerInvite = () =>
    zcf.makeInvitation(
      checkHook(sellerOfferHook, sellerOfferExpected),
      'sellAssets',
    );

  zcf.initPublicAPI(
    harden({
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
    }),
  );

  return makeSellerInvite();
};

harden(makeContract);
export { makeContract };
