// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { BASIS_POINTS } from '../../../../src/contracts/constantProduct/defaults.js';
import {
  swapOutNotImprovedNoFees,
  swapInNotImprovedNoFees,
  calcDeltaYSellingX,
} from '../../../../src/contracts/constantProduct/core.js';
import { setupMintKits } from './setupMints.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';
import { swap } from '../../../../src/contracts/constantProduct/swap.js';

const swapIn = (
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
    swapInNotImprovedNoFees,
  );
};

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
    swapOutNotImprovedNoFees,
  );
};

const { run, bld, runKit, bldKit } = setupMintKits();

const getInputPriceV1 = input =>
  (997n * input.inputValue * input.outputReserve) /
  (1000n * input.inputReserve + 997n * input.inputValue);

// This assumes RUN is swapped in. The test should function the same
// regardless of what brand is the amountIn, because no RUN-specific fee is
// charged.
const prepareSwapInTest = ({ inputReserve, outputReserve, inputValue }) => {
  const amountGiven = run(inputValue);
  const poolAllocation = harden({
    Central: run(inputReserve),
    Secondary: bld(outputReserve),
  });
  const amountWanted = bld(3n);
  // Protocol fee set to 0 to emulate Uniswap V1
  const protocolFeeRatio = makeRatio(0n, runKit.brand, BASIS_POINTS);
  const poolFeeRatio = makeRatio(30n, runKit.brand, BASIS_POINTS);

  const args = [
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  ];
  return harden({
    args,
    run,
    bld,
  });
};

const testGetPrice = (t, inputs, expectedOutput) => {
  const { args } = prepareSwapInTest(inputs);
  const result = swapIn(...args);
  t.deepEqual(result.swapperGets, bld(expectedOutput));
  return result.swapperGets;
};

const getInputPriceThrows = (t, inputs, message) => {
  t.throws(
    _ => {
      const { args } = prepareSwapInTest(inputs);
      return swapIn(...args);
    },
    {
      message,
    },
  );
};

// This assumes run is swapped in. The test should function the same
// regardless of what brand is the amountIn, because no run fee is
// charged.
const prepareSwapOutTest = ({ inputReserve, outputReserve, outputValue }) => {
  const amountGiven = run(10000n); // hard-coded
  const poolAllocation = harden({
    Central: run(inputReserve),
    Secondary: bld(outputReserve),
  });
  const amountWanted = bld(outputValue);
  const protocolFeeRatio = makeRatio(0n, runKit.brand, BASIS_POINTS);
  const poolFeeRatio = makeRatio(30n, runKit.brand, BASIS_POINTS);

  const args = [
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
  ];
  return harden({
    args,
    run,
    bld,
  });
};

const testGetOutputPrice = (t, inputs, expectedInput) => {
  const { args } = prepareSwapOutTest(inputs);
  const result = swapOut(...args);
  t.deepEqual(result.swapperGives, run(expectedInput));
};

const getOutputPriceThrows = (t, inputs, message) => {
  const { args } = prepareSwapOutTest(inputs);
  t.throws(_ => swapOut(...args), {
    message,
  });
};

// If these tests of `getInputPrice` fail, it would indicate that we have
// diverged from the calculation in the Uniswap paper.
test('getInputPrice no reserves', t => {
  const input = {
    inputReserve: 0n,
    outputReserve: 0n,
    inputValue: 1n,
  };
  const message =
    '"poolAllocation.Central" must be greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice ok 2', t => {
  const input = {
    inputReserve: 5984n,
    outputReserve: 3028n,
    inputValue: 1398n,
  };
  const expectedOutput = 572n;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 3', t => {
  const input = {
    inputReserve: 8160n,
    outputReserve: 7743n,
    inputValue: 6635n,
  };
  const expectedOutput = 3466n;

  const bldOutNoFees = calcDeltaYSellingX(
    run(input.inputReserve),
    bld(input.outputReserve),
    run(input.inputValue),
  );
  console.log('bldOutNoFees', bldOutNoFees);

  // inputValue = deltaX
  // outputReserve = y
  // inputReserve = x
  // (997 * deltaX * y) / (1000 * x + 997 * deltaX) where / is
  // floorDivide

  const v1 = getInputPriceV1(input);
  t.is(v1, expectedOutput, `expected output didn't match v1`);
  console.log('v1 fee', bldOutNoFees.value - v1);

  // Take fee off first
  const feeOffFirst = calcDeltaYSellingX(
    run(input.inputReserve),
    bld(input.outputReserve),
    run(6615),
  );
  console.log('feeOffFirst', feeOffFirst);

  // This produces 3470n, not the v1 answer which is 3466n.
  const output = testGetPrice(t, input, v1);
  console.log('constant product output', output);
  console.log('constant product fee', bldOutNoFees.value - output.value);
});

test('getInputPrice ok 4', t => {
  const input = {
    inputReserve: 10n,
    outputReserve: 10n,
    inputValue: 1000n,
  };
  const expectedOutput = 9n;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 5', t => {
  const input = {
    inputReserve: 100n,
    outputReserve: 50n,
    inputValue: 17n,
  };
  const expectedOutput = 7n;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 6', t => {
  const input = {
    outputReserve: 117n,
    inputReserve: 43n,
    inputValue: 7n,
  };
  const expectedOutput = 16n;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice negative', t => {
  const input = {
    outputReserve: 117n,
    inputReserve: 43n,
    inputValue: -7n,
  };
  const message = 'value "[-7n]" must be a Nat or an array';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice bad reserve 1', t => {
  const input = {
    outputReserve: 0n,
    inputReserve: 43n,
    inputValue: 347n,
  };
  const message =
    '"poolAllocation.Secondary" must be greater than 0: {"brand":"[Alleged: BLD brand]","value":"[0n]"}';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice bad reserve 2', t => {
  const input = {
    outputReserve: 50n,
    inputReserve: 0n,
    inputValue: 828n,
  };
  const message =
    '"poolAllocation.Central" must be greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice big product', t => {
  const input = {
    outputReserve: 100000000n,
    inputReserve: 100000000n,
    inputValue: 1000n,
  };
  const expectedOutput = 996n;
  testGetPrice(t, input, expectedOutput);
});

test('getOutputPrice ok', t => {
  const input = {
    outputReserve: 117n,
    inputReserve: 43n,
    outputValue: 37n,
  };
  const expectedOutput = 20n;
  testGetOutputPrice(t, input, expectedOutput);
});

test('getOutputPrice zero output reserve', t => {
  const input = {
    outputReserve: 0n,
    inputReserve: 43n,
    outputValue: 37n,
  };
  const message =
    '"poolAllocation.Secondary" must be greater than 0: {"brand":"[Alleged: BLD brand]","value":"[0n]"}';
  getOutputPriceThrows(t, input, message);
});

test('getOutputPrice zero input reserve', t => {
  const input = {
    outputReserve: 92n,
    inputReserve: 0n,
    outputValue: 37n,
  };
  const message =
    '"poolAllocation.Central" must be greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
  getOutputPriceThrows(t, input, message);
});

test('getOutputPrice big product', t => {
  const input = {
    outputReserve: 100000000n,
    inputReserve: 100000000n,
    outputValue: 1000n,
  };
  const expectedOutput = 1004n;
  testGetOutputPrice(t, input, expectedOutput);
});

test('getOutputPrice minimum price', t => {
  const input = {
    outputReserve: 10n,
    inputReserve: 1n,
    outputValue: 1n,
  };
  const expectedOutput = 1n;
  testGetOutputPrice(t, input, expectedOutput);
});
