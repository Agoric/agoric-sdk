// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeConstProductBC } from '../../../../src/contracts/helpers/bondingCurves';
import { setup } from '../../setupBasicMints2';

const testGetPrice = (t, setupMints, input, output) => {
  const { moolaR, simoleanR } = setupMints;
  const zoe = harden({});

  const { getPrice } = makeConstProductBC(zoe);

  const tokenRoleNames = ['TokenA', 'TokenB'];
  const amountMathsObj = harden({
    TokenA: moolaR.amountMath,
    TokenB: simoleanR.amountMath,
  });

  const { amountOut, newPoolAmounts } = getPrice(
    tokenRoleNames,
    amountMathsObj,
    input.poolAmounts,
    input.amountIn,
  );

  t.deepEquals(amountOut, output.amountOut, 'amountOut');
  t.deepEquals(newPoolAmounts, output.newPoolAmounts, 'newPoolAmounts');
};

test.only('getPrice ok 1', t => {
  const setupMints = setup();
  const { moola, simoleans } = setupMints;
  try {
    const input = {
      poolAmounts: {
        TokenA: moola(0),
        TokenB: simoleans(0),
      },
      amountIn: {
        TokenA: moola(1),
      },
    };
    const expectedOutput = {
      newPoolAmounts: {
        TokenA: moola(1),
        TokenB: simoleans(0),
      },
      amountOut: {
        TokenB: simoleans(0),
      },
    };
    testGetPrice(t, setupMints, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('getPrice ok 2', t => {
  try {
    const input = {
      xReserve: 5984,
      yReserve: 3028,
      xIn: 1398,
      yIn: 0,
    };
    const expectedOutput1 = {
      xReserve: 7382,
      yReserve: 2456,
      xOut: 0,
      yOut: 572,
    };
    testGetPrice(t, input, expectedOutput1);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('getPrice ok 3', t => {
  try {
    const input = { xReserve: 8160, yReserve: 7743, xIn: 6635, yIn: 0 };
    const expectedOutput1 = {
      xReserve: 14795,
      yReserve: 4277,
      xOut: 0,
      yOut: 3466,
    };
    testGetPrice(t, input, expectedOutput1);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('getPrice reverse x and y amounts', t => {
  try {
    const input = { xReserve: 7743, yReserve: 8160, xIn: 0, yIn: 6635 };
    const expectedOutput1 = {
      xReserve: 4277,
      yReserve: 14795,
      xOut: 3466,
      yOut: 0,
    };
    testGetPrice(t, input, expectedOutput1);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('getPrice ok 4', t => {
  try {
    const input = { xReserve: 10, yReserve: 10, xIn: 0, yIn: 1000 };
    const expectedOutput1 = {
      xReserve: 1,
      yReserve: 1010,
      xOut: 9,
      yOut: 0,
    };
    testGetPrice(t, input, expectedOutput1);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
