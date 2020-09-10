// @ts-check

import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import { trade } from '../contractSupport';

import '../../exported';

/**
 * This OTC Desk contract does not assume that the underlying assets
 * have been escrowed. Rather, a reputation mechanism
 * is used to inform potential users of how often the quote is
 * accurate, and how often the trade fails.
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  const { zcfSeat: marketMakerSeat } = zcf.makeEmptySeatKit();

  let numTradesAttempted = 0;
  let numTradesDefected = 0;

  const makeQuote = (price, assets, timerAuthority, deadline) => {
    let quoteActive = true;
    E(timerAuthority).setWakeup(
      deadline,
      harden({ wake: () => (quoteActive = false) }),
    );
    const acceptQuote = seat => {
      assert(quoteActive, details`The quote was no longer active`);
      const { want: userWantActual, give: userGiveActual } = seat.getProposal();
      numTradesAttempted += 1;
      const hasInventory = Object.entries(assets).every(([keyword, amount]) => {
        const allocatedAmount = marketMakerSeat.getAmountAllocated(
          keyword,
          amount.brand,
        );
        return zcf.getAmountMath(amount.brand).isGTE(allocatedAmount, amount);
      });
      if (!hasInventory) {
        numTradesDefected += 1;
        throw Error(
          `The market maker did not have the inventory they promised. Their rating has been adjusted accordingly`,
        );
      }

      // If this trade does not conserve rights, it will throw an
      // error and the user will get their funds back.
      try {
        trade(
          zcf,
          {
            seat: marketMakerSeat,
            gains: price,
            losses: assets,
          },
          { seat, gains: userWantActual, losses: userGiveActual },
        );
      } catch (err) {
        console.log('actual proposal: ', seat.getProposal());
        console.log('quote: ', {
          assets,
          price,
        });
        throw Error(
          'Your offer did not match the quote. See the console log for more details.',
        );
      }
      seat.exit();
      return 'Trade successful';
    };

    const customProperties = harden({
      underlyingAssets: assets,
      strikePrice: price,
      byTimerAuthority: timerAuthority,
      beforeOrAtDeadline: deadline,
    });

    const acceptQuoteInvitation = zcf.makeInvitation(
      acceptQuote,
      'acceptQuote',
      customProperties,
    );
    return acceptQuoteInvitation;
  };

  const addInventory = seat => {
    // Take everything in this seat and add it to the marketMakerSeat
    trade(
      zcf,
      { seat: marketMakerSeat, gains: seat.getCurrentAllocation() },
      { seat, gains: {} },
    );
    seat.exit();
    return 'Inventory added';
  };

  const removeInventory = seat => {
    const { want } = seat.getProposal();
    trade(zcf, { seat: marketMakerSeat, gains: {} }, { seat, gains: want });
    seat.exit();
    return 'Inventory removed';
  };

  const creatorFacet = {
    // The inventory can be added in bulk before any quotes are made
    // or can be added immediately before a quote.
    makeAddInventoryInvitation: async (issuerKeywordRecord = undefined) => {
      const { issuers } = zcf.getTerms();
      const issuersPSaved = Object.entries(issuerKeywordRecord).map(
        ([keyword, issuer]) => {
          // If the keyword does not yet exist, add it and the
          // associated issuer.
          if (issuers.keyword === undefined) {
            return zcf.saveIssuer(issuer, keyword);
          }
          return undefined;
        },
      );
      await Promise.all(issuersPSaved);
      return zcf.makeInvitation(addInventory, 'addInventory');
    },
    makeRemoveInventoryInvitation: () =>
      zcf.makeInvitation(removeInventory, 'removeInventory'),
    makeQuote,
  };

  const publicFacet = {
    getRating: () =>
      numTradesAttempted > 0
        ? `${Math.floor(
            ((numTradesAttempted - numTradesDefected) / numTradesAttempted) *
              100,
          )}%`
        : 'No trades have occurred',
  };

  return harden({ creatorFacet, publicFacet });
};

export { start };
