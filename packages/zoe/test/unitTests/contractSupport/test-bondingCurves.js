// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import test from 'ava';

import {
  getInputPrice,
  getOutputPrice,
  calcLiqValueToMint,
} from '../../../src/contractSupport';

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
    inputReserve: 0,
    outputReserve: 0,
    inputValue: 1,
  };
  const message = 'inputReserve (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice ok 2', t => {
  const input = {
    inputReserve: 5984,
    outputReserve: 3028,
    inputValue: 1398,
  };
  const expectedOutput = 572;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 3', t => {
  const input = {
    inputReserve: 8160,
    outputReserve: 7743,
    inputValue: 6635,
  };
  const expectedOutput = 3466;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 4', t => {
  const input = {
    inputReserve: 10,
    outputReserve: 10,
    inputValue: 1000,
  };
  const expectedOutput = 9;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 5', t => {
  const input = {
    inputReserve: 100,
    outputReserve: 50,
    inputValue: 17,
  };
  const expectedOutput = 7;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 6', t => {
  const input = {
    outputReserve: 117,
    inputReserve: 43,
    inputValue: 7,
  };
  const expectedOutput = 16;
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice negative', t => {
  const input = {
    outputReserve: 117,
    inputReserve: 43,
    inputValue: -7,
  };
  const message = 'inputValue (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice bad reserve 1', t => {
  const input = {
    outputReserve: 0,
    inputReserve: 43,
    inputValue: 347,
  };
  const message = 'outputReserve (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice bad reserve 2', t => {
  const input = {
    outputReserve: 50,
    inputReserve: 0,
    inputValue: 828,
  };
  const message = 'inputReserve (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice zero input', t => {
  const input = {
    outputReserve: 50,
    inputReserve: 320,
    inputValue: 0,
  };
  const message = 'inputValue (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice big product', t => {
  const input = {
    outputReserve: 100000000,
    inputReserve: 100000000,
    inputValue: 1000,
  };
  const expectedOutput = 996;
  testGetPrice(t, input, expectedOutput);
});

test('calculate value to mint - positive supply 1', t => {
  const res = calcLiqValueToMint(20, 30, 5);
  t.is(res, (20 * 30) / 5, 'When supply is present, floor(x*y/z)');
});

test('calculate value to mint - positive supply 2', t => {
  const res = calcLiqValueToMint(5, 8, 7);
  t.is(res, 5, 'When supply is present, floor(x*y/z)');
});

test('calculate value to mint - no supply', t => {
  const res = calcLiqValueToMint(0, 30, 5);
  t.is(res, 30, 'When the supply is empty, return inputValue');
});

test('getOutputPrice ok', t => {
  const input = {
    outputReserve: 117,
    inputReserve: 43,
    outputValue: 37,
  };
  const expectedOutput = 19;
  testGetOutputPrice(t, input, expectedOutput);
});

test('getOutputPrice zero output reserve', t => {
  const input = {
    outputReserve: 0,
    inputReserve: 43,
    outputValue: 37,
  };
  const message = 'outputReserve (a number) must be positive';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice zero input reserve', t => {
  const input = {
    outputReserve: 92,
    inputReserve: 0,
    outputValue: 37,
  };
  const message = 'inputReserve (a number) must be positive';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice too much output', t => {
  const input = {
    outputReserve: 1024,
    inputReserve: 1132,
    outputValue: 20923,
  };
  const message =
    'outputReserve (a number) must be greater than outputValue (a number)';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice too much output 2', t => {
  const input = {
    outputReserve: 345,
    inputReserve: 1132,
    outputValue: 345,
  };
  const message =
    'outputReserve (a number) must be greater than outputValue (a number)';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice big product', t => {
  const input = {
    outputReserve: 100000000,
    inputReserve: 100000000,
    outputValue: 1000,
  };
  const expectedOutput = 1003;
  testGetOutputPrice(t, input, expectedOutput);
});
