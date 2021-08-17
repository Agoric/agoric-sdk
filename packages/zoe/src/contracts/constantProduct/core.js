// @ts-check

import { AmountMath } from '@agoric/ertp';

import { natSafeMath } from '../../contractSupport';
import { makeRatioFromAmounts } from '../../contractSupport/ratio';
import { getXY } from './getXY';

// TODO: fix this up with more assertions and rename
// Used for multiplying y by a ratio with both numerators and
// denominators of brand x
/**
 * @param {Amount} amount
 * @param {Ratio} ratio
 * @returns {Amount}
 */
const multiplyByOtherBrandFloorDivide = (amount, ratio) => {
  const value = natSafeMath.floorDivide(
    natSafeMath.multiply(amount.value, ratio.numerator.value),
    ratio.denominator.value,
  );
  return AmountMath.make(amount.brand, value);
};

// TODO: fix this up with more assertions and rename
// Used for multiplying y by a ratio with both numerators and
// denominators of brand x
/**
 * @param {Amount} amount
 * @param {Ratio} ratio
 * @returns {Amount}
 */
const multiplyByOtherBrandCeilDivide = (amount, ratio) => {
  const value = natSafeMath.ceilDivide(
    natSafeMath.multiply(amount.value, ratio.numerator.value),
    ratio.denominator.value,
  );
  return AmountMath.make(amount.brand, value);
};

/**
 * Calculate deltaY when user is selling brand X. This calculates how much of
 * brand Y to give the user in return.
 *
 * deltaY = (deltaXToX/(1 + deltaXToX))*y
 * Equivalently: (deltaX / (deltaX + x)) * y
 *
 * @param {Amount} x - the amount of Brand X in pool, xPoolAllocation
 * @param {Amount} y - the amount of Brand Y in pool, yPoolAllocation
 * @param {Amount} deltaX - the amount of Brand X to be added
 * @returns {Amount} deltaY - the amount of Brand Y to be taken out
 */
export const calcDeltaYSellingX = (x, y, deltaX) => {
  const deltaXPlusX = AmountMath.add(deltaX, x);
  const xRatio = makeRatioFromAmounts(deltaX, deltaXPlusX);
  // Result is an amount in y.brand
  // We would want to err on the side of the pool, so this should be a
  // floorDivide so that less deltaY is given out
  return multiplyByOtherBrandFloorDivide(y, xRatio);
};

/**
 * Calculate deltaX when user is selling brand X. This allows us to give the user a
 * small refund if the amount they will as a payout could have been
 * achieved by a smaller input.
 *
 * deltaX = (deltaYToY/(1 - deltaYToY))*x
 * Equivalently: (deltaY / (y - deltaY )) * x
 *
 * @param {Amount} x - the amount of Brand X in pool, xPoolAllocation
 * @param {Amount} y - the amount of Brand Y in pool, yPoolAllocation
 * @param {Amount} deltaY - the amount of Brand Y to be taken out
 * @returns {Amount} deltaX - the amount of Brand X to be added
 */
export const calcDeltaXSellingX = (x, y, deltaY) => {
  const yMinusDeltaY = AmountMath.subtract(y, deltaY);
  const yRatio = makeRatioFromAmounts(deltaY, yMinusDeltaY);
  // Result is an amount in x.brand
  // We want to err on the side of the pool, so this should be a
  // ceiling divide so that more deltaX is taken
  return multiplyByOtherBrandCeilDivide(x, yRatio);
};

const swapInReduced = ({ x, y, deltaX }) => {
  const deltaY = calcDeltaYSellingX(x, y, deltaX);
  const reducedDeltaX = calcDeltaXSellingX(x, y, deltaY);
  return harden({
    amountIn: reducedDeltaX,
    amountOut: deltaY,
  });
};

const swapOutImproved = ({ x, y, wantedDeltaY }) => {
  const requiredDeltaX = calcDeltaXSellingX(x, y, wantedDeltaY);
  const improvedDeltaY = calcDeltaYSellingX(x, y, requiredDeltaX);
  return harden({
    amountIn: requiredDeltaX,
    amountOut: improvedDeltaY,
  });
};

export const swapInNoFees = ({ amountGiven, poolAllocation }) => {
  const XY = getXY({ amountGiven, poolAllocation });
  return swapInReduced(XY);
};

export const swapOutNoFees = ({ poolAllocation, amountWanted }) => {
  const XY = getXY({ poolAllocation, amountWanted });
  return swapOutImproved(XY);
};
