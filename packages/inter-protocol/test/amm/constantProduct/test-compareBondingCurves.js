// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { BASIS_POINTS } from '../../../src/vpool-xyk-amm/constantProduct/defaults.js';
import { setupMintKits } from './setupMints.js';
import {
  pricesForStatedInput,
  pricesForStatedOutput,
} from '../../../src/vpool-xyk-amm/constantProduct/calcSwapPrices.js';

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
  const amountWanted = bld(0n);
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

const testInputGetPrice = (t, inputs, expectedOutput) => {
  const { args, bld } = prepareSwapInTest(inputs);
  // @ts-expect-error typescript doesn't like param list built by destructuring
  const result = pricesForStatedInput(...args);
  t.deepEqual(result.swapperGets, bld(expectedOutput));
};

const getInputPriceThrows = (t, inputs, message) => {
  t.throws(
    _ => {
      const { args } = prepareSwapInTest(inputs);
      // @ts-expect-error typescript doesn't like param list built by destructuring
      return pricesForStatedInput(...args);
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
  const amountGiven = run(0n);
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
  // @ts-expect-error typescript doesn't like param list built by destructuring
  const result = pricesForStatedOutput(...args);
  t.deepEqual(result.swapperGives, run(expectedInput));
};

const getOutputPriceThrows = (t, inputs, message) => {
  const { args } = prepareSwapOutTest(inputs);
  // @ts-expect-error typescript doesn't like param list built by destructuring
  t.throws(_ => pricesForStatedOutput(...args), {
    message,
  });
};

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
  testInputGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 3', t => {
  const input = {
    inputReserve: 8160n,
    outputReserve: 7743n,
    inputValue: 6635n,
  };
  const expectedOutput = 3470n;
  testInputGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 4', t => {
  const input = {
    inputReserve: 10n,
    outputReserve: 10n,
    inputValue: 1000n,
  };
  const expectedOutput = 8n;
  testInputGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 5', t => {
  const input = {
    inputReserve: 100n,
    outputReserve: 50n,
    inputValue: 17n,
  };
  const expectedOutput = 6n;
  testInputGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 6', t => {
  const input = {
    inputReserve: 43n,
    outputReserve: 117n,
    inputValue: 7n,
  };
  const expectedOutput = 15n;
  testInputGetPrice(t, input, expectedOutput);
});

test('getInputPrice negative', t => {
  const input = {
    inputReserve: 43n,
    outputReserve: 117n,
    inputValue: -7n,
  };
  const message = 'value "[-7n]" must be a natural number';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice bad reserve 1', t => {
  const input = {
    inputReserve: 43n,
    outputReserve: 0n,
    inputValue: 347n,
  };
  const message =
    '"poolAllocation.Secondary" must be greater than 0: {"brand":"[Alleged: BLD brand]","value":"[0n]"}';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice bad reserve 2', t => {
  const input = {
    inputReserve: 0n,
    outputReserve: 50n,
    inputValue: 828n,
  };
  const message =
    '"poolAllocation.Central" must be greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
  getInputPriceThrows(t, input, message);
});

test('getInputPrice zero input', t => {
  const input = {
    inputReserve: 320n,
    outputReserve: 50n,
    inputValue: 0n,
  };

  const expectedOutput = 0n;
  testInputGetPrice(t, input, expectedOutput);
});

test('getOutputPrice zero output', t => {
  const input = {
    inputReserve: 320n,
    outputReserve: 50n,
    outputValue: 0n,
  };

  const expectedInput = 0n;
  testGetOutputPrice(t, input, expectedInput);
});

test('getInputPrice big product', t => {
  const input = {
    inputReserve: 100_000_000n,
    outputReserve: 100_000_000n,
    inputValue: 1000n,
  };
  const expectedOutput = 998n;
  testInputGetPrice(t, input, expectedOutput);
});

test('getOutputPrice ok', t => {
  const input = {
    inputReserve: 43n,
    outputReserve: 117n,
    outputValue: 37n,
  };
  const expectedOutput = 21n;
  testGetOutputPrice(t, input, expectedOutput);
});

test('getOutputPrice zero output reserve', t => {
  const input = {
    inputReserve: 43n,
    outputReserve: 0n,
    outputValue: 37n,
  };
  const message =
    '"poolAllocation.Secondary" must be greater than 0: {"brand":"[Alleged: BLD brand]","value":"[0n]"}';
  getOutputPriceThrows(t, input, message);
});

test('getOutputPrice zero input reserve', t => {
  const input = {
    inputReserve: 0n,
    outputReserve: 92n,
    outputValue: 37n,
  };
  const message =
    '"poolAllocation.Central" must be greater than 0: {"brand":"[Alleged: RUN brand]","value":"[0n]"}';
  getOutputPriceThrows(t, input, message);
});

test('getOutputPrice too much output', t => {
  const input = {
    inputReserve: 1132n,
    outputReserve: 1024n,
    outputValue: 20923n,
  };
  testGetOutputPrice(t, input, 0n);
});

test('getOutputPrice too much output 2', t => {
  const input = {
    inputReserve: 1132n,
    outputReserve: 345n,
    outputValue: 345n,
  };
  testGetOutputPrice(t, input, 0n);
});

test('getOutputPrice big product', t => {
  const input = {
    inputReserve: 100_000_000n,
    outputReserve: 100_000_000n,
    outputValue: 1000n,
  };
  const expectedOutput = 1005n;
  testGetOutputPrice(t, input, expectedOutput);
});

test('getOutputPrice minimum price', t => {
  const input = {
    inputReserve: 1n,
    outputReserve: 10n,
    outputValue: 1n,
  };
  const expectedOutput = 2n;
  testGetOutputPrice(t, input, expectedOutput);
});
