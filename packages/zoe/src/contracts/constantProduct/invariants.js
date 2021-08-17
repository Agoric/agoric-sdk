// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

import { makeRatioFromAmounts } from '../../contractSupport/ratio';
import { natSafeMath } from '../../contractSupport';

import { BASIS_POINTS } from './defaults';

/**
 * xy <= (x + deltaX)(y - deltaY)
 *
 * @param {Amount} x - the amount of Brand X in pool, xPoolAllocation
 * @param {Amount} y - the amount of Brand Y in pool, yPoolAllocation
 * @param {Amount} deltaX - the amount of Brand X to be added
 * @param {Amount} deltaY - the amount of Brand Y to be taken out
 */
export const checkKInvariantSellingX = (x, y, deltaX, deltaY) => {
  const oldK = natSafeMath.multiply(x.value, y.value);
  const newX = AmountMath.add(x, deltaX);
  const newY = AmountMath.subtract(y, deltaY);
  const newK = natSafeMath.multiply(newX.value, newY.value);
  return oldK <= newK;
};

/**
 * xy <= (x + deltaX)(y - deltaY)
 *
 * @param {Amount} x - the amount of Brand X in pool, xPoolAllocation
 * @param {Amount} y - the amount of Brand Y in pool, yPoolAllocation
 * @param {Amount} deltaX - the amount of Brand X to be added
 * @param {Amount} deltaY - the amount of Brand Y to be taken out
 */
export const assertKInvariantSellingX = (x, y, deltaX, deltaY) => {
  const oldK = natSafeMath.multiply(x.value, y.value);
  const newX = AmountMath.add(x, deltaX);
  const newY = AmountMath.subtract(y, deltaY);
  const newK = natSafeMath.multiply(newX.value, newY.value);
  assert(
    oldK <= newK,
    X`the constant product invariant was violated, with x=${x}, y=${y}, deltaX=${deltaX}, deltaY=${deltaY}, oldK=${oldK}, newK=${newK}`,
  );
};

/**
 * Assert that the protocolFee amount is greater than the specified
 * basisPoints, given protocolFee as a fraction of amountIn (includes protocolFee)
 *
 * @param {Amount} protocolFee
 * @param {Amount} amountIn
 * @param {bigint} protocolFeeBP
 * @returns {void}
 */
export const assertProtocolFee = (protocolFee, amountIn, protocolFeeBP) => {
  const protocolFeeRatio = makeRatioFromAmounts(protocolFee, amountIn);

  const approximationBP =
    (Number(protocolFeeRatio.numerator.value) * Number(BASIS_POINTS)) /
    Number(protocolFeeRatio.denominator.value);

  assert(
    approximationBP >= protocolFeeBP,
    X`actualProtocolFeeBP was not greater: ${protocolFeeRatio}`,
  );
};

/**
 * Assert that the poolFee amount is greater than the specified
 * basisPoints, given poolFee as a fraction of amountOut + poolFee
 *
 * @param {Amount} poolFee
 * @param {Amount} amountOut
 * @param {bigint} poolFeeBP
 * @returns {void}
 */
export const assertPoolFee = (poolFee, amountOut, poolFeeBP) => {
  if (AmountMath.isEmpty(amountOut)) {
    return;
  }
  const poolFeeRatio = makeRatioFromAmounts(
    poolFee,
    AmountMath.add(amountOut, poolFee),
  );

  const approximationBP =
    (Number(poolFeeRatio.numerator.value) * Number(BASIS_POINTS)) /
    Number(poolFeeRatio.denominator.value);

  assert(approximationBP >= poolFeeBP);
};
