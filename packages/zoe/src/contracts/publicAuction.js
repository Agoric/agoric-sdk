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
      canTradeWith,
      assertKeywords,
      checkHook,
    } = makeZoeHelpers(zcf);

    let {
      terms: { numBidsAllowed },
    } = zcf.getInstanceRecord();
    numBidsAllowed = Nat(numBidsAllowed !== undefined ? numBidsAllowed : 3);

    const allBidHandles = [];

    assertKeywords(harden(['Asset', 'Bid']));

    const makeBidderOfferHook = sellerOfferHandle => bidderOfferHandle => {
      // Check that the item is still up for auction
      if (!zcf.isOfferActive(sellerOfferHandle)) {
        const rejectMsg = `The item up for auction is not available or the auction has completed`;
        throw rejectOffer(bidderOfferHandle, rejectMsg);
      }
      if (allBidHandles.length >= numBidsAllowed) {
        throw rejectOffer(bidderOfferHandle, `No further bids allowed.`);
      }
      if (!canTradeWith(sellerOfferHandle, bidderOfferHandle)) {
        const rejectMsg = `Bid was under minimum bid or for the wrong assets`;
        throw rejectOffer(bidderOfferHandle, rejectMsg);
      }

      // Save valid bid and try to close.
      allBidHandles.push(bidderOfferHandle);
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

    const makeBidderInvite = (sellerOfferHandle, auctionedAssets, minimumBid) =>
      zcf.makeInvitation(
        checkHook(makeBidderOfferHook(sellerOfferHandle), bidderOfferExpected),
        'bid',
        harden({
          customProperties: {
            auctionedAssets,
            minimumBid,
          },
        }),
      );

    const sellerOfferExpected = harden({
      give: { Asset: null },
      want: { Bid: null },
    });

    const sellerOfferHook = sellerOfferHandle => {
      const auctionedAssets = zcf.getCurrentAllocation(sellerOfferHandle).Asset;
      const minimumBid = zcf.getOffer(sellerOfferHandle).proposal.want.Bid;
      const amountMaths = zcf.getAmountMaths(['Asset']);
      zcf.initPublicAPI(
        harden({
          makeInvites: numInvites => {
            if (amountMaths.Asset.isEmpty(auctionedAssets)) {
              throw new Error(`No assets are up for auction.`);
            }
            const invites = [];
            for (let i = 0; i < numInvites; i += 1) {
              invites.push(
                makeBidderInvite(
                  sellerOfferHandle,
                  auctionedAssets,
                  minimumBid,
                ),
              );
            }
            return invites;
          },
          getAuctionedAssetsAmounts: () => auctionedAssets,
          getMinimumBid: () => minimumBid,
        }),
      );
      return defaultAcceptanceMsg;
    };

    const makeSellerInvite = () =>
      zcf.makeInvitation(
        checkHook(sellerOfferHook, sellerOfferExpected),
        'sellAssets',
      );

    return makeSellerInvite();
  },
);
