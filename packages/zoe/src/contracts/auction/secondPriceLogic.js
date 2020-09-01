export const calcWinnerAndClose = (zcf, sellSeat, bidSeats) => {
  const {
    give: { Asset: assetAmount },
    want: { Ask: minBid },
  } = sellSeat.getProposal();
  const bidMath = zcf.getAmountMath(minBid.brand);
  const assetMath = zcf.getAmountMath(assetAmount.brand);

  let highestBid = bidMath.getEmpty();
  let secondHighestBid = bidMath.getEmpty();
  let highestBidSeat = bidSeats[0];
  let activeBidsCount = 0;

  bidSeats.forEach(bidSeat => {
    if (!bidSeat.hasExited()) {
      activeBidsCount += 1;
      const bid = bidSeat.getAmountAllocated('Bid', highestBid.brand);
      // If the bid is greater than the highestBid, it's the new highestBid
      if (bidMath.isGTE(bid, highestBid)) {
        secondHighestBid = highestBid;
        highestBid = bid;
        highestBidSeat = bidSeat;
      } else if (bidMath.isGTE(bid, secondHighestBid)) {
        // If the bid is not greater than the highest bid, but is greater
        // than the second highest bid, it is the new second highest bid.
        secondHighestBid = bid;
      }
    }
  });

  if (activeBidsCount === 0) {
    throw sellSeat.kickOut(
      new Error(`Could not close auction. No bids were active`),
    );
  }

  if (activeBidsCount === 1) {
    secondHighestBid = highestBid;
  }

  const winnerRefund = bidMath.subtract(highestBid, secondHighestBid);

  // Everyone else gets a refund so their values remain the
  // same.
  zcf.reallocate(
    sellSeat.stage({
      Asset: assetMath.getEmpty(),
      Ask: secondHighestBid,
    }),
    highestBidSeat.stage({ Asset: assetAmount, Bid: winnerRefund }),
  );
  sellSeat.exit();
  bidSeats.forEach(bidSeat => {
    if (!bidSeat.hasExited()) {
      bidSeat.exit();
    }
  });
};
