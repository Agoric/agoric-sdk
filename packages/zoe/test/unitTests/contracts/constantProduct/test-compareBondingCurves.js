// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { BASIS_POINTS } from '../../../../src/contracts/constantProduct/defaults';

import { swapIn } from '../../../../src/contracts/constantProduct/swapIn';
import { swapOut } from '../../../../src/contracts/constantProduct/swapOut';
import { setupMintKits } from './setupMints';
import { makeRatio } from '../../../../src/contractSupport';

// This assumes run is swapped in. The test should function the same
// regardless of what brand is the amountIn, because no run fee is
// charged.
const prepareSwapInTest = ({ inputReserve, outputReserve, inputValue }) => {
  const { run, bld, runKit, bldKit } = setupMintKits();
  const amountGiven = run(inputValue);
  const poolAllocation = harden({
    Central: run(inputReserve),
    Secondary: bld(outputReserve),
  });
  const amountWanted = bld(3n);
  const protocolFeeRatio = makeRatio(0n, runKit.brand, BASIS_POINTS);
  const poolFeeRatio = makeRatio(3n, bldKit.brand, BASIS_POINTS);

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
  const { args, bld } = prepareSwapInTest(inputs);
  const result = swapIn(...args);
  t.deepEqual(result.swapperGets, bld(expectedOutput));
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
  const { run, bld, runKit } = setupMintKits();
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
  const { args, run } = prepareSwapOutTest(inputs);
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
    '"poolAllocation.Central" was not greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
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
  testGetPrice(t, input, expectedOutput);
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
    '"poolAllocation.Secondary" was not greater than 0: {"brand":"[Alleged: BLD brand]","value":"[0n]"}';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice bad reserve 2', t => {
  const input = {
    outputReserve: 50n,
    inputReserve: 0n,
    inputValue: 828n,
  };
  const message =
    '"poolAllocation.Central" was not greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice zero input', t => {
  const input = {
    outputReserve: 50n,
    inputReserve: 320n,
    inputValue: 0n,
  };
  const message =
    '"allocation.In" was not greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
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
    '"poolAllocation.Secondary" was not greater than 0: {"brand":"[Alleged: BLD brand]","value":"[0n]"}';
  getOutputPriceThrows(t, input, message);
});

test('getOutputPrice zero input reserve', t => {
  const input = {
    outputReserve: 92n,
    inputReserve: 0n,
    outputValue: 37n,
  };
  const message =
    '"poolAllocation.Central" was not greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
  getOutputPriceThrows(t, input, message);
});

test('getOutputPrice too much output', t => {
  const input = {
    outputReserve: 1024n,
    inputReserve: 1132n,
    outputValue: 20923n,
  };
  const message =
    'The poolAllocation {"brand":"[Alleged: BLD brand]","value":"[1024n]"} did not have enough to satisfy the wanted amountOut {"brand":"[Alleged: BLD brand]","value":"[20923n]"}';
  getOutputPriceThrows(t, input, message);
});

test('getOutputPrice too much output 2', t => {
  const input = {
    outputReserve: 345n,
    inputReserve: 1132n,
    outputValue: 345n,
  };
  const message =
    'The poolAllocation {"brand":"[Alleged: BLD brand]","value":"[345n]"} did not have enough to satisfy the wanted amountOut {"brand":"[Alleged: BLD brand]","value":"[345n]"}';
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
