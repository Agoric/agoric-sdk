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
    inputReserve: BigInt(0),
    outputReserve: BigInt(0),
    inputValue: BigInt(1),
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
    inputReserve: BigInt(8160),
    outputReserve: BigInt(7743),
    inputValue: BigInt(6635),
  };
  const expectedOutput = BigInt(3466);
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
    inputReserve: BigInt(100),
    outputReserve: BigInt(50),
    inputValue: BigInt(17),
  };
  const expectedOutput = BigInt(7);
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice ok 6', t => {
  const input = {
    outputReserve: BigInt(117),
    inputReserve: BigInt(43),
    inputValue: BigInt(7),
  };
  const expectedOutput = BigInt(16);
  testGetPrice(t, input, expectedOutput);
});

test('getInputPrice negative', t => {
  const input = {
    outputReserve: BigInt(117),
    inputReserve: BigInt(43),
    inputValue: BigInt(-7),
  };
  const message = 'inputValue (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice bad reserve 1', t => {
  const input = {
    outputReserve: BigInt(0),
    inputReserve: BigInt(43),
    inputValue: BigInt(347),
  };
  const message = 'outputReserve (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice bad reserve 2', t => {
  const input = {
    outputReserve: BigInt(50),
    inputReserve: BigInt(0),
    inputValue: BigInt(828),
  };
  const message = 'inputReserve (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice zero input', t => {
  const input = {
    outputReserve: BigInt(50),
    inputReserve: BigInt(320),
    inputValue: BigInt(0),
  };
  const message = 'inputValue (a number) must be positive';
  getInputPricethrows(t, input, message);
});

test('getInputPrice big product', t => {
  const input = {
    outputReserve: BigInt(100000000),
    inputReserve: BigInt(100000000),
    inputValue: BigInt(1000),
  };
  const expectedOutput = BigInt(996);
  testGetPrice(t, input, expectedOutput);
});

test('calculate value to mint - positive supply 1', t => {
  const res = calcLiqValueToMint(BigInt(20), BigInt(30), BigInt(5));
  t.is(
    res,
    (BigInt(20) * BigInt(30)) / BigInt(5),
    'When supply is present, floor(x*y/z)',
  );
});

test('calculate value to mint - positive supply 2', t => {
  const res = calcLiqValueToMint(BigInt(5), BigInt(8), BigInt(7));
  t.is(res, BigInt(5), 'When supply is present, floor(x*y/z)');
});

test('calculate value to mint - no supply', t => {
  const res = calcLiqValueToMint(BigInt(0), BigInt(30), BigInt(5));
  t.is(res, BigInt(30), 'When the supply is empty, return inputValue');
});

test('getOutputPrice ok', t => {
  const input = {
    outputReserve: BigInt(117),
    inputReserve: BigInt(43),
    outputValue: BigInt(37),
  };
  const expectedOutput = BigInt(20);
  testGetOutputPrice(t, input, expectedOutput);
});

test('getOutputPrice zero output reserve', t => {
  const input = {
    outputReserve: BigInt(0),
    inputReserve: BigInt(43),
    outputValue: BigInt(37),
  };
  const message = 'outputReserve (a number) must be positive';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice zero input reserve', t => {
  const input = {
    outputReserve: BigInt(92),
    inputReserve: BigInt(0),
    outputValue: BigInt(37),
  };
  const message = 'inputReserve (a number) must be positive';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice too much output', t => {
  const input = {
    outputReserve: BigInt(1024),
    inputReserve: BigInt(1132),
    outputValue: BigInt(20923),
  };
  const message =
    'outputReserve (a number) must be greater than outputValue (a number)';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice too much output 2', t => {
  const input = {
    outputReserve: BigInt(345),
    inputReserve: BigInt(1132),
    outputValue: BigInt(345),
  };
  const message =
    'outputReserve (a number) must be greater than outputValue (a number)';
  getOutputPricethrows(t, input, message);
});

test('getOutputPrice big product', t => {
  const input = {
    outputReserve: BigInt(100000000),
    inputReserve: BigInt(100000000),
    outputValue: BigInt(1000),
  };
  const expectedOutput = BigInt(1004);
  testGetOutputPrice(t, input, expectedOutput);
});

test('getOutputPrice minimum price', t => {
  const input = {
    outputReserve: BigInt(10),
    inputReserve: BigInt(1),
    outputValue: BigInt(1),
  };
  const expectedOutput = BigInt(1);
  testGetOutputPrice(t, input, expectedOutput);
});
