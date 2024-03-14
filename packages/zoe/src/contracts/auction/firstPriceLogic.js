import { AmountMath } from '@agoric/ertp';

/**
 * @param {ZCF} zcf
 * @param {ZCFSeat} sellSeat
 * @param {Array<ZCFSeat>} bidSeats
 */
export const calcWinnerAndClose = (zcf, sellSeat, bidSeats) => {
  const {
    give: { Asset: assetAmount },
    want: { Ask: minBid },
  } = sellSeat.getProposal();

  /** @type {Brand<'nat'>} */
  const bidBrand = minBid.brand;
  const emptyBid = AmountMath.makeEmpty(bidBrand);

  let highestBid = emptyBid;
  let highestBidSeat = bidSeats[0];
  let activeBidsCount = 0n;

  for (const bidSeat of bidSeats) {
    if (!bidSeat.hasExited()) {
      activeBidsCount += 1n;
      const bid = bidSeat.getAmountAllocated('Bid', bidBrand);
      // bidSeat is added in time order, in case of a tie, we privilege the earlier.
      // So the later bidder will need a strictly greater bid to win the auction.
      if (
        AmountMath.isGTE(bid, highestBid, bidBrand) &&
        !AmountMath.isEqual(bid, highestBid, bidBrand)
      ) {
        highestBid = bid;
        highestBidSeat = bidSeat;
      }
    }
  }

  if (activeBidsCount === 0n) {
    throw sellSeat.fail(Error(`Could not close auction. No bids were active`));
  }

  // Everyone else gets a refund so their values remain the same.
  zcf.atomicRearrange(
    harden([
      [highestBidSeat, sellSeat, { Bid: highestBid }, { Ask: highestBid }],
      [sellSeat, highestBidSeat, { Asset: assetAmount }],
    ]),
  );

  sellSeat.exit();
  for (const bidSeat of bidSeats) {
    if (!bidSeat.hasExited()) {
      bidSeat.exit();
    }
  }
  zcf.shutdown('Auction closed.');
};
