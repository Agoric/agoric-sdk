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

test('getPrice ok 1', t => {
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
  const setupMints = setup();
  const { moola, simoleans } = setupMints;
  try {
    const input = {
      poolAmounts: {
        TokenA: moola(5984),
        TokenB: simoleans(3028),
      },
      amountIn: {
        TokenA: moola(1398),
      },
    };
    const expectedOutput = {
      newPoolAmounts: {
        TokenA: moola(7382),
        TokenB: simoleans(2456),
      },
      amountOut: {
        TokenB: simoleans(572),
      },
    };
    testGetPrice(t, setupMints, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('getPrice ok 3', t => {
  try {
    const setupMints = setup();
    const { moola, simoleans } = setupMints;
    const input = {
      poolAmounts: { TokenA: moola(8160), TokenB: simoleans(7743) },
      amountIn: { TokenA: moola(6635) },
    };
    const expectedOutput = {
      newPoolAmounts: { TokenA: moola(14795), TokenB: simoleans(4277) },
      amountOut: { TokenB: simoleans(3466) },
    };
    testGetPrice(t, setupMints, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('getPrice reverse x and y amounts', t => {
  try {
    const setupMints = setup();
    const { moola, simoleans } = setupMints;
    const input = {
      poolAmounts: { TokenA: moola(7743), TokenB: simoleans(8160) },
      amountIn: { TokenB: simoleans(6635) },
    };
    const expectedOutput = {
      newPoolAmounts: { TokenA: moola(4277), TokenB: simoleans(14795) },
      amountOut: { TokenA: moola(3466) },
    };
    testGetPrice(t, setupMints, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('getPrice ok 4', t => {
  try {
    const setupMints = setup();
    const { moola, simoleans } = setupMints;
    const input = {
      poolAmounts: { TokenA: moola(10), TokenB: simoleans(10) },
      amountIn: { TokenB: simoleans(1000) },
    };
    const expectedOutput = {
      newPoolAmounts: { TokenA: moola(1), TokenB: simoleans(1010) },
      amountOut: { TokenA: moola(9) },
    };
    testGetPrice(t, setupMints, input, expectedOutput);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
