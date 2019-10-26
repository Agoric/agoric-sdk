import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import {
  hasValidPayoutRules,
  getActivePayoutRules,
} from './helpers/payoutRules';
import {
  isMatchingLimitOrder,
  reallocateSurplusToSeller as reallocate,
} from './helpers/exchanges';

// This exchange only accepts limit orders. A limit order is defined
// as either a sell order: [ { kind: 'offerExactly', assetDesc1 }, {
// kind: 'wantAtLeast', assetDesc2 }] or a buy order: [ { kind:
// 'wantExactly', assetDesc1 }, { kind: 'offerAtMost', assetDesc2 }].
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
        offerRules: { payoutRules },
      } = await zoe.burnEscrowReceipt(escrowReceipt);

      // Is it a valid sell offer?
      const sellOfferKinds = ['offerExactly', 'wantAtLeast'];
      if (hasValidPayoutRules(sellOfferKinds, terms.assays, payoutRules)) {
        // Save the valid offer
        sellOfferHandles.push(offerHandle);

        // Try to match
        const {
          offerHandles: activeBuyHandles,
          payoutRulesArray: activeBuyDescs,
        } = getActivePayoutRules(zoe, buyOfferHandles);
        for (let i = 0; i < activeBuyHandles.length; i += 1) {
          if (isMatchingLimitOrder(zoe, payoutRules, activeBuyDescs[i])) {
            return reallocate(zoe, offerHandle, activeBuyHandles[i]);
          }
        }
        return defaultAcceptanceMsg;
      }

      // Is it a valid buy offer?
      const buyOfferFormat = ['wantExactly', 'offerAtMost'];
      if (hasValidPayoutRules(buyOfferFormat, terms.assays, payoutRules)) {
        buyOfferHandles.push(offerHandle);

        // Try to match
        const {
          offerHandles: activeSellHandles,
          payoutRulesArray: activeSellDescs,
        } = getActivePayoutRules(zoe, sellOfferHandles);
        for (let i = 0; i < activeSellHandles.length; i += 1) {
          if (isMatchingLimitOrder(zoe, activeSellDescs[i], payoutRules)) {
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
