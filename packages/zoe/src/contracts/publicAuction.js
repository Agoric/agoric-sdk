// @ts-check

import Nat from '@agoric/nat';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  defaultAcceptanceMsg,
  assertIssuerKeywords,
  satisfies,
  secondPriceLogic,
  closeAuction,
  assertProposalShape,
} from '../contractSupport';

import '../../exported';

/**
 * An auction contract in which the seller offers an Asset for sale, and states
 * a minimum price. A pre-announced number of bidders compete to offer the best
 * price. When the appropriate number of bids have been received, the second
 * price rule is followed, so the highest bidder pays the amount bid by the
 * second highest bidder.
 *
 * startInstance() specifies the issuers and terms ({ numBidsAllowed }) specify
 * the number of bids required. An invitation for the seller is
 * returned as the creatorInvitation. The
 * seller's offer should look like
 * { give: { Asset: asset }, want: { Ask: minimumBidAmount } }
 * The asset can be non-fungible, but the Ask amount should be of a fungible
 * brand.
 * The bidder invitations can be made by calling makeBidInvitation on the creatorFacet. Each
 * bidder can submit an offer: { give: { Bid: null } want: { Asset: null } }.
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  const {
    maths: { Asset: assetMath, Ask: bidMath },
  } = zcf.getTerms();
  let { numBidsAllowed = 3 } = zcf.getTerms();
  numBidsAllowed = Nat(numBidsAllowed);

  let sellSeat;
  let minimumBid;
  let auctionedAssets;
  const bidSeats = [];

  // seller will use 'Asset' and 'Ask'. buyer will use 'Asset' and 'Bid'
  assertIssuerKeywords(zcf, harden(['Asset', 'Ask']));

  /** @type {OfferHandler} */
  const bid = bidSeat => {
    // Check that the item is still up for auction
    if (sellSeat.hasExited()) {
      const rejectMsg = `The item up for auction is not available or the auction has completed`;
      throw bidSeat.kickOut(rejectMsg);
    }
    if (bidSeats.length >= numBidsAllowed) {
      throw bidSeat.kickOut(`No further bids allowed.`);
    }
    const sellerSatisfied = satisfies(zcf, sellSeat, {
      Ask: bidSeat.getAmountAllocated('Bid', minimumBid.brand),
      Asset: assetMath.getEmpty(),
    });
    const bidderSatisfied = satisfies(zcf, bidSeat, {
      Asset: sellSeat.getAmountAllocated('Asset', auctionedAssets.brand),
      Bid: bidMath.getEmpty(),
    });
    if (!(sellerSatisfied && bidderSatisfied)) {
      const rejectMsg = `Bid was under minimum bid or for the wrong assets`;
      throw bidSeat.kickOut(rejectMsg);
    }

    // Save valid bid and try to close.
    bidSeats.push(bidSeat);
    if (bidSeats.length >= numBidsAllowed) {
      closeAuction(zcf, secondPriceLogic, sellSeat, bidSeats);
    }
    return defaultAcceptanceMsg;
  };

  const bidExpected = harden({
    give: { Bid: null },
    want: { Asset: null },
  });

  const makeBidInvitation = () =>
    zcf.makeInvitation(
      assertProposalShape(bid, bidExpected),
      'bid',
      harden({
        auctionedAssets,
        minimumBid,
        numBidsAllowed,
      }),
    );

  const sellExpected = harden({
    give: { Asset: null },
    want: { Ask: null },
  });

  const sell = seat => {
    // Save the valid seat for when the auction closes.
    sellSeat = seat;
    ({
      give: { Asset: auctionedAssets },
      want: { Ask: minimumBid },
    } = seat.getProposal());

    // The bid invitations can only be sent out after the assets to be
    // auctioned are escrowed.
    return harden({ makeBidInvitation });
  };

  const creatorInvitation = zcf.makeInvitation(
    assertProposalShape(sell, sellExpected),
    'sellAssets',
  );

  return harden({
    creatorInvitation,
  });
};

export { start };
