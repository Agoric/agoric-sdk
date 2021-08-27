// @ts-check

import { swap } from './swap.js';
import { swapInNoFees } from './core.js';
import { assertKInvariantSellingX } from './invariants.js';
import { getXY } from './getXY.js';

export const swapIn = (
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
    swapInNoFees,
  );
  const { x, y } = getXY({
    amountGiven,
    poolAllocation,
    amountWanted,
  });
  assertKInvariantSellingX(x, y, result.xIncrement, result.yDecrement);
  return result;
};
