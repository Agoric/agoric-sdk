// @ts-check

import { swap } from './swap.js';
import { swapOutNoFees } from './core.js';
import { getXY } from './getXY.js';
import { assertKInvariantSellingX } from './invariants.js';

export const swapOut = (
  amountGiven,
  poolAllocation,
  amountWanted,
  protocolFeeRatio,
  poolFeeRatio,
) => {
  const result = swap(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
    swapOutNoFees,
  );
  const { x, y } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });
  assertKInvariantSellingX(x, y, result.xIncrement, result.yDecrement);
  return result;
};
