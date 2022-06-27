// @ts-check

const { details: X } = assert;
import { AmountMath } from '@agoric/ertp';

export const assertBidSeat = (zcf, sellSeat, bidSeat) => {
  const minBid = sellSeat.getProposal().want.Ask;
  const bid = bidSeat.getAmountAllocated('Bid', minBid.brand);
  assert(
    AmountMath.isGTE(bid, minBid),
    X`bid ${bid} is under the minimum bid ${minBid}`,
  );
  const assetAtAuction = sellSeat.getProposal().give.Asset;
  const assetWanted = bidSeat.getAmountAllocated('Asset', assetAtAuction.brand);
  assert(
    AmountMath.isGTE(assetAtAuction, assetWanted),
    X`more assets were wanted ${assetWanted} than were available ${assetAtAuction}`,
  );
};
