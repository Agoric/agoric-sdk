import { Far } from '@endo/marshal';

import { swap } from './swap.js';
import { assertKInvariantSellingX } from './invariants.js';
import { getXY } from './getXY.js';
import { swapInNoFees, swapOutNoFees } from './core.js';

// pricesForStatedOutput() and pricesForStatedInput are the external entrypoints
// to the constantProduct module. The amountWanted is optional for
// pricesForStatedInput and amountgiven is optional for pricesForStatedOutput.

// The two methods call swap, passing in different functions for noFeeSwap.
// pricesForStatedInput uses swapInNoFees, while pricesForStatedOutput uses
// swapOutNoFees. the noFeesSwap functions
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

/** @type {CalcSwapInPrices} */
const pricesForStatedInput = (
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

/** @type {CalcSwapOutPrices} */
const pricesForStatedOutput = (
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

harden(pricesForStatedInput);
harden(pricesForStatedOutput);

export { pricesForStatedOutput, pricesForStatedInput };
