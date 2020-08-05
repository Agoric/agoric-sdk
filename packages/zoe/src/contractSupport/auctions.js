export const secondPriceLogic = (bidAmountMath, bidSeats) => {
  let highestBid = bidAmountMath.getEmpty();
  let secondHighestBid = bidAmountMath.getEmpty();
  let highestBidSeat;

  bidSeats.forEach(bidSeat => {
    const bid = bidSeat.getAmountAllocated('Bid', highestBid.brand);
    // If the bid is greater than the highestBid, it's the new highestBid
    if (bidAmountMath.isGTE(bid, highestBid)) {
      secondHighestBid = highestBid;
      highestBid = bid;
      highestBidSeat = bidSeat;
    } else if (bidAmountMath.isGTE(bid, secondHighestBid)) {
      // If the bid is not greater than the highest bid, but is greater
      // than the second highest bid, it is the new second highest bid.
      secondHighestBid = bid;
    }
  });
  return harden({
    winnerSeat: highestBidSeat,
    winnerBid: highestBid,
    price: secondHighestBid,
  });
};

export const closeAuction = (zcf, auctionLogicFn, sellSeat, bidSeats) => {
  const {
    want: { Ask: minBid },
    give: { Asset: assetAmount },
  } = sellSeat.getProposal();
  const bidAmountMath = zcf.getAmountMath(minBid.brand);
  const assetAmountMath = zcf.getAmountMath(assetAmount.brand);

  const { winnerSeat, winnerBid, price } = auctionLogicFn(
    bidAmountMath,
    bidSeats,
  );

  // The winner gets to keep the difference between their bid and the
  // price paid.
  const winnerRefund = bidAmountMath.subtract(winnerBid, price);

  // Everyone else gets a refund so their values remain the
  // same.
  zcf.reallocate(
    sellSeat.stage({ Asset: assetAmountMath.getEmpty(), Ask: price }),
    winnerSeat.stage({ Asset: assetAmount, Bid: winnerRefund }),
  );
  sellSeat.exit();
  bidSeats.forEach(bidSeat => bidSeat.exit());
};
