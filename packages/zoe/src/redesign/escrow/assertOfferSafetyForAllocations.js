// @ts-check

import { isOfferSafe } from './offerSafety.js';

const { details: X } = assert;

// TODO: add types and move to offerSafety.js
const assertOfferSafetyForAllocations = allocations => {
  // Ensure that offer safety holds for each escrowAccount
  allocations.forEach(({ escrowAccount, amounts: proposedAmounts }) => {
    const initialAmounts = escrowAccount.getCurrentAmounts();
    const conditions = escrowAccount.getConditions();
    assert(
      isOfferSafe(initialAmounts, conditions.wantedAmounts, proposedAmounts),
      X`Offer safety was violated. Initial amounts: ${initialAmounts}. Wanted amounts: ${conditions.wantedAmounts}. Proposed amounts: ${proposedAmounts}`,
    );
  });
};
harden(assertOfferSafetyForAllocations);
export { assertOfferSafetyForAllocations };
