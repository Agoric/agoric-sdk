// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import test from 'ava';

import {
  getInputPrice,
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

// If these tests of `getInputPrice` fail, it would indicate that we have
// diverged from the calculation in the Uniswap paper.
test('getInputPrice ok 1', t => {
  const input = {
    inputReserve: 0,
    outputReserve: 0,
    inputValue: 1,
  };
  const expectedOutput = 0;
  testGetPrice(t, input, expectedOutput);
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

test('getInputPrice reverse x and y amounts', t => {
  // Note: this is now the same test as the one above because we are
  // only using values
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
