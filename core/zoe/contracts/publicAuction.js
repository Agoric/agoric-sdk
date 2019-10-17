import harden from '@agoric/harden';

export const makeContract = harden(zoe => {
  let creatorOfferId;
  let creatorOfferDesc;
  const bidIds = [];

  let bidExtentOps;
  let itemExtentOps;
  let itemExtentUpForAuction;

  // This contract expects the item(s) up for auction to be first in
  // the offerDesc array
  const ITEM_INDEX = 0;
  const BID_INDEX = 1;

  // TODO: stop hard-coding this and allow installations to be parameterized
  const numBidsAllowed = 3;

  const findWinnerAndPrice = (bidOfferIds, bids) => {
    let highestBid = bidExtentOps.empty();
    let secondHighestBid = bidExtentOps.empty();
    let highestBidOfferId;
    // eslint-disable-next-line array-callback-return
    bidOfferIds.map((offerId, i) => {
      const bid = bids[i];
      // If the bid is greater than the highestBid, it's the new highestBid
      if (bidExtentOps.includes(bid, highestBid)) {
        secondHighestBid = highestBid;
        highestBid = bid;
        highestBidOfferId = offerId;
      } else if (bidExtentOps.includes(bid, secondHighestBid)) {
        // If the bid is not greater than the highest bid, but is greater
        // than the second highest bid, it is the new second highest bid.
        secondHighestBid = bid;
      }
    });
    return {
      winnerOfferId: highestBidOfferId,
      winnerBid: highestBid,
      price: secondHighestBid,
    };
  };

  return harden({
    makeOffer: async escrowReceipt => {
      const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );

      const isFirstOffer = creatorOfferId === undefined;

      const isValidFirstOfferDesc = newOfferDesc =>
        ['offerExactly', 'wantAtLeast'].every(
          (rule, i) => rule === newOfferDesc[i].rule,
          true,
        );

      const hasOkRulesForBid = newOfferDesc =>
        ['wantExactly', 'offerAtMost'].every(
          (rule, i) => rule === newOfferDesc[i].rule,
          true,
        );

      const getBidExtent = offerDesc => offerDesc[BID_INDEX].assetDesc.extent;
      const canAcceptBid = bidIds.length < numBidsAllowed;

      const isValidBid = newOfferDesc =>
        canAcceptBid &&
        hasOkRulesForBid(newOfferDesc) &&
        bidExtentOps.includes(
          getBidExtent(newOfferDesc),
          getBidExtent(creatorOfferDesc),
        );

      const isValidOffer =
        (isFirstOffer && isValidFirstOfferDesc(offerMadeDesc)) ||
        (!isFirstOffer && isValidBid(offerMadeDesc));

      // Eject if the offer is invalid
      if (!isValidOffer) {
        zoe.complete(harden([id]));
        return Promise.reject(
          new Error(`The offer was invalid. Please check your refund.`),
        );
      }

      // Save the valid offer
      if (creatorOfferId === undefined) {
        creatorOfferId = id;
        creatorOfferDesc = offerMadeDesc;
        [itemExtentOps, bidExtentOps] = zoe.getExtentOpsArray();
        itemExtentUpForAuction = offerMadeDesc[ITEM_INDEX].assetDesc.extent;
      } else {
        bidIds.push(id);
      }

      // Check if we can reallocate and reallocate.
      if (bidIds.length >= numBidsAllowed) {
        const bids = zoe
          .getExtentsFor(bidIds)
          .map(extents => extents[BID_INDEX]);
        const { winnerOfferId, winnerBid, price } = findWinnerAndPrice(
          bidIds,
          bids,
        );

        // The winner gets to keep the difference between their bid and the
        // price paid.
        const winnerRefund = bidExtentOps.without(winnerBid, price);

        const newCreatorExtents = [itemExtentOps.empty(), price];
        const newWinnerExtents = [itemExtentUpForAuction, winnerRefund];

        // Everyone else gets a refund so their extents remain the same.
        zoe.reallocate(
          harden([creatorOfferId, winnerOfferId]),
          harden([newCreatorExtents, newWinnerExtents]),
        );
        const allOfferIds = harden([creatorOfferId, ...bidIds]);
        zoe.complete(allOfferIds);
      }
      return `The offer has been accepted. Once the contract has been completed, please check your winnings`;
    },
  });
});

const publicAuctionSrcs = harden({
  makeContract: `${makeContract}`,
});

export { publicAuctionSrcs };

// eslint-disable-next-line spaced-comment
//# sourceURL=publicAuction.js
