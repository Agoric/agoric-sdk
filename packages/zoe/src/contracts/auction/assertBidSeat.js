import { assert, details } from '@agoric/assert';
import { M } from '@agoric/ertp';

export const assertBidSeat = (zcf, sellSeat, bidSeat) => {
  const minBid = sellSeat.getProposal().want.Ask;
  const bid = bidSeat.getAmountAllocated('Bid', minBid.brand);
  assert(
    M.isGTE(bid, minBid),
    details`bid ${bid} is under the minimum bid ${minBid}`,
  );
  const assetAtAuction = sellSeat.getProposal().give.Asset;
  const assetWanted = bidSeat.getAmountAllocated('Asset', assetAtAuction.brand);
  assert(
    M.isGTE(assetAtAuction, assetWanted),
    details`more assets were wanted ${assetWanted} than were available ${assetAtAuction}`,
  );
};
