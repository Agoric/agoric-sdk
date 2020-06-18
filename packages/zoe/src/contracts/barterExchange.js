// @ts-check

import harden from '@agoric/harden';
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

/**
 * The Barter Exchange only accepts offers that look like
 * { give: { In: amount }, want: { Out: amount} }
 *
 * The want and give amounts are both treated as minimums. Each successful
 * trader gets their `want` and may trade with counter-parties who specify any
 * amount up to their specified `give`.
 */
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    // bookOrders is a Map of Maps. The first key is the brand of the offer's
    // GIVE, and the second key is the brand of their WANT. For each offer, we
    // store the handle and the amounts for `give` and `want`.
    const bookOrders = new Map();

    const { canTradeWithMapKeywords } = makeZoeHelpers(zcf);

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
        return canTradeWithMapKeywords(
          newDetails.offerHandle,
          order.offerHandle,
          [
            ['In', 'Out'],
            ['Out', 'In'],
          ],
        );
      });
    }

    function crossMatchAmounts(leftDetails, rightDetails) {
      const amountMathLeftIn = zcf.getAmountMath(leftDetails.amountIn.brand);
      const amountMathLeftOut = zcf.getAmountMath(leftDetails.amountOut.brand);
      const newLeftAmountsRecord = {
        Out: leftDetails.amountOut,
        In: amountMathLeftIn.subtract(
          leftDetails.amountIn,
          rightDetails.amountOut,
        ),
      };
      const newRightAmountsRecord = {
        Out: rightDetails.amountOut,
        In: amountMathLeftOut.subtract(
          rightDetails.amountIn,
          leftDetails.amountOut,
        ),
      };
      return [newLeftAmountsRecord, newRightAmountsRecord];
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
        // reallocate by switching the amounts
        const amounts = crossMatchAmounts(offerDetails, matchingTrade);
        const handles = [offerDetails.offerHandle, matchingTrade.offerHandle];
        zcf.reallocate(handles, amounts);
        removeFromOrders(matchingTrade);
        zcf.complete(handles);

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
  },
);
