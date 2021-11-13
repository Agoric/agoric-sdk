// @ts-check

import { addAmounts, subtractAmounts } from './amountArrayMath';

// Deltas have already gone through input validation
/** @type {CalculateAllocations} */
const calculateAllocations = deltas => {
  return harden(
    deltas.map(({ account, add, subtract }) => {
      const currentAmounts = account.getCurrentAmounts();
      // TODO: consider the order of adding and subtracting
      const proposedAmounts = subtractAmounts(
        addAmounts(currentAmounts, add),
        subtract,
      );
      return {
        account,
        amounts: proposedAmounts,
      };
    }),
  );
};
harden(calculateAllocations);
export { calculateAllocations };
