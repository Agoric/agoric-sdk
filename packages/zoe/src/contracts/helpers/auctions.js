import harden from '@agoric/harden';

export const secondPriceLogic = (bidExtentOps, bidOfferHandles, bids) => {
  let highestBid = bidExtentOps.empty();
  let secondHighestBid = bidExtentOps.empty();
  let highestBidOfferHandle;
  // eslint-disable-next-line array-callback-return
  bidOfferHandles.map((offerHandle, i) => {
    const bid = bids[i];
    // If the bid is greater than the highestBid, it's the new highestBid
    if (bidExtentOps.isGTE(bid, highestBid)) {
      secondHighestBid = highestBid;
      highestBid = bid;
      highestBidOfferHandle = offerHandle;
    } else if (bidExtentOps.isGTE(bid, secondHighestBid)) {
      // If the bid is not greater than the highest bid, but is greater
      // than the second highest bid, it is the new second highest bid.
      secondHighestBid = bid;
    }
  });
  return harden({
    winnerOfferHandle: highestBidOfferHandle,
    winnerBid: highestBid,
    price: secondHighestBid,
  });
};

export const firstPriceLogic = (bidExtentOps, bidOfferHandles, bids) => {
  let highestBid = bidExtentOps.empty();
  let highestBidOfferHandle;
  // eslint-disable-next-line array-callback-return
  bidOfferHandles.map((offerHandle, i) => {
    const bid = bids[i];
    // If the bid is greater than the highestBid, it's the new highestBid
    if (bidExtentOps.isGTE(bid, highestBid)) {
      highestBid = bid;
      highestBidOfferHandle = offerHandle;
    }
  });
  return harden({
    winnerOfferHandle: highestBidOfferHandle,
    winnerBid: highestBid,
    price: highestBid,
  });
};

export const isOverMinimumBid = (
  zoe,
  issuers,
  bidIndex,
  creatorOfferHandle,
  bidOfferHandle,
) => {
  const { amount: creatorAmounts } = zoe.getOffer(creatorOfferHandle);
  const { amount: bidAmounts } = zoe.getOffer(bidOfferHandle);
  const bidAmountMath = zoe.getAmountMathForIssuers(issuers)[bidIndex];
  const minimumBid = creatorAmounts[bidIndex];
  const bidMade = bidAmounts[bidIndex];
  return bidAmountMath.isGTE(bidMade, minimumBid);
};

export const closeAuction = (
  zoe,
  issuers,
  { auctionLogicFn, itemIndex, bidIndex, sellerInviteHandle, allBidHandles },
) => {
  const amountMathArray = zoe.getAmountMathForIssuers(issuers);
  const bidAmountMath = amountMathArray[bidIndex];
  const itemAmountMath = amountMathArray[itemIndex];

  // Filter out any inactive bids
  const { active: activeBidHandles } = zoe.getOfferStatuses(
    harden(allBidHandles),
  );

  const getAmounts = offer => offer.amounts;
  const getBids = amount => amount[bidIndex];
  const bids = zoe
    .getOffers(activeBidHandles)
    .map(getAmounts)
    .map(getBids);
  const itemAmountsUpForAuction = zoe.getOffer(sellerInviteHandle).payoutRules[
    itemIndex
  ].amount;

  const {
    winnerOfferHandle: winnerInviteHandle,
    winnerBid,
    price,
  } = auctionLogicFn(bidAmountMath, activeBidHandles, bids);

  // The winner gets to keep the difference between their bid and the
  // price paid.
  const winnerRefund = bidAmountMath.subtract(winnerBid, price);

  const newCreatorAmounts = [itemAmountMath.empty(), price];
  const newWinnerAmounts = [itemAmountsUpForAuction, winnerRefund];

  // Everyone else gets a refund so their extents remain the
  // same.
  zoe.reallocate(
    harden([sellerInviteHandle, winnerInviteHandle]),
    harden([newCreatorAmounts, newWinnerAmounts]),
  );
  const allOfferHandles = harden([sellerInviteHandle, ...activeBidHandles]);
  zoe.complete(allOfferHandles, issuers);
};
