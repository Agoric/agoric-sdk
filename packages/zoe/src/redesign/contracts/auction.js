// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  defaultAcceptanceMsg,
  assertIssuerKeywords,
  assertProposalShape,
} from '../../contractSupport/index.js';
import { calcWinnerAndClose } from './secondPriceLogic.js';
import { assertBidSeat } from './assertBidSeat.js';

import '../../../exported.js';

const start = () => {
  const { timeAuthority, closesAfter } = zcf.getTerms();

  let sellSeat;
  const bidSeats = [];

  // seller will use 'Asset' and 'Ask'. buyer will use 'Asset' and 'Bid'
  assertIssuerKeywords(zcf, harden(['Asset', 'Ask']));

  E(timeAuthority)
    .setWakeup(
      closesAfter,
      Far('wakeObj', {
        wake: () => calcWinnerAndClose(zcf, sellSeat, bidSeats),
      }),
    )
    .catch(err => {
      console.error(
        `Could not schedule the close of the auction at the 'closesAfter' deadline ${closesAfter} using this timer ${timeAuthority}`,
      );
      console.error(err);
      throw err;
    });

  const makeBidInvitation = () => {
    /** @type {OfferHandler} */
    const performBid = seat => {
      assertProposalShape(seat, {
        give: { Bid: null },
        want: { Asset: null },
      });
      assertBidSeat(zcf, sellSeat, seat);
      bidSeats.push(seat);
      return defaultAcceptanceMsg;
    };

    const customProperties = harden({
      auctionedAssets: sellSeat.getProposal().give.Asset,
      minimumBid: sellSeat.getProposal().want.Ask,
      closesAfter,
      timeAuthority,
    });

    return zcf.makeInvitation(performBid, 'bid', customProperties);
  };

  const sell = escrowAccount => {
    sellSeat = E(escrowAccount).startTransfer(escrowAccount);

    // The bid invitations can only be sent out after the assets to be
    // auctioned are escrowed.
    return Far('offerResult', { makeBidInvitation });
  };

  const creatorInvitation = zcf.makeInvitation(sell, 'sellAssets');

  return harden({ creatorInvitation });
};

export { start };
