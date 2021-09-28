// @ts-check

import { Far } from '@agoric/marshal';

import { swap } from './swap.js';
import { assertKInvariantSellingX } from './invariants.js';
import { getXY } from './getXY.js';
import { swapInNoFees, swapOutNoFees } from './core.js';

const makeCalcSwapPrices = noFeesSwap => {
  return Far(
    'calcSwapPrices',
    (
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
        noFeesSwap,
      );
      const { x, y } = getXY({
        amountGiven,
        poolAllocation,
        amountWanted,
      });
      assertKInvariantSellingX(x, y, result.xIncrement, result.yDecrement);
      return result;
    },
  );
};

/** @type {CalcSwapPrices} */
const calcSwapInPrices = (
  amountGiven,
  poolAllocation,
  amountWanted,
  protocolFeeRatio,
  poolFeeRatio,
) => {
  const calcSwapPrices = makeCalcSwapPrices(swapInNoFees);
  return calcSwapPrices(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  );
};

/** @type {CalcSwapPrices} */
const calcSwapOutPrices = (
  amountGiven,
  poolAllocation,
  amountWanted,
  protocolFeeRatio,
  poolFeeRatio,
) => {
  const calcSwapPrices = makeCalcSwapPrices(swapOutNoFees);
  return calcSwapPrices(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  );
};

harden(calcSwapInPrices);
harden(calcSwapOutPrices);

export { calcSwapOutPrices, calcSwapInPrices };
