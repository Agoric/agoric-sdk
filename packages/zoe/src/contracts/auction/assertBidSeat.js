import { assert, details } from '@agoric/assert';

export const assertBidSeat = (zcf, sellSeat, bidSeat) => {
  const {
    maths: { Ask: bidMath, Asset: assetMath },
  } = zcf.getTerms();
  const minBid = sellSeat.getProposal().want.Ask;
  const bid = bidSeat.getAmountAllocated('Bid', minBid.brand);
  assert(
    bidMath.isGTE(bid, minBid),
    details`bid ${bid} is under the minimum bid ${minBid}`,
  );
  const assetAtAuction = sellSeat.getProposal().give.Asset;
  const assetWanted = bidSeat.getAmountAllocated('Asset', assetAtAuction.brand);
  assert(
    assetMath.isGTE(assetAtAuction, assetWanted),
    details`more assets were wanted ${assetWanted} than were available ${assetAtAuction}`,
  );
};
