export const secondPriceLogic = (bidAmountMath, bidOfferHandles, bids) => {
  let highestBid = bidAmountMath.getEmpty();
  let secondHighestBid = bidAmountMath.getEmpty();
  let highestBidOfferHandle;
  // eslint-disable-next-line array-callback-return
  bidOfferHandles.map((offerHandle, i) => {
    const bid = bids[i];
    // If the bid is greater than the highestBid, it's the new highestBid
    if (bidAmountMath.isGTE(bid, highestBid)) {
      secondHighestBid = highestBid;
      highestBid = bid;
      highestBidOfferHandle = offerHandle;
    } else if (bidAmountMath.isGTE(bid, secondHighestBid)) {
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

export const closeAuction = (
  zcf,
  { auctionLogicFn, sellerOfferHandle, allBidHandles },
) => {
  const { brandKeywordRecord } = zcf.getInstanceRecord();
  const bidAmountMath = zcf.getAmountMath(brandKeywordRecord.Ask);
  const assetAmountMath = zcf.getAmountMath(brandKeywordRecord.Asset);

  // Filter out any inactive bids
  const { active: activeBidHandles } = zcf.getOfferStatuses(
    harden(allBidHandles),
  );

  const getBids = amountsKeywordRecord => amountsKeywordRecord.Bid;
  const bids = zcf.getCurrentAllocations(activeBidHandles).map(getBids);
  const assetAmount = zcf.getOffer(sellerOfferHandle).proposal.give.Asset;

  const { winnerOfferHandle, winnerBid, price } = auctionLogicFn(
    bidAmountMath,
    activeBidHandles,
    bids,
  );

  // The winner gets to keep the difference between their bid and the
  // price paid.
  const winnerRefund = bidAmountMath.subtract(winnerBid, price);

  const newSellerAmounts = { Asset: assetAmountMath.getEmpty(), Ask: price };
  const newWinnerAmounts = { Asset: assetAmount, Bid: winnerRefund };

  // Everyone else gets a refund so their values remain the
  // same.
  zcf.reallocate(
    harden([sellerOfferHandle, winnerOfferHandle]),
    harden([newSellerAmounts, newWinnerAmounts]),
  );
  const allOfferHandles = harden([sellerOfferHandle, ...activeBidHandles]);
  zcf.complete(allOfferHandles);
};
