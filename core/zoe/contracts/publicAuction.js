import harden from '@agoric/harden';

export const makeContract = harden((zoe, terms) => {
  const numBidsAllowed = terms.numBidsAllowed || 3;

  let creatorOfferHandle;
  const allBidHandles = [];

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
  const canAcceptBid = allBidHandles.length < numBidsAllowed;

  const isValidBidOfferDesc = (creatorOfferDesc, newOfferDesc) =>
    canAcceptBid &&
    hasOkRulesForBid(newOfferDesc) &&
    bidExtentOps.includes(
      getBidExtent(newOfferDesc),
      getBidExtent(creatorOfferDesc),
    );

  const findWinnerAndPrice = (bidOfferHandles, bids) => {
    let highestBid = bidExtentOps.empty();
    let secondHighestBid = bidExtentOps.empty();
    let highestBidOfferHandle;
    // eslint-disable-next-line array-callback-return
    bidOfferHandles.map((offerHandle, i) => {
      const bid = bids[i];
      // If the bid is greater than the highestBid, it's the new highestBid
      if (bidExtentOps.includes(bid, highestBid)) {
        secondHighestBid = highestBid;
        highestBid = bid;
        highestBidOfferHandle = offerHandle;
      } else if (bidExtentOps.includes(bid, secondHighestBid)) {
        // If the bid is not greater than the highest bid, but is greater
        // than the second highest bid, it is the new second highest bid.
        secondHighestBid = bid;
      }
    });
    return {
      winnerOfferHandle: highestBidOfferHandle,
      winnerBid: highestBid,
      price: secondHighestBid,
    };
  };

  const reallocate = () => {
    const { active: activeBidHandles } = zoe.getStatusFor(
      harden(allBidHandles),
    );
    const bids = zoe
      .getExtentsFor(activeBidHandles)
      .map(extents => extents[BID_INDEX]);
    const { winnerOfferHandle, winnerBid, price } = findWinnerAndPrice(
      activeBidHandles,
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
      harden([creatorOfferHandle, winnerOfferHandle]),
      harden([newCreatorExtents, newWinnerExtents]),
    );
    const allOfferHandles = harden([creatorOfferHandle, ...activeBidHandles]);
    zoe.complete(allOfferHandles);
  };

  const ejectPlayer = (offerHandle, message) => {
    zoe.complete(harden([offerHandle]));
    return Promise.reject(new Error(`${message}`));
  };

  const publicAuction = harden({
    makeOffer: async escrowReceipt => {
      const { offerHandle, conditions } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );
      const { offerDesc: offerMadeDesc } = conditions;

      const offerAcceptedMessage = `The offer has been accepted. Once the contract has been completed, please check your winnings`;

      if (isValidCreatorOfferDesc(offerMadeDesc)) {
        creatorOfferHandle = offerHandle;
        [itemExtentOps, bidExtentOps] = zoe.getExtentOpsArray();
        itemExtentUpForAuction = offerMadeDesc[ITEM_INDEX].assetDesc.extent;
        return offerAcceptedMessage;
      }

      const { inactive } = zoe.getStatusFor(harden([creatorOfferHandle]));
      if (inactive.length > 0) {
        return ejectPlayer(
          offerHandle,
          'The item up for auction has been withdrawn',
        );
      }

      const [creatorOfferDesc] = zoe.getOfferDescsFor(
        harden([creatorOfferHandle]),
      );
      if (isValidBidOfferDesc(creatorOfferDesc, offerMadeDesc)) {
        allBidHandles.push(offerHandle);
        if (allBidHandles.length >= numBidsAllowed) {
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
