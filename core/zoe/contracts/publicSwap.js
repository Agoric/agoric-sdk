import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import {
  isExactlyMatchingPayoutRules,
  hasValidPayoutRules,
} from './helpers/payoutRules';

export const makeContract = harden((zoe, terms) => {
  let firstOfferHandle;
  let firstPayoutRules;

  const publicSwap = harden({
    makeFirstOffer: async escrowReceipt => {
      const {
        offerHandle,
        offerRules: { payoutRules },
      } = await zoe.burnEscrowReceipt(escrowReceipt);

      const ruleKinds = ['offerExactly', 'wantExactly'];
      if (!hasValidPayoutRules(ruleKinds, terms.assays, payoutRules)) {
        return rejectOffer(zoe, offerHandle);
      }

      // The offer is valid, so save information about the first offer
      firstOfferHandle = offerHandle;
      firstPayoutRules = payoutRules;
      return defaultAcceptanceMsg;
    },
    getFirstPayoutRules: () => firstPayoutRules,
    matchOffer: async escrowReceipt => {
      const {
        offerHandle: matchingOfferHandle,
        offerRules: { payoutRules },
      } = await zoe.burnEscrowReceipt(escrowReceipt);

      if (!firstOfferHandle) {
        return rejectOffer(zoe, matchingOfferHandle, `no offer to match`);
      }

      const { inactive } = zoe.getStatusFor(harden([firstOfferHandle]));
      if (inactive.length > 0) {
        return rejectOffer(
          zoe,
          matchingOfferHandle,
          `The first offer was withdrawn or completed.`,
        );
      }

      if (!isExactlyMatchingPayoutRules(zoe, firstPayoutRules, payoutRules)) {
        return rejectOffer(zoe, matchingOfferHandle);
      }
      const [firstOfferExtents, matchingOfferExtents] = zoe.getExtentsFor(
        harden([firstOfferHandle, matchingOfferHandle]),
      );
      // reallocate by switching the extents of the firstOffer and matchingOffer
      zoe.reallocate(
        harden([firstOfferHandle, matchingOfferHandle]),
        harden([matchingOfferExtents, firstOfferExtents]),
      );
      zoe.complete(harden([firstOfferHandle, matchingOfferHandle]));
      return defaultAcceptanceMsg;
    },
  });
  return harden({
    instance: publicSwap,
    assays: terms.assays,
  });
});
