import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import { hasRulesAndAssays, getActiveOfferDescs } from './helpers/offerDesc';
import {
  isMatchingLimitOrder,
  reallocateSurplusToSeller as reallocate,
} from './helpers/exchanges';

// This exchange only accepts limit orders. A limit order is defined
// as either a sell order: [ { rule: 'offerExactly', assetDesc1 }, {
// rule: 'wantAtLeast', assetDesc2 }] or a buy order: [ { rule:
// 'wantExactly', assetDesc1 }, { rule: 'offerAtMost', assetDesc2 }].
// Note that the asset in the first slot of the offer description will
// always be bought or sold in exact amounts, whereas the amount of
// the second asset received in a sell order may be greater than
// expected, and the amount of the second asset paid in a buy order
// may be less than expected. This simple exchange does not support
// partial fills of orders.

export const makeContract = harden((zoe, terms) => {
  const sellOfferHandles = [];
  const buyOfferHandles = [];

  const simpleExchange = harden({
    addOrder: async escrowReceipt => {
      const {
        offerHandle,
        conditions: { offerDesc: offerMadeDesc },
      } = await zoe.burnEscrowReceipt(escrowReceipt);

      // Is it a valid sell offer?
      const sellOfferFormat = ['offerExactly', 'wantAtLeast'];
      if (hasRulesAndAssays(sellOfferFormat, terms.assays, offerMadeDesc)) {
        // Save the valid offer
        sellOfferHandles.push(offerHandle);

        // Try to match
        const {
          offerHandles: activeBuyHandles,
          offerDescs: activeBuyDescs,
        } = getActiveOfferDescs(zoe, buyOfferHandles);
        for (let i = 0; i < activeBuyHandles.length; i += 1) {
          if (isMatchingLimitOrder(zoe, offerMadeDesc, activeBuyDescs[i])) {
            return reallocate(zoe, offerHandle, activeBuyHandles[i]);
          }
        }
        return defaultAcceptanceMsg;
      }

      // Is it a valid buy offer?
      const buyOfferFormat = ['wantExactly', 'offerAtMost'];
      if (hasRulesAndAssays(buyOfferFormat, terms.assays, offerMadeDesc)) {
        buyOfferHandles.push(offerHandle);

        // Try to match
        const {
          offerHandles: activeSellHandles,
          offerDescs: activeSellDescs,
        } = getActiveOfferDescs(zoe, sellOfferHandles);
        for (let i = 0; i < activeSellHandles.length; i += 1) {
          if (isMatchingLimitOrder(zoe, activeSellDescs[i], offerMadeDesc)) {
            reallocate(zoe, activeSellHandles[i], offerHandle);
          }
        }
        return defaultAcceptanceMsg;
      }

      // Eject because the offer must be invalid
      return rejectOffer(zoe, offerHandle);
    },
  });

  return harden({
    instance: simpleExchange,
    assays: terms.assays,
  });
});
