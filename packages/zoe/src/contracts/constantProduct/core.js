// @ts-check

import { AmountMath } from '@agoric/ertp';

import { natSafeMath } from '../../contractSupport/index.js';
import { makeRatioFromAmounts } from '../../contractSupport/ratio.js';
import { getXY } from './getXY.js';

const { details: X, quote: q } = assert;

const assertSingleBrand = ratio => {
  assert(
    ratio.numerator.brand === ratio.denominator.brand,
    X`Ratio was expected to have same brand in numerator and denominator ${q(
      ratio,
    )}`,
  );
};

/**
 * @param {Amount} amount
 * @param {Ratio} ratio
 * @returns {Amount}
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
 * @param {Amount} amount
 * @param {Ratio} ratio
 * @returns {Amount}
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
 * Calculate the change to the shrinking pool when the user specifies how much
 * they're willing to add. Also used to improve a proposed trade when the amount
 * contributed would buy more than the user asked for.
 *
 * deltaY = (deltaXOverX/(1 + deltaXOverX))*y
 * Equivalently: (deltaX / (deltaX + x)) * y
 *
 * @param {Amount} x - the amount of the growing brand in the pool
 * @param {Amount} y - the amount of the shrinking brand in the pool
 * @param {Amount} deltaX - the amount of the growing brand to be added
 * @returns {Amount} deltaY - the amount of the shrinking brand to be taken out
 */
export const calcDeltaYSellingX = (x, y, deltaX) => {
  const deltaXPlusX = AmountMath.add(deltaX, x);
  const xRatio = makeRatioFromAmounts(deltaX, deltaXPlusX);
  // We want to err on the side of the pool, so this will use floorDivide to
  // round down the amount paid out.
  return floorMultiplyKeepBrand(y, xRatio);
};

/**
 * Calculate the change to the growing pool when the user specifies how much
 * they want to receive. Also used to improve a proposed trade when the amount
 * requested can be purchased for a smaller input.
 *
 * deltaX = (deltaYOverY/(1 - deltaYOverY))*x
 * Equivalently: (deltaY / (Y - deltaY )) * x
 *
 * @param {Amount} x - the amount of the growing brand in the pool
 * @param {Amount} y - the amount of the shrinking brand in the pool
 * @param {Amount} deltaY - the amount of the shrinking brand to take out
 * @returns {Amount} deltaX - the amount of the growingn brand to add
 */
export const calcDeltaXSellingX = (x, y, deltaY) => {
  const yMinusDeltaY = AmountMath.subtract(y, deltaY);
  const yRatio = makeRatioFromAmounts(deltaY, yMinusDeltaY);
  // We want to err on the side of the pool, so this will use ceilMultiply to
  // round up the amount required.
  return ceilMultiplyKeepBrand(x, yRatio);
};

const swapInReduced = ({ x: inPool, y: outPool, deltaX: offeredAmountIn }) => {
  const amountOut = calcDeltaYSellingX(inPool, outPool, offeredAmountIn);
  const reducedAmountIn = calcDeltaXSellingX(inPool, outPool, amountOut);

  assert(AmountMath.isGTE(offeredAmountIn, reducedAmountIn));

  return harden({
    amountIn: reducedAmountIn,
    amountOut,
  });
};

const swapOutImproved = ({
  x: inPool,
  y: outPool,
  deltaY: wantedAmountOut,
}) => {
  const amountIn = calcDeltaXSellingX(inPool, outPool, wantedAmountOut);
  const improvedAmountOut = calcDeltaYSellingX(inPool, outPool, amountIn);

  assert(AmountMath.isGTE(improvedAmountOut, wantedAmountOut));

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
