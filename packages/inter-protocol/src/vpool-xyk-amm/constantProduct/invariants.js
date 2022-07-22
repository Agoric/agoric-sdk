// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';

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
  assert(
    checkKInvariantSellingX(x, y, deltaX, deltaY),
    X`the constant product invariant was violated, with x=${x}, y=${y}, deltaX=${deltaX}, deltaY=${deltaY}, oldK=${natSafeMath.multiply(
      x.value,
      y.value,
    )}, newK=${natSafeMath.multiply(
      AmountMath.add(x, deltaX).value,
      AmountMath.subtract(y, deltaY).value,
    )}`,
  );
};
