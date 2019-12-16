import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import {
  hasValidPayoutRules,
  getActiveOffers,
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
        const activeBuyOffers = getActiveOffers(zoe, buyOfferHandles);
        for (const buyOffer of activeBuyOffers) {
          if (isMatchingLimitOrder(zoe, payoutRules, butOffer.payoutRules)) {
            return reallocate(zoe, offerHandle, activeBuyOffer.handle);
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
        const activeSellOffers = getActiveOffers(zoe, sellOfferHandles);
        for (const sellOffer of activeSellOffers) {
          if (isMatchingLimitOrder(zoe, sellOffer.payoutRules, payoutRules)) {
            reallocate(zoe, sellOffer.handle, offerHandle);
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
