import { AmountMath } from '@agoric/ertp';

import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { getXY } from './getXY.js';

const { Fail } = assert;

const assertSingleBrand = ratio => {
  ratio.numerator.brand === ratio.denominator.brand ||
    Fail`Ratio was expected to have same brand in numerator ${ratio.numerator.brand} and denominator ${ratio.denominator.brand}`;
};

/**
 * Multiply an amount by a ratio using floorDivide, ignoring the ratio's brands
 * in favor of the amount brand. This is necessary because the ratio is produced
 * by dividing assets of the opposite brand.
 *
 * @param {Amount<'nat'>} amount
 * @param {Ratio} ratio
 * @returns {Amount<'nat'>}
 */
const floorMultiplyKeepBrand = (amount, ratio) => {
  assertSingleBrand(ratio);
  const value = natSafeMath.floorDivide(
    natSafeMath.multiply(amount.value, ratio.numerator.value),
    ratio.denominator.value,
  );
  return AmountMath.make(amount.brand, value);
};

/**
 * Multiply an amount and a ratio using ceilDivide, ignoring the ratio's brands
 * in favor of the amount brand. This is necessary because the ratio is produced
 * by dividing assets of the opposite brand.
 *
 * @param {Amount<'nat'>} amount
 * @param {Ratio} ratio
 * @returns {Amount<'nat'>}
 */
const ceilMultiplyKeepBrand = (amount, ratio) => {
  assertSingleBrand(ratio);
  const value = natSafeMath.ceilDivide(
    natSafeMath.multiply(amount.value, ratio.numerator.value),
    ratio.denominator.value,
  );
  return AmountMath.make(amount.brand, value);
};

/**
 * Calculate deltaY when the user is selling brand X. That is, whichever asset
 * the user is selling, this function is used to calculate the change in the
 * other asset, i.e. how much of brand Y to give the user in return.
 * swapOutImproved calls this function with the calculated amountIn to find out
 * if more than the wantedAmountOut can be gained for the necessary amountIn.
 *
 * deltaY = (deltaXOverX/(1 + deltaXOverX))*y
 * Equivalently: (deltaX / (deltaX + x)) * y
 *
 * @param {Amount<'nat'>} x - the amount of Brand X in pool
 * @param {Amount<'nat'>} y - the amount of Brand Y the pool
 * @param {Amount<'nat'>} deltaX - the amount of Brand X to be added
 * @returns {Amount<'nat'>} deltaY - the amount of Brand Y to be taken out
 */
export const calcDeltaYSellingX = (x, y, deltaX) => {
  const deltaXPlusX = AmountMath.add(deltaX, x);
  const xRatio = makeRatioFromAmounts(deltaX, deltaXPlusX);
  // We want to err on the side of the pool, so this will use floorDivide to
  // round down the amount paid out.
  return floorMultiplyKeepBrand(y, xRatio);
};

/**
 * Calculate deltaX when the user is selling brand X. That is, whichever asset
 * the user is selling, this function is used to calculate the change to the
 * pool for that asset. swapInReduced calls this with the calculated amountOut
 * to find out if less than the offeredAmountIn would be sufficient.
 *
 * deltaX = (deltaYOverY/(1 - deltaYOverY))*x
 * Equivalently: (deltaY / (Y - deltaY )) * x
 *
 * @param {Amount<'nat'>} x - the amount of Brand X in the pool
 * @param {Amount<'nat'>} y - the amount of Brand Y in the pool
 * @param {Amount<'nat'>} deltaY - the amount of Brand Y to be taken out
 * @returns {Amount<'nat'>} deltaX - the amount of Brand X to be added
 */
export const calcDeltaXSellingX = (x, y, deltaY) => {
  const yMinusDeltaY = AmountMath.subtract(y, deltaY);
  const yRatio = makeRatioFromAmounts(deltaY, yMinusDeltaY);
  // We want to err on the side of the pool, so this will use ceilMultiply to
  // round up the amount required.
  return ceilMultiplyKeepBrand(x, yRatio);
};

/**
 * The input contains the amounts in the pool and a maximum amount offered.
 * Calculate the most beneficial trade that satisfies the constant product
 * invariant.
 *
 * @param {GetXYResultDeltaX} obj
 * @returns {ImprovedNoFeeSwapResult}
 */
const swapInReduced = ({ x, y, deltaX: offeredAmountIn }) => {
  const amountOut = calcDeltaYSellingX(x, y, offeredAmountIn);
  const reducedAmountIn = calcDeltaXSellingX(x, y, amountOut);
  AmountMath.isGTE(offeredAmountIn, reducedAmountIn) ||
    Fail`The trade would have required ${reducedAmountIn} more than was offered ${offeredAmountIn}`;

  return harden({
    amountIn: reducedAmountIn,
    amountOut,
  });
};

/**
 * The input contains the amounts in the pool and the minimum amount requested.
 * Calculate the most beneficial trade that satisfies the constant product
 * invariant.
 *
 * @param {GetXYResultDeltaY} obj
 * @returns {ImprovedNoFeeSwapResult}
 */
const swapOutImproved = ({ x, y, deltaY: wantedAmountOut }) => {
  const amountIn = calcDeltaXSellingX(x, y, wantedAmountOut);
  const improvedAmountOut = calcDeltaYSellingX(x, y, amountIn);
  AmountMath.isGTE(improvedAmountOut, wantedAmountOut) ||
    Fail`The trade would have returned ${improvedAmountOut} less than was wanted ${wantedAmountOut}`;

  return harden({
    amountIn,
    amountOut: improvedAmountOut,
  });
};

/** @type {NoFeeSwapFn} */
export const swapInNoFees = ({ amountGiven, poolAllocation }) => {
  const XY = getXY({ amountGiven, poolAllocation });
  return swapInReduced(XY);
};

/** @type {NoFeeSwapFn} */
export const swapOutNoFees = ({ poolAllocation, amountWanted }) => {
  const XY = getXY({ poolAllocation, amountWanted });
  return swapOutImproved(XY);
};
