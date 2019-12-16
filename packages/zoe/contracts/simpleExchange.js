import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import {
  hasValidPayoutRules,
  getActivePayoutRules,
} from './helpers/offerRules';
import {
  isMatchingLimitOrder,
  reallocateSurplusToSeller as reallocate,
} from './helpers/exchanges';

// This exchange only accepts limit orders. A limit order is defined
// as either a sell order with payoutRules: [ { kind: 'offerExactly',
// units1 }, {kind: 'wantAtLeast', units2 }] or a buy order:
// [ { kind: 'wantExactly', units1 }, { kind: 'offerAtMost',
// units2 }]. Note that the asset in the first slot of the
// payoutRules will always be bought or sold in exact amounts, whereas
// the amount of the second asset received in a sell order may be
// greater than expected, and the amount of the second asset paid in a
// buy order may be less than expected. This simple exchange does not
// support partial fills of orders.

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
          payoutRulesArray: activeBuyPayoutRules,
        } = getActivePayoutRules(zoe, buyOfferHandles);
        for (let i = 0; i < activeBuyHandles.length; i += 1) {
          if (isMatchingLimitOrder(zoe, payoutRules, activeBuyPayoutRules[i])) {
            return reallocate(zoe, offerHandle, activeBuyHandles[i]);
          }
        }
        return defaultAcceptanceMsg;
      }

      // Is it a valid buy offer?
      const buyOfferFormat = ['wantExactly', 'offerAtMost'];
      if (hasValidPayoutRules(buyOfferFormat, terms.assays, payoutRules)) {
        // Save the valid offer
        buyOfferHandles.push(offerHandle);

        // Try to match
        const {
          offerHandles: activeSellHandles,
          payoutRulesArray: activeSellPayoutRules,
        } = getActivePayoutRules(zoe, sellOfferHandles);
        for (let i = 0; i < activeSellHandles.length; i += 1) {
          if (
            isMatchingLimitOrder(zoe, activeSellPayoutRules[i], payoutRules)
          ) {
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
