// @ts-check

import harden from '@agoric/harden';
import Nat from '@agoric/nat';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  defaultAcceptanceMsg,
  makeZoeHelpers,
  secondPriceLogic,
  closeAuction,
} from '../contractSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    const {
      rejectOffer,
      canTradeWithMapKeywords,
      assertKeywords,
      checkHook,
    } = makeZoeHelpers(zcf);

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
      if (
        !canTradeWithMapKeywords(sellerOfferHandle, offerHandle, [
          ['Asset', 'Ask'],
          ['Asset', 'Bid'],
        ])
      ) {
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
  },
);
