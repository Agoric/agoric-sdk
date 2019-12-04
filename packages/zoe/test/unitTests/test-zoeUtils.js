import { test } from 'tape-promise/tape';

import { toUnitsMatrix, makeEmptyExtents } from '../../zoeUtils';
import { setup } from './setupBasicMints';

test('toUnitsMatrix', t => {
  try {
    const { extentOps, labels, unitOps } = setup();
    const matrix = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    t.deepEquals(toUnitsMatrix(extentOps, labels, matrix), [
      [unitOps[0].make(1), unitOps[1].make(2), unitOps[2].make(3)],
      [unitOps[0].make(4), unitOps[1].make(5), unitOps[2].make(6)],
    ]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('makeEmptyExtents', t => {
  try {
    const { extentOps } = setup();
    t.deepEquals(makeEmptyExtents(extentOps), [0, 0, 0]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
