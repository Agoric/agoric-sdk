import { Fail } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';

/**
 * xy <= (x + deltaX)(y - deltaY)
 *
 * @param {Amount<'nat'>} x - the amount of Brand X in pool, xPoolAllocation
 * @param {Amount<'nat'>} y - the amount of Brand Y in pool, yPoolAllocation
 * @param {Amount<'nat'>} deltaX - the amount of Brand X to be added
 * @param {Amount<'nat'>} deltaY - the amount of Brand Y to be taken out
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
 * @param {Amount<'nat'>} x - the amount of Brand X in pool, xPoolAllocation
 * @param {Amount<'nat'>} y - the amount of Brand Y in pool, yPoolAllocation
 * @param {Amount<'nat'>} deltaX - the amount of Brand X to be added
 * @param {Amount<'nat'>} deltaY - the amount of Brand Y to be taken out
 */
export const assertKInvariantSellingX = (x, y, deltaX, deltaY) => {
  checkKInvariantSellingX(x, y, deltaX, deltaY) ||
    Fail`the constant product invariant was violated, with x=${x}, y=${y}, deltaX=${deltaX}, deltaY=${deltaY}, oldK=${natSafeMath.multiply(
      x.value,
      y.value,
    )}, newK=${natSafeMath.multiply(
      AmountMath.add(x, deltaX).value,
      AmountMath.subtract(y, deltaY).value,
    )}`;
};
