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
  let secondHighestBid = emptyBid;
  let highestBidSeat = bidSeats[0];
  let activeBidsCount = 0n;

  for (const bidSeat of bidSeats) {
    if (!bidSeat.hasExited()) {
      activeBidsCount += 1n;
      const bid = bidSeat.getAmountAllocated('Bid', bidBrand);
      // If the bid is greater than the highestBid, it's the new highestBid
      if (AmountMath.isGTE(bid, highestBid, bidBrand)) {
        secondHighestBid = highestBid;
        highestBid = bid;
        highestBidSeat = bidSeat;
      } else if (AmountMath.isGTE(bid, secondHighestBid, bidBrand)) {
        // If the bid is not greater than the highest bid, but is greater
        // than the second highest bid, it is the new second highest bid.
        secondHighestBid = bid;
      }
    }
  }

  if (activeBidsCount === 0n) {
    throw sellSeat.fail(Error(`Could not close auction. No bids were active`));
  }

  if (activeBidsCount === 1n) {
    secondHighestBid = highestBid;
  }

  // Everyone else gets a refund so their values remain the same.
  zcf.atomicRearrange(
    harden([
      [
        highestBidSeat,
        sellSeat,
        { Bid: secondHighestBid },
        { Ask: secondHighestBid },
      ],
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
