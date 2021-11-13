// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { sumByBrand } from './rightsConservation.js';

/** @type {AddAmounts} */
const addAmounts = (leftAmounts, rightAmounts) => {
  return sumByBrand([...leftAmounts, ...rightAmounts]).values();
};
harden(addAmounts);

/** @type {SubtractAmounts} */
const subtractAmounts = (leftAmounts, rightAmounts) => {
  const leftSums = sumByBrand(leftAmounts);
  const rightSums = sumByBrand(rightAmounts);

  return rightSums.entries().map(([brand, amountToSubtract]) => {
    assert(
      leftSums.has(brand),
      X`${rightAmounts} could not be subtracted from ${leftAmounts} because the left did not have the brand ${brand}`,
    );
    const leftAmount = leftSums.get(brand);
    assert(
      AmountMath.isGTE(leftAmount, amountToSubtract),
      X`${rightAmounts} could not be subtracted from ${leftAmounts} because the amount to be subtracted ${amountToSubtract} was greater than the original amount ${leftAmount}`,
    );
    return AmountMath.subtract(leftAmount, amountToSubtract);
  });
};
harden(subtractAmounts);

export { addAmounts, subtractAmounts };
