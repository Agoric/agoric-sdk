import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeGetPrice } from '../../../../contracts/helpers/bondingCurves';
import { setup } from '../../setupBasicMints';

const testGetPrice = (t, input, output) => {
  const { assays, moola, simoleans } = setup();
  const zoe = harden({
    getUnitOpsForAssays: assaysArray =>
      assaysArray.map(assay => assay.getUnitOps()),
  });
  // poolUnitsArray, unitsIn, feeInTenthOfPercent = 3
  const getPrice = makeGetPrice(zoe, assays);
  const poolUnitsArray = [moola(input.xReserve), simoleans(input.yReserve)];
  let unitsIn;
  let expectedUnitsOut;
  if (input.xIn > 0) {
    unitsIn = moola(input.xIn);
    expectedUnitsOut = simoleans(output.yOut);
  } else {
    unitsIn = simoleans(input.yIn);
    expectedUnitsOut = moola(output.xOut);
  }

  const { unitsOut, newPoolUnitsArray } = getPrice(poolUnitsArray, unitsIn);

  t.deepEquals(unitsOut, expectedUnitsOut, 'unitsOut');
  t.deepEquals(
    newPoolUnitsArray,
    [moola(output.xReserve), simoleans(output.yReserve)],
    'newPoolUnitsArray',
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
