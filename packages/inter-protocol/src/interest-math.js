// @jessie-check

import {
  divideBy,
  multiplyBy,
  invertRatio,
  multiplyRatios,
  ratiosSame,
} from '@agoric/zoe/src/contractSupport/ratio.js';

/**
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
 * @param {Amount<'nat'>} debtSnapshot
 * @param {Ratio} interestSnapshot as coefficient
 * @param {Ratio} currentCompoundedInterest as coefficient
 * @returns {Amount<'nat'>}
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

  return multiplyBy(debtSnapshot, interestSinceSnapshot);
};

/**
 * @param {Amount<'nat'>} debt
 * @param {Ratio} interestApplied
 * @returns {Amount<'nat'>}
 */
export const reverseInterest = (debt, interestApplied) => {
  return divideBy(debt, interestApplied);
};
