// @jessie-check

import {
  divideBy,
  multiplyBy,
  invertRatio,
  multiplyRatios,
  ratiosSame,
} from '@agoric/zoe/src/contractSupport/ratio.js';

/**
 * @param {Ratio} currentCompoundedStabilityFee as coefficient
 * @param {Ratio} previousCompoundedStabilityFee as coefficient
 * @returns {Ratio} additional compounding since the previous
 */
const calculateRelativeCompounding = (
  currentCompoundedStabilityFee,
  previousCompoundedStabilityFee,
) => {
  // divide compounded interest by the snapshot
  return multiplyRatios(
    currentCompoundedStabilityFee,
    invertRatio(previousCompoundedStabilityFee),
  );
};

/**
 * @param {Amount<'nat'>} debtSnapshot
 * @param {Ratio} stabilityFeeSnapshot as coefficient
 * @param {Ratio} currentCompoundedStabilityFee as coefficient
 * @returns {Amount<'nat'>}
 */
export const calculateCurrentDebt = (
  debtSnapshot,
  stabilityFeeSnapshot,
  currentCompoundedStabilityFee,
) => {
  if (ratiosSame(stabilityFeeSnapshot, currentCompoundedStabilityFee)) {
    return debtSnapshot;
  }

  const interestSinceSnapshot = calculateRelativeCompounding(
    currentCompoundedStabilityFee,
    stabilityFeeSnapshot,
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
