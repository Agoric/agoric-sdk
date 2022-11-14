// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import {
  makeRatio,
  natSafeMath,
} from '@agoric/zoe/src/contractSupport/index.js';
import {
  BASIS_POINTS,
  DEFAULT_PROTOCOL_FEE,
  DEFAULT_POOL_FEE,
} from '../../../src/vpool-xyk-amm/constantProduct/defaults.js';
import { setupMintKits } from './setupMints.js';
import { pricesForStatedInput } from '../../../src/vpool-xyk-amm/constantProduct/calcSwapPrices.js';

const { multiply, ceilDivide } = natSafeMath;

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
  // @ts-expect-error typescript doesn't like param list built by destructuring
  const result = pricesForStatedInput(...args);
  const expected = harden({
    protocolFee: run(expectedOutput.protocolFee),
    poolFee: bld(expectedOutput.poolFee),
    swapperGives: run(expectedOutput.swapperGives),
    swapperGets: bld(expectedOutput.swapperGets),
    xIncrement: run(expectedOutput.xIncrement),
    yDecrement: bld(expectedOutput.yDecrement),
    newX: run(expectedOutput.newX),
    newY: bld(expectedOutput.newY),
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
  const poolFee = ceilDivide(
    multiply(DEFAULT_POOL_FEE, firstDeltaY),
    BASIS_POINTS,
  );
  const protocolFee = ceilDivide(
    multiply(DEFAULT_PROTOCOL_FEE, firstImprovedDeltaX),
    BASIS_POINTS,
  );

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
  });
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice xy=k example', t => {
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
  });
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice xy=k bigger numbers', t => {
  const input = {
    inputPool: 40000000n,
    outputPool: 3000000n,
    inputValue: 30000n,
    outputValue: 2000n,
  };

  const poolFee = 6n;
  const protocolFee = 18n;

  const secondDeltaY =
    (input.outputPool * (input.inputValue - protocolFee)) /
    (input.inputPool + (input.inputValue - protocolFee));
  const secondImprovedDeltaX =
    (input.inputPool * secondDeltaY) / (input.outputPool - secondDeltaY) + 1n;
  const yDecrement = secondDeltaY - poolFee;
  const improvement = 12n;
  const xIncrement = input.inputValue - protocolFee - improvement;
  t.is(secondImprovedDeltaX, xIncrement);
  const expectedOutput = harden({
    poolFee,
    protocolFee,
    swapperGives: input.inputValue - improvement,
    swapperGets: yDecrement,
    xIncrement,
    yDecrement,
    newX: input.inputPool + xIncrement,
    newY: input.outputPool - yDecrement,
  });
  testGetPrice(t, input, expectedOutput);
});
