import { Fail } from '@endo/errors';
import { AmountMath } from '@agoric/ertp';

export const assertBidSeat = (zcf, sellSeat, bidSeat) => {
  const minBid = sellSeat.getProposal().want.Ask;
  const bid = bidSeat.getAmountAllocated('Bid', minBid.brand);
  AmountMath.isGTE(bid, minBid) ||
    Fail`bid ${bid} is under the minimum bid ${minBid}`;
  const assetAtAuction = sellSeat.getProposal().give.Asset;
  const assetWanted = bidSeat.getAmountAllocated('Asset', assetAtAuction.brand);
  AmountMath.isGTE(assetAtAuction, assetWanted) ||
    Fail`more assets were wanted ${assetWanted} than were available ${assetAtAuction}`;
};
