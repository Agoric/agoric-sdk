// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import {
  BASIS_POINTS,
  DEFAULT_PROTOCOL_FEE,
  DEFAULT_POOL_FEE,
} from '../../../../src/contracts/constantProduct/defaults.js';

import { swapIn } from '../../../../src/contracts/constantProduct/swapIn.js';
import { setupMintKits } from './setupMints.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';

// This assumes run is swapped in. The test should function the same
// regardless of what brand is the amountIn, because no run fee is
// charged.
const prepareSwapInTest = ({
  inputPool,
  outputPool,
  inputValue,
  outputValue,
}) => {
  const { run, bld, runKit, bldKit } = setupMintKits();
  const amountGiven = run(inputValue);
  const poolAllocation = harden({
    Central: run(inputPool),
    Secondary: bld(outputPool),
  });
  const amountWanted = bld(outputValue);
  const protocolFeeRatio = makeRatio(
    DEFAULT_PROTOCOL_FEE,
    runKit.brand,
    BASIS_POINTS,
  );
  const poolFeeRatio = makeRatio(DEFAULT_POOL_FEE, bldKit.brand, BASIS_POINTS);

  const args = [
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  ];

  return { args, bld, run };
};

const testGetPrice = (t, inputs, expectedOutput) => {
  const { args, run, bld } = prepareSwapInTest(inputs);
  const result = swapIn(...args);
  const expected = harden({
    protocolFee: run(expectedOutput.protocolFee),
    poolFee: bld(expectedOutput.poolFee),
    swapperGives: run(expectedOutput.swapperGives),
    swapperGets: bld(expectedOutput.swapperGets),
    xIncrement: run(expectedOutput.xIncrement),
    yDecrement: bld(expectedOutput.yDecrement),
    newX: run(expectedOutput.newX),
    newY: bld(expectedOutput.newY),
    improvement: run(expectedOutput.improvement),
  });
  t.deepEqual(result, expected);
};

// This uses the values that provoked a bug in newSwap.
test('getInputPrice newSwap bug scenario', t => {
  const input = {
    inputPool: 50825056949339n,
    outputPool: 2196247730468n,
    inputValue: 73000000n,
    outputValue: 100n,
  };

  const firstDeltaY =
    (input.outputPool * input.inputValue) /
    (input.inputPool + input.inputValue);
  const firstImprovedDeltaX =
    (input.inputPool * firstDeltaY) / (input.outputPool - firstDeltaY);
  const poolFee = 1n + (DEFAULT_POOL_FEE * firstDeltaY) / BASIS_POINTS;
  const protocolFee =
    1n + (DEFAULT_PROTOCOL_FEE * firstImprovedDeltaX) / BASIS_POINTS;

  const secondDeltaY =
    (input.outputPool * (input.inputValue - protocolFee)) /
    (input.inputPool + (input.inputValue - protocolFee));
  const secondImprovedDeltaX =
    (input.inputPool * secondDeltaY) / (input.outputPool - secondDeltaY);
  const yDecrement = secondDeltaY - poolFee;
  const improvement = 3n;
  const xIncrement = input.inputValue - protocolFee - improvement;
  t.is(secondImprovedDeltaX + 1n, xIncrement);
  const expectedOutput = harden({
    poolFee,
    protocolFee,
    swapperGives: input.inputValue - improvement,
    swapperGets: yDecrement,
    xIncrement,
    yDecrement,
    newX: input.inputPool + xIncrement,
    newY: input.outputPool - yDecrement,
    improvement: 18n,
  });
  testGetPrice(t, input, expectedOutput);
});

test.only('getInputPrice newSwap example', t => {
  const input = {
    inputPool: 40000n,
    outputPool: 3000n,
    inputValue: 300n,
    outputValue: 20n,
  };

  const poolFee = 1n;
  const protocolFee = 1n;

  const secondDeltaY =
    (input.outputPool * (input.inputValue - protocolFee)) /
    (input.inputPool + (input.inputValue - protocolFee));
  const secondImprovedDeltaX =
    (input.inputPool * secondDeltaY) / (input.outputPool - secondDeltaY);
  const yDecrement = secondDeltaY - poolFee;
  const improvement = 3n;
  const xIncrement = input.inputValue - protocolFee - improvement;
  t.is(secondImprovedDeltaX + 1n, xIncrement);
  const expectedOutput = harden({
    poolFee,
    protocolFee,
    swapperGives: input.inputValue - improvement,
    swapperGets: yDecrement,
    xIncrement,
    yDecrement,
    newX: input.inputPool + xIncrement,
    newY: input.outputPool - yDecrement,
    improvement: 4n,
  });
  testGetPrice(t, input, expectedOutput);
});
