// @ts-check

import makeStore from '@agoric/store';
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

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
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  // bookOrders is a Map of Maps. The first key is the brand of the offer's
  // GIVE, and the second key is the brand of its WANT. For each offer, we
  // store its handle and the amounts for `give` and `want`.
  const bookOrders = makeStore('bookOrders');

  const { satisfies, trade } = makeZoeHelpers(zcf);

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
        satisfies(newDetails.offerHandle, { Out: order.amountIn }) &&
        satisfies(order.offerHandle, { Out: newDetails.amountIn })
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
        {
          offerHandle: matchingTrade.offerHandle,
          gains: {
            Out: matchingTrade.amountOut,
          },
          losses: {
            In: offerDetails.amountOut,
          },
        },
        {
          offerHandle: offerDetails.offerHandle,
          gains: {
            Out: offerDetails.amountOut,
          },
          losses: {
            In: matchingTrade.amountOut,
          },
        },
      );
      removeFromOrders(matchingTrade);
      zcf.complete([offerDetails.offerHandle, matchingTrade.offerHandle]);

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

  function extractOfferDetails(offerHandle) {
    const {
      give: { In: amountIn },
      want: { Out: amountOut },
    } = zcf.getOffer(offerHandle).proposal;

    return {
      offerHandle,
      amountIn,
      amountOut,
    };
  }
  const exchangeOfferHook = offerHandle => {
    const offerDetails = extractOfferDetails(offerHandle);

    if (!tradeWithMatchingOffer(offerDetails)) {
      addToBook(offerDetails);
    }

    return defaultAcceptanceMsg;
  };

  const makeExchangeInvite = () =>
    zcf.makeInvitation(exchangeOfferHook, 'exchange');

  zcf.initPublicAPI(harden({ makeInvite: makeExchangeInvite }));

  return makeExchangeInvite();
};

harden(makeContract);
export { makeContract };
