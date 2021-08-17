// @ts-check

import { swap } from './swap';
import { swapInNoFees } from './core';

export const swapIn = (
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
    swapInNoFees,
  );
};
