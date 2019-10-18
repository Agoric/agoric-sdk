import harden from '@agoric/harden';

export const makeContract = harden((zoe, numBidsAllowed = 3) => {
  let creatorOfferId;
  const bidIds = [];

  let bidExtentOps;
  let itemExtentOps;
  let itemExtentUpForAuction;

  // This contract expects the item(s) up for auction to be first in
  // the offerDesc array
  const ITEM_INDEX = 0;
  const BID_INDEX = 1;

  const isValidCreatorOfferDesc = newOfferDesc =>
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

  const isValidBidOfferDesc = (creatorOfferDesc, newOfferDesc) =>
    canAcceptBid &&
    hasOkRulesForBid(newOfferDesc) &&
    bidExtentOps.includes(
      getBidExtent(newOfferDesc),
      getBidExtent(creatorOfferDesc),
    );

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

  const reallocate = () => {
    let bids;
    try {
      bids = zoe.getExtentsFor(bidIds).map(extents => extents[BID_INDEX]);
    } catch (err) {
      throw new Error(`Some of the bids were cancelled`);
    }
    const { winnerOfferId, winnerBid, price } = findWinnerAndPrice(
      bidIds,
      bids,
    );

    // The winner gets to keep the difference between their bid and the
    // price paid.
    const winnerRefund = bidExtentOps.without(winnerBid, price);

    const newCreatorExtents = [itemExtentOps.empty(), price];
    const newWinnerExtents = [itemExtentUpForAuction, winnerRefund];

    // Everyone else gets a refund so their extents remain the
    // same.
    zoe.reallocate(
      harden([creatorOfferId, winnerOfferId]),
      harden([newCreatorExtents, newWinnerExtents]),
    );
    const allOfferIds = harden([creatorOfferId, ...bidIds]);
    zoe.complete(allOfferIds);
  };

  return harden({
    makeOffer: async escrowReceipt => {
      const { id, conditions } = await zoe.burnEscrowReceipt(escrowReceipt);
      const { offerDesc: offerMadeDesc } = conditions;

      const offerAcceptedMessage = `The offer has been accepted. Once the contract has been completed, please check your winnings`;

      if (isValidCreatorOfferDesc(offerMadeDesc)) {
        // save the valid offer
        creatorOfferId = id;
        [itemExtentOps, bidExtentOps] = zoe.getExtentOpsArray();
        itemExtentUpForAuction = offerMadeDesc[ITEM_INDEX].assetDesc.extent;
        return offerAcceptedMessage;
      }

      let creatorOfferDesc;

      try {
        [creatorOfferDesc] = zoe.getOfferDescsFor(harden([creatorOfferId]));
      } catch (err) {
        zoe.complete(harden([id]));
        return Promise.reject(
          new Error(`The item up for auction has been withdrawn`),
        );
      }

      if (isValidBidOfferDesc(creatorOfferDesc, offerMadeDesc)) {
        // save the valid offer
        bidIds.push(id);
        if (bidIds.length >= numBidsAllowed) {
          reallocate();
        }
        return offerAcceptedMessage;
      }

      // Eject because the offer must be invalid
      zoe.complete(harden([id]));
      return Promise.reject(
        new Error(`The offer was invalid. Please check your refund.`),
      );
    },
  });
});

const publicAuctionSrcs = harden({
  makeContract: `${makeContract}`,
});

export { publicAuctionSrcs };
