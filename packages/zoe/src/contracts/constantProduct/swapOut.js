// @ts-check

import { swap } from './swap';
import { swapOutNoFees } from './core';

export const swapOut = (
  amountGiven,
  poolAllocation,
  amountWanted,
  protocolFeeRatio,
  poolFeeRatio,
) => {
  return swap(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
    swapOutNoFees,
  );
};
