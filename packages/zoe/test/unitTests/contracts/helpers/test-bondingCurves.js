import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeConstProductBC } from '../../../../src/contracts/helpers/bondingCurves';
import { setup } from '../../setupBasicMints';

const testGetPrice = (t, input, output) => {
  const { issuers, moola, simoleans } = setup();
  const zoe = harden({
    getAmountMathForIssuers: issuersArray =>
      issuersArray.map(issuer => issuer.getAmountMath()),
  });

  const { getPrice } = makeConstProductBC(zoe, issuers);
  const poolAmountsArray = [moola(input.xReserve), simoleans(input.yReserve)];
  let amountIn;
  let expectedAmountsOut;
  if (input.xIn > 0) {
    amountIn = moola(input.xIn);
    expectedAmountsOut = simoleans(output.yOut);
  } else {
    amountIn = simoleans(input.yIn);
    expectedAmountsOut = moola(output.xOut);
  }

  const { amountOut, newPoolAmountsArray } = getPrice(
    poolAmountsArray,
    amountIn,
  );

  t.deepEquals(amountOut, expectedAmountsOut, 'amountOut');
  t.deepEquals(
    newPoolAmountsArray,
    [moola(output.xReserve), simoleans(output.yReserve)],
    'newPoolAmountsArray',
  );
};

test('getPrice ok 1', t => {
  try {
    const input = {
      xReserve: 0,
      yReserve: 0,
      xIn: 1,
      yIn: 0,
    };
    const expectedOutput1 = {
      xReserve: 1,
      yReserve: 0,
      xOut: 0,
      yOut: 0,
    };
    testGetPrice(t, input, expectedOutput1);
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
