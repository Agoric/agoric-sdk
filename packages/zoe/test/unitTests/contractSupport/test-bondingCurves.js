// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { getCurrentPrice } from '../../../src/contractSupport';

const testGetPrice = (t, input, expectedOutput) => {
  const output = getCurrentPrice(input);
  t.deepEquals(output, expectedOutput);
};

// If these tests of `getCurrentPrice` fail, it would indicate that we have
// diverged from the calculation in the Uniswap paper.
test('getCurrentPrice ok 1', t => {
  t.plan(1);
  try {
    const input = {
      inputReserve: 0,
      outputReserve: 0,
      inputExtent: 1,
    };
    const expectedOutput = {
      outputExtent: 0,
      newInputReserve: 1,
      newOutputReserve: 0,
    };
    testGetPrice(t, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  }
});

test('getCurrentPrice ok 2', t => {
  t.plan(1);
  try {
    const input = {
      inputReserve: 5984,
      outputReserve: 3028,
      inputExtent: 1398,
    };
    const expectedOutput = {
      outputExtent: 572,
      newInputReserve: 7382,
      newOutputReserve: 2456,
    };
    testGetPrice(t, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  }
});

test('getCurrentPrice ok 3', t => {
  t.plan(1);
  try {
    const input = {
      inputReserve: 8160,
      outputReserve: 7743,
      inputExtent: 6635,
    };
    const expectedOutput = {
      outputExtent: 3466,
      newInputReserve: 14795,
      newOutputReserve: 4277,
    };
    testGetPrice(t, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  }
});

test('getCurrentPrice reverse x and y amounts', t => {
  t.plan(1);
  try {
    // Note: this is now the same test as the one above because we are
    // only using extents
    const input = {
      inputReserve: 8160,
      outputReserve: 7743,
      inputExtent: 6635,
    };
    const expectedOutput = {
      outputExtent: 3466,
      newInputReserve: 14795,
      newOutputReserve: 4277,
    };
    testGetPrice(t, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  }
});

test('getCurrentPrice ok 4', t => {
  t.plan(1);
  try {
    const input = {
      inputReserve: 10,
      outputReserve: 10,
      inputExtent: 1000,
    };
    const expectedOutput = {
      outputExtent: 9,
      newInputReserve: 1010,
      newOutputReserve: 1,
    };
    testGetPrice(t, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  }
});

test('getCurrentPrice ok 5', t => {
  t.plan(1);
  try {
    const input = {
      inputReserve: 100,
      outputReserve: 50,
      inputExtent: 17,
    };
    const expectedOutput = {
      outputExtent: 7,
      newInputReserve: 117,
      newOutputReserve: 43,
    };
    testGetPrice(t, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  }
});

test('getCurrentPrice ok 6', t => {
  t.plan(1);
  try {
    const input = {
      outputReserve: 117,
      inputReserve: 43,
      inputExtent: 7,
    };
    const expectedOutput = {
      outputExtent: 16,
      newInputReserve: 50,
      newOutputReserve: 101,
    };
    testGetPrice(t, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  }
});
