// @ts-check

import { AmountMath } from '@agoric/ertp';

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
  const emptyBid = AmountMath.makeEmpty(bidBrand);

  let highestBid = emptyBid;
  let highestBidSeat = bidSeats[0];
  let activeBidsCount = 0n;

  bidSeats.forEach(bidSeat => {
    if (!bidSeat.hasExited()) {
      activeBidsCount += 1n;
      const bid = bidSeat.getAmountAllocated('Bid', bidBrand);
      // If the bid is greater than the highestBid, it's the new highestBid
      if (AmountMath.isGTE(bid, highestBid, bidBrand)) {
        highestBid = bid;
        highestBidSeat = bidSeat;
      }
    }
  });

  if (activeBidsCount === 0n) {
    throw sellSeat.fail(
      new Error(`Could not close auction. No bids were active`),
    );
  }

  // Everyone else gets a refund so their values remain the same.
  highestBidSeat.decrementBy({ Bid: highestBid });
  sellSeat.incrementBy({ Ask: highestBid });

  sellSeat.decrementBy({ Asset: assetAmount });
  highestBidSeat.incrementBy({ Asset: assetAmount });

  zcf.reallocate(sellSeat, highestBidSeat);
  sellSeat.exit();
  bidSeats.forEach(bidSeat => {
    if (!bidSeat.hasExited()) {
      bidSeat.exit();
    }
  });
  zcf.shutdown('Auction closed.');
};
