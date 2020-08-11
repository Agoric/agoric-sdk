// @ts-check

import makeStore from '@agoric/store';
import '../../exported';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { trade, satisfies } from '../contractSupport';

/**
 * This Barter Exchange accepts offers to trade arbitrary goods for other
 * things. It doesn't require registration of Issuers. If two offers satisfy
 * each other, it exchanges the specified amounts in each side's want clause.
 *
 * The Barter Exchange only accepts offers that look like
 * { give: { In: amount }, want: { Out: amount} }
 * The want amount will be matched, while the give amount is a maximum. Each
 * successful trader gets their `want` and may trade with counter-parties who
 * specify any amount up to their specified `give`.
 *
 * @type {ContractStartFn}
 */
const start = (zcf, _terms) => {
  // bookOrders is a Map of Maps. The first key is the brand of the offer's
  // GIVE, and the second key is the brand of its WANT. For each offer, we
  // store its handle and the amounts for `give` and `want`.
  const bookOrders = makeStore('bookOrders');

  function lookupBookOrders(brandIn, brandOut) {
    if (!bookOrders.has(brandIn)) {
      bookOrders.init(brandIn, new Map());
    }
    const ordersMap = bookOrders.get(brandIn);
    let ordersArray = ordersMap.get(brandOut);
    if (!ordersArray) {
      ordersArray = [];
      ordersMap.set(brandOut, ordersArray);
    }
    return ordersArray;
  }

  function findMatchingTrade(newDetails, orders) {
    return orders.find(order => {
      return (
        satisfies(zcf, newDetails.offerSeat, { Out: order.amountIn }) &&
        satisfies(zcf, order.offerSeat, { Out: newDetails.amountIn })
      );
    });
  }

  function removeFromOrders(offerDetails) {
    const orders = lookupBookOrders(
      offerDetails.amountIn.brand,
      offerDetails.amountOut.brand,
    );
    orders.splice(orders.indexOf(offerDetails), 1);
  }

  function tradeWithMatchingOffer(offerDetails) {
    const orders = lookupBookOrders(
      offerDetails.amountOut.brand,
      offerDetails.amountIn.brand,
    );
    const matchingTrade = findMatchingTrade(offerDetails, orders);
    if (matchingTrade) {
      // reallocate by giving each side what it wants
      trade(
        zcf,
        {
          seat: matchingTrade.offerSeat,
          gains: {
            Out: matchingTrade.amountOut,
          },
          losses: {
            In: offerDetails.amountOut,
          },
        },
        {
          seat: offerDetails.offerSeat,
          gains: {
            Out: offerDetails.amountOut,
          },
          losses: {
            In: matchingTrade.amountOut,
          },
        },
      );
      removeFromOrders(matchingTrade);
      offerDetails.offerSeat.exit();
      matchingTrade.offerSeat.exit();

      return true;
    }
    return false;
  }

  function addToBook(offerDetails) {
    const orders = lookupBookOrders(
      offerDetails.amountIn.brand,
      offerDetails.amountOut.brand,
    );
    orders.push(offerDetails);
  }

  function extractOfferDetails(offerSeat) {
    const {
      give: { In: amountIn },
      want: { Out: amountOut },
    } = offerSeat.getProposal();

    return {
      offerSeat,
      amountIn,
      amountOut,
    };
  }

  /** @type {OfferHandler} */
  const exchangeOfferHandler = offerSeat => {
    const offerDetails = extractOfferDetails(offerSeat);

    if (!tradeWithMatchingOffer(offerDetails)) {
      addToBook(offerDetails);
    }

    return 'Trade completed.';
  };

  const makeExchangeInvitation = () =>
    zcf.makeInvitation(exchangeOfferHandler, 'exchange');

  const publicFacet = harden({ makeInvitation: makeExchangeInvitation });
  const creatorFacet = harden({
    makeInvitation: makeExchangeInvitation,
  });

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
