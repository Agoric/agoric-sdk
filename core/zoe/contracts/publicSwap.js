import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import {
  isExactlyMatchingOfferDesc,
  hasRulesAndAssays,
} from './helpers/offerDesc';

export const makeContract = harden((zoe, terms) => {
  let firstOfferHandle;
  let firstOfferDesc;

  const publicSwap = harden({
    makeFirstOffer: async escrowReceipt => {
      const {
        offerHandle,
        offerConditions: { offerDesc: offerMadeDesc },
      } = await zoe.burnEscrowReceipt(escrowReceipt);

      const rulesFormat = ['offerExactly', 'wantExactly'];
      if (!hasRulesAndAssays(rulesFormat, terms.assays, offerMadeDesc)) {
        return rejectOffer(zoe, offerHandle);
      }

      // The offer is valid, so save information about the first offer
      firstOfferHandle = offerHandle;
      firstOfferDesc = offerMadeDesc;
      return defaultAcceptanceMsg;
    },
    getFirstOfferDesc: () => firstOfferDesc,
    matchOffer: async escrowReceipt => {
      const {
        offerHandle: matchingOfferHandle,
        offerConditions: { offerDesc: offerMadeDesc },
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

      if (!isExactlyMatchingOfferDesc(zoe, firstOfferDesc, offerMadeDesc)) {
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
