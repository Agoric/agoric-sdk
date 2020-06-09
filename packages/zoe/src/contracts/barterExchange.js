// @ts-check

import harden from '@agoric/harden';
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

/**
 * The Barter Exchange ignores the keywords in offers. It takes advantage of
 * Zoe facet parameters by only paying attention the issuers in proposals.
 *
 * The want and give amounts are both treated as minimums. Each successful
 * trader gets their `want` and may trade with counter-parties who specify any
 * amount up to their specified `give`.
 */
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    // bookOrders is a Map of Maps. The first key is the brand of each offer's
    // give, and the second key is the brand of their want.
    // for each offer, we store (see extractOfferDetails) the handle, as well as
    // keywords, brands, and amount for both `give` and `want`. The keywords are
    // only used to produce the payout.
    const bookOrders = new Map();

    const {
      extractOfferDetails,
      canTradeWithIgnoreKeywords,
      crossMatchAmounts,
    } = makeZoeHelpers(zcf);

    function lookupBookOrders(brandIn, brandOut) {
      let ordersMap = bookOrders.get(brandIn);
      if (!ordersMap) {
        ordersMap = new Map();
        bookOrders.set(brandIn, ordersMap);
      }
      let ordersArray = ordersMap.get(brandOut);
      if (!ordersArray) {
        ordersArray = [];
        ordersMap.set(brandOut, ordersArray);
      }
      return ordersArray;
    }

    function findMatchingTrade(newDetails, orders) {
      return orders.find(order => {
        return canTradeWithIgnoreKeywords(
          newDetails.offerHandle,
          order.offerHandle,
        );
      });
    }

    function removeFromOrders(offerDetails) {
      const orders = lookupBookOrders(
        offerDetails.brandIn,
        offerDetails.brandOut,
      );
      orders.splice(orders.indexOf(offerDetails), 1);
    }

    function tradeWithMatchingOffer(offerDetails) {
      const orders = lookupBookOrders(
        offerDetails.brandOut,
        offerDetails.brandIn,
      );
      const matchingTrade = findMatchingTrade(offerDetails, orders);
      if (matchingTrade) {
        // reallocate by switching the amount
        const amounts = crossMatchAmounts(offerDetails, matchingTrade);
        const handles = [offerDetails.offerHandle, matchingTrade.offerHandle];
        const keywords = [
          [offerDetails.keywordIn, offerDetails.keywordOut],
          [matchingTrade.keywordIn, matchingTrade.keywordOut],
        ];
        zcf.reallocate(handles, amounts, keywords);
        // swap(offerDetails.offerHandle, matchingTrade.offerHandle);
        removeFromOrders(matchingTrade);
        zcf.complete(handles);

        return true;
      }
      return false;
    }

    function addToBook(offerDetails) {
      const orders = lookupBookOrders(
        offerDetails.brandIn,
        offerDetails.brandOut,
      );
      orders.push(offerDetails);
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
  },
);
