import harden from '@agoric/harden';

export const secondPriceLogic = (bidExtentOps, bidOfferHandles, bids) => {
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
    if (bidExtentOps.includes(bid, highestBid)) {
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
  BID_INDEX,
  creatorOfferHandle,
  bidOfferHandle,
) => {
  const [creatorExtents, bidExtents] = zoe.getExtentsFor(
    harden([creatorOfferHandle, bidOfferHandle]),
  );
  const bidExtentOps = zoe.getExtentOpsArray()[BID_INDEX];
  const minimumBid = creatorExtents[BID_INDEX];
  const bidMade = bidExtents[BID_INDEX];
  return bidExtentOps.includes(bidMade, minimumBid);
};

export const closeAuction = (
  zoe,
  { auctionLogicFn, itemIndex, bidIndex, creatorOfferHandle, allBidHandles },
) => {
  const extentOpsArray = zoe.getExtentOpsArray();
  const bidExtentOps = extentOpsArray[bidIndex];
  const itemExtentOps = extentOpsArray[itemIndex];

  // Filter out any inactive bids
  const { active: activeBidHandles } = zoe.getStatusFor(harden(allBidHandles));

  const bids = zoe
    .getExtentsFor(activeBidHandles)
    .map(extents => extents[bidIndex]);
  const itemExtentUpForAuction = zoe.getExtentsFor(
    harden([creatorOfferHandle]),
  )[0][itemIndex];

  const { winnerOfferHandle, winnerBid, price } = auctionLogicFn(
    bidExtentOps,
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
