// @ts-check

import { AmountMath } from '@agoric/ertp';
import { ceilMultiplyBy, makeRatio } from '../../contractSupport/ratio.js';

import { BASIS_POINTS } from './defaults.js';

/**
 * Make a ratio given a nat representing basis points
 *
 * @param {NatValue} feeBP
 * @param {Brand} brandOfFee
 * @returns {Ratio}
 */
export const makeFeeRatio = (feeBP, brandOfFee) => {
  return makeRatio(feeBP, brandOfFee, BASIS_POINTS);
};

export const maximum = (left, right) => {
  // If left is greater or equal, return left. Otherwise return right.
  return AmountMath.isGTE(left, right) ? left : right;
};

export const amountGT = (left, right) =>
  AmountMath.isGTE(left, right) && !AmountMath.isEqual(left, right);

/**
 * @param {{ amountIn: Amount, amountOut: Amount}} amounts - an array of two
 *   amounts in different brands. We must select the amount of the same brand as
 *   the feeRatio.
 * @param {Ratio} feeRatio
 * @returns {Amount}
 */
const calcFee = ({ amountIn, amountOut }, feeRatio) => {
  const sameBrandAmount =
    amountIn.brand === feeRatio.numerator.brand ? amountIn : amountOut;
  // Always round fees up
  const fee = ceilMultiplyBy(sameBrandAmount, feeRatio);

  // Fee cannot exceed the amount on which it is levied
  assert(AmountMath.isGTE(sameBrandAmount, fee));

  return fee;
};

// SwapIn uses calcDeltaYSellingX
// SwapOut uses calcDeltaXSellingX

export const calculateFees = (
  amountGiven,
  poolAllocation,
  amountWanted,
  protocolFeeRatio,
  poolFeeRatio,
  swapFn,
) => {
  // Get a rough estimation in both brands of the amount to be swapped
  const estimation = swapFn({ amountGiven, poolAllocation, amountWanted });

  const protocolFee = calcFee(estimation, protocolFeeRatio);
  const poolFee = calcFee(estimation, poolFeeRatio);

  return harden({ protocolFee, poolFee, ...estimation });
};
