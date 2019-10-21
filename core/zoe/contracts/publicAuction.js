import harden from '@agoric/harden';

export const makeContract = harden((zoe, terms) => {
  const numBidsAllowed = terms.numBidsAllowed || 3;

  let creatorOfferId;
  const allBidIds = [];

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
  const canAcceptBid = allBidIds.length < numBidsAllowed;

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
    const { active: activeBidIds } = zoe.getStatusFor(harden(allBidIds));
    const bids = zoe
      .getExtentsFor(activeBidIds)
      .map(extents => extents[BID_INDEX]);
    const { winnerOfferId, winnerBid, price } = findWinnerAndPrice(
      activeBidIds,
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
    const allOfferIds = harden([creatorOfferId, ...activeBidIds]);
    zoe.complete(allOfferIds);
  };

  const ejectPlayer = (offerId, message) => {
    zoe.complete(harden([offerId]));
    return Promise.reject(new Error(`${message}`));
  };

  const publicAuction = harden({
    makeOffer: async escrowReceipt => {
      const { id, conditions } = await zoe.burnEscrowReceipt(escrowReceipt);
      const { offerDesc: offerMadeDesc } = conditions;

      const offerAcceptedMessage = `The offer has been accepted. Once the contract has been completed, please check your winnings`;

      if (isValidCreatorOfferDesc(offerMadeDesc)) {
        creatorOfferId = id;
        [itemExtentOps, bidExtentOps] = zoe.getExtentOpsArray();
        itemExtentUpForAuction = offerMadeDesc[ITEM_INDEX].assetDesc.extent;
        return offerAcceptedMessage;
      }

      const { inactive } = zoe.getStatusFor(harden([creatorOfferId]));
      if (inactive.length > 0) {
        return ejectPlayer(id, 'The item up for auction has been withdrawn');
      }

      const [creatorOfferDesc] = zoe.getOfferDescsFor(harden([creatorOfferId]));
      if (isValidBidOfferDesc(creatorOfferDesc, offerMadeDesc)) {
        allBidIds.push(id);
        if (allBidIds.length >= numBidsAllowed) {
          reallocate();
        }
        return offerAcceptedMessage;
      }

      return ejectPlayer(`The offer was invalid. Please check your refund.`);
    },
  });

  return harden({
    instance: publicAuction,
    assays: terms.assays,
  });
});

const publicAuctionSrcs = harden({
  makeContract: `${makeContract}`,
});

export { publicAuctionSrcs };
