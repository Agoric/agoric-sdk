// @ts-check

import {
  floorDivideBy,
  floorMultiplyBy,
  invertRatio,
  multiplyRatios,
  ratiosSame,
} from '@agoric/zoe/src/contractSupport/ratio.js';

/**
 *
 * @param {Ratio} currentCompoundedInterest as coefficient
 * @param {Ratio} previousCompoundedInterest as coefficient
 * @returns {Ratio} additional compounding since the previous
 */
const calculateRelativeCompounding = (
  currentCompoundedInterest,
  previousCompoundedInterest,
) => {
  // divide compounded interest by the snapshot
  return multiplyRatios(
    currentCompoundedInterest,
    invertRatio(previousCompoundedInterest),
  );
};

/**
 *
 * @param {Amount<NatValue>} debtSnapshot
 * @param {Ratio} interestSnapshot as coefficient
 * @param {Ratio} currentCompoundedInterest as coefficient
 * @returns {Amount<NatValue>}
 */
export const calculateCurrentDebt = (
  debtSnapshot,
  interestSnapshot,
  currentCompoundedInterest,
) => {
  if (ratiosSame(interestSnapshot, currentCompoundedInterest)) {
    return debtSnapshot;
  }

  const interestSinceSnapshot = calculateRelativeCompounding(
    currentCompoundedInterest,
    interestSnapshot,
  );

  return floorMultiplyBy(debtSnapshot, interestSinceSnapshot);
};

/**
 *
 * @param {Amount<NatValue>} debt
 * @param {Ratio} interestApplied
 * @returns {Amount<NatValue>}
 */
export const reverseInterest = (debt, interestApplied) => {
  return floorDivideBy(debt, interestApplied);
};
