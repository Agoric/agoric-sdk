import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import {
  getInputPrice,
  getOutputPrice,
  calcLiqValueToMint,
} from '../../../src/contractSupport/index.js';

const testGetPrice = (
  t,
  { inputReserve, outputReserve, inputValue },
  expectedOutput,
) => {
  const output = getInputPrice(inputValue, inputReserve, outputReserve);
  t.deepEqual(output, expectedOutput);
};

const getInputPricethrows = (
  t,
  { inputReserve, outputReserve, inputValue },
  message,
) => {
  t.throws(_ => getInputPrice(inputValue, inputReserve, outputReserve), {
    message,
  });
};

const testGetOutputPrice = (
  t,
  { inputReserve, outputReserve, outputValue },
  expectedInput,
) => {
  const input = getOutputPrice(outputValue, inputReserve, outputReserve);
  t.deepEqual(input, expectedInput);
};

const getOutputPricethrows = (
  t,
  { inputReserve, outputReserve, outputValue },
  message,
) => {
  t.throws(_ => getOutputPrice(outputValue, inputReserve, outputReserve), {
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
  const message = /inputReserve .* must be positive/;
  getInputPricethrows(t, input, message);
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
  const message = '-7 is negative';
  getInputPricethrows(t, input, message);
});

test('getInputPrice bad reserve 1', t => {
  const input = {
    outputReserve: 0n,
    inputReserve: 43n,
    inputValue: 347n,
  };
  const message = /outputReserve .* must be positive/;
  getInputPricethrows(t, input, message);
});

test('getInputPrice bad reserve 2', t => {
  const input = {
    outputReserve: 50n,
    inputReserve: 0n,
    inputValue: 828n,
  };
  const message = /inputReserve .* must be positive/;
  getInputPricethrows(t, input, message);
});

test('getInputPrice zero input', t => {
  const input = {
    outputReserve: 50n,
    inputReserve: 320n,
    inputValue: 0n,
  };
  const message = /inputValue .* must be positive/;
  getInputPricethrows(t, input, message);
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

test('calculate value to mint - positive supply 1', t => {
  const res = calcLiqValueToMint(20n, 30n, 5n);
  t.is(res, (20n * 30n) / 5n, 'When supply is present, floor(x*y/z)');
});

test('calculate value to mint - positive supply 2', t => {
  const res = calcLiqValueToMint(5n, 8n, 7n);
  t.is(res, 5n, 'When supply is present, floor(x*y/z)');
});

test('calculate value to mint - no supply', t => {
  const res = calcLiqValueToMint(0n, 30n, 5n);
  t.is(res, 30n, 'When the supply is empty, return inputValue');
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
  const message = /outputReserve .* must be positive/;
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice zero input reserve', t => {
  const input = {
    outputReserve: 92n,
    inputReserve: 0n,
    outputValue: 37n,
  };
  const message = /inputReserve .* must be positive/;
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice too much output', t => {
  const input = {
    outputReserve: 1024n,
    inputReserve: 1132n,
    outputValue: 20923n,
  };
  const message = /outputReserve .* must be greater than outputValue .*/;
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice too much output 2', t => {
  const input = {
    outputReserve: 345n,
    inputReserve: 1132n,
    outputValue: 345n,
  };
  const message = /outputReserve .* must be greater than outputValue .*/;
  getOutputPricethrows(t, input, message);
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
