// @ts-check

import { assert, details as X } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';

export const assertBidSeat = (zcf, sellSeat, bidSeat) => {
  const minBid = sellSeat.getProposal().want.Ask;
  const bid = bidSeat.getAmountAllocated('Bid', minBid.brand);
  assert(
    amountMath.isGTE(bid, minBid),
    X`bid ${bid} is under the minimum bid ${minBid}`,
  );
  const assetAtAuction = sellSeat.getProposal().give.Asset;
  const assetWanted = bidSeat.getAmountAllocated('Asset', assetAtAuction.brand);
  assert(
    amountMath.isGTE(assetAtAuction, assetWanted),
    X`more assets were wanted ${assetWanted} than were available ${assetAtAuction}`,
  );
};
