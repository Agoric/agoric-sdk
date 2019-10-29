import harden from '@agoric/harden';

import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import {
  isExactlyMatchingPayoutRules,
  makeExactlyMatchingPayoutRules,
  hasValidPayoutRules,
} from './helpers/offerRules';

export const makeContract = harden((zoe, terms) => {
  let firstOfferHandle;
  let firstPayoutRules;

  const matchOffer = async escrowReceipt => {
    const {
      offerHandle,
      offerRules: { payoutRules },
    } = await zoe.burnEscrowReceipt(escrowReceipt);
    const { inactive } = zoe.getStatusFor(harden([firstOfferHandle]));
    if (inactive.length > 0) {
      return rejectOffer(zoe, offerHandle, 'The first offer was withdrawn');
    }

    if (!isExactlyMatchingPayoutRules(zoe, firstPayoutRules, payoutRules)) {
      return rejectOffer(zoe, offerHandle);
    }

    const offerHandles = harden([firstOfferHandle, offerHandle]);
    const [firstOfferExtents, matchingOfferExtents] = zoe.getExtentsFor(
      offerHandles,
    );
    // reallocate by switching the extents of the firstOffer and matchingOffer
    zoe.reallocate(
      offerHandles,
      harden([matchingOfferExtents, firstOfferExtents]),
    );
    zoe.complete(offerHandles);
    return defaultAcceptanceMsg;
  };

  const coveredCall = harden({
    async makeFirstOffer(escrowReceipt) {
      const { offerHandle, offerRules } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );
      const { payoutRules } = offerRules;

      const ruleKinds = ['offerExactly', 'wantExactly'];
      if (!hasValidPayoutRules(ruleKinds, terms.assays, payoutRules)) {
        return rejectOffer(zoe, offerHandle);
      }

      // Save the valid offer
      firstOfferHandle = offerHandle;
      firstPayoutRules = payoutRules;

      const customInviteExtent = {
        offerMadeRules: offerRules,
        offerToBeMade: makeExactlyMatchingPayoutRules(payoutRules),
      };

      const inviteP = zoe.makeInvite(
        customInviteExtent,
        harden({ matchOffer }),
      );

      return harden({
        outcome: defaultAcceptanceMsg,
        invite: inviteP,
      });
    },
  });
  return harden({
    instance: coveredCall,
    assays: terms.assays,
  });
});
