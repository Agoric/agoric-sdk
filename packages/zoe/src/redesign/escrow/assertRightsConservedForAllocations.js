// @ts-check

import { assertRightsConserved } from './rightsConservation.js';

// TODO: type this and move to rightsConservation
const assertRightsConservedForAllocations = allocations => {
  const previousAmounts = allocations.flatMap(({ escrowAccount }) =>
    escrowAccount.getCurrentAmounts(),
  );
  const newAmounts = allocations.flatMap(({ amounts }) => amounts);
  assertRightsConserved(previousAmounts, newAmounts);
};
harden(assertRightsConservedForAllocations);
export { assertRightsConservedForAllocations };
