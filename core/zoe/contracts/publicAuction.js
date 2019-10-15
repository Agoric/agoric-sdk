import harden from '@agoric/harden';

import makePromise from '../../../util/makePromise';

export const makeContract = harden(zoe => {
  const isValidOffer = (
    extentOps,
    offerIds,
    offerIdsToOfferDescs,
    offerMadeDesc,
  ) => {
    const makeHasOkRules = validRules => offer =>
      validRules.every((rule, i) => rule === offer[i].rule, true);

    // The assay array is ordered such that the item assay is first
    // and the price assay is second. All of the related arrays
    // (descOps, extentOps, etc.) also use this same ordering.
    const PRICE_INDEX = 1;

    // We expect the first offer to be the creator of the auction
    const CREATOR_OFFER_ID_INDEX = 0;

    const hasOkRulesInitialOffer = makeHasOkRules(
      ['offerExactly', 'wantAtLeast'], // The initial offer
    );

    const hasOkRulesBids = makeHasOkRules(
      ['wantExactly', 'offerAtMost'], // Subsequent bids
    );

    const isValidInitialOfferDesc = newOfferDesc =>
      hasOkRulesInitialOffer(newOfferDesc);

    const isValidBid = (initialOffer, newBid) =>
      hasOkRulesBids(newBid) &&
      extentOps[PRICE_INDEX].includes(
        newBid[PRICE_INDEX].assetDesc.extent,
        initialOffer[PRICE_INDEX].assetDesc.extent,
      );

    const isInitialOffer = offerIds.length === 0;
    return (
      (isInitialOffer && isValidInitialOfferDesc(offerMadeDesc)) ||
      (!isInitialOffer &&
        isValidBid(
          offerIdsToOfferDescs.get(offerIds[CREATOR_OFFER_ID_INDEX]),
          offerMadeDesc,
        ))
    );
  };

  const reallocate = (
    extentOps,
    offerIds,
    _offerIdsToOfferDescs,
    getExtentsFor,
  ) => {
    const ITEM_INDEX = 0;
    const PRICE_INDEX = 1;

    const CREATOR_OFFER_ID_INDEX = 0;

    // Iterate over all of the bids keeping the highest and second highest bid.
    const findWinnerAndPrice = (bidExtentOps, bidOfferIds, bids) => {
      let highestBid = bidExtentOps.empty();
      let secondHighestBid = bidExtentOps.empty();
      let offerIdHighestBid;
      // If the bid is greater than the highest bid, it is the new highest
      // bid.
      // Has side effects
      // eslint-disable-next-line array-callback-return
      bidOfferIds.map((offerId, i) => {
        const bid = bids[i];
        if (bidExtentOps.includes(bid, highestBid)) {
          secondHighestBid = highestBid;
          highestBid = bid;
          offerIdHighestBid = offerId;
        } else if (bidExtentOps.includes(bid, secondHighestBid)) {
          // If the bid is not greater than the highest bid, but is greater
          // than the second highest bid, it is the new second highest bid.
          secondHighestBid = bid;
        }
      });
      return {
        winnerOfferId: offerIdHighestBid,
        price: secondHighestBid,
      };
    };

    // We can expect that the first offer created the auction, and
    // subsequent offers are bids.
    const creatorOfferId = offerIds[CREATOR_OFFER_ID_INDEX];
    const bidOfferIds = harden(offerIds.slice(1));
    const bids = getExtentsFor(bidOfferIds).map(
      bidArray => bidArray[PRICE_INDEX],
    );

    const itemExtentOps = extentOps[ITEM_INDEX];
    const priceExtentOps = extentOps[PRICE_INDEX];

    const { winnerOfferId, price } = findWinnerAndPrice(
      extentOps[PRICE_INDEX],
      bidOfferIds,
      bids,
    );
    const [oldCreatorExtents, oldWinnerExtents] = getExtentsFor(
      harden([creatorOfferId, winnerOfferId]),
    );

    const newCreatorExtents = [];
    const newWinnerExtents = [];

    // The winner gets the assets put up for auction.
    // eslint-disable-next-line prefer-destructuring
    newWinnerExtents[ITEM_INDEX] = oldCreatorExtents[ITEM_INDEX];
    newCreatorExtents[ITEM_INDEX] = itemExtentOps.empty();

    // The person who created the auction gets the price paid.
    newCreatorExtents[PRICE_INDEX] = price;

    // The winner gets to keep the difference between their bid and the
    // price paid.
    newWinnerExtents[PRICE_INDEX] = priceExtentOps.without(
      oldWinnerExtents[PRICE_INDEX],
      price,
    );

    // Everyone else gets a refund so their extents remain the same.
    return harden({
      reallocOfferIds: [creatorOfferId, winnerOfferId],
      reallocExtents: [newCreatorExtents, newWinnerExtents],
    });
  };

  const canReallocate = (offerIds, _offerIdsToOfferDescs) => {
    const numBids = 3;
    return offerIds.length >= numBids + 1;
  };
  const offerIdsToOfferDescs = new WeakMap();
  const offerIds = [];

  return harden({
    makeOffer: async escrowReceipt => {
      const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );

      const status = makePromise();

      // Eject if the offer is invalid
      if (
        !isValidOffer(
          zoe.getExtentOps(),
          offerIds,
          offerIdsToOfferDescs,
          offerMadeDesc,
        )
      ) {
        zoe.complete(harden([id]));
        status.rej('The offer was invalid. Please check your refund.');
        return status.p;
      }

      // Save the offer.
      offerIdsToOfferDescs.set(id, offerMadeDesc);
      offerIds.push(id);

      // Check if we can reallocate and reallocate.
      if (canReallocate(offerIds, offerIdsToOfferDescs)) {
        const { reallocOfferIds, reallocExtents } = reallocate(
          zoe.getExtentOps(),
          offerIds,
          offerIdsToOfferDescs,
          zoe.getExtentsFor,
        );
        zoe.reallocate(reallocOfferIds, reallocExtents);
        zoe.complete(offerIds);
      }

      status.res(
        'The offer has been accepted. Once the contract has been completed, please check your winnings',
      );
      return status.p;
    },
  });
});

const publicAuctionSrcs = harden({
  makeContract: `${makeContract}`,
});

export { publicAuctionSrcs };
