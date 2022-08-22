// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

export const assertBidSeat = (zcf, sellSeat, bidSeat) => {
  const minBid = sellSeat.getProposal().want.Ask;
  const bid = bidSeat.getAmountAllocated('Bid', minBid.brand);
  if (!AmountMath.isGTE(bid, minBid)) {
    assert.fail(X`bid ${bid} is under the minimum bid ${minBid}`);
  }
  const assetAtAuction = sellSeat.getProposal().give.Asset;
  const assetWanted = bidSeat.getAmountAllocated('Asset', assetAtAuction.brand);
  if (!AmountMath.isGTE(assetAtAuction, assetWanted)) {
    assert.fail(
      X`more assets were wanted ${assetWanted} than were available ${assetAtAuction}`,
    );
  }
};
