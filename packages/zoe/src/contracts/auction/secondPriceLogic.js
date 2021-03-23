// @ts-check

import { amountMath } from '@agoric/ertp';

/**
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} sellSeat
 * @param {Array<ZCFSeat>} bidSeats
 */
export const calcWinnerAndClose = (zcf, sellSeat, bidSeats) => {
  const {
    give: { Asset: assetAmount },
    want: { Ask: minBid },
  } = sellSeat.getProposal();

  const bidBrand = minBid.brand;
  const emptyBid = amountMath.makeEmpty(bidBrand);

  let highestBid = emptyBid;
  let secondHighestBid = emptyBid;
  let highestBidSeat = bidSeats[0];
  let activeBidsCount = 0n;

  bidSeats.forEach(bidSeat => {
    if (!bidSeat.hasExited()) {
      activeBidsCount += 1n;
      const bid = bidSeat.getAmountAllocated('Bid', bidBrand);
      // If the bid is greater than the highestBid, it's the new highestBid
      if (amountMath.isGTE(bid, highestBid, bidBrand)) {
        secondHighestBid = highestBid;
        highestBid = bid;
        highestBidSeat = bidSeat;
      } else if (amountMath.isGTE(bid, secondHighestBid, bidBrand)) {
        // If the bid is not greater than the highest bid, but is greater
        // than the second highest bid, it is the new second highest bid.
        secondHighestBid = bid;
      }
    }
  });

  if (activeBidsCount === 0n) {
    throw sellSeat.fail(
      new Error(`Could not close auction. No bids were active`),
    );
  }

  if (activeBidsCount === 1n) {
    secondHighestBid = highestBid;
  }

  const winnerRefund = amountMath.subtract(
    highestBid,
    secondHighestBid,
    bidBrand,
  );

  // Everyone else gets a refund so their values remain the
  // same.
  zcf.reallocate(
    sellSeat.stage({
      Asset: amountMath.makeEmptyFromAmount(assetAmount),
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
  zcf.shutdown('Auction closed.');
};
