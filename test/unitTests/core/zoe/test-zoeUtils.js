import { test } from 'tape-promise/tape';

import {
  toAssetDescMatrix,
  makeEmptyExtents,
} from '../../../../core/zoe/zoe/zoeUtils';
import { setup } from './setupBasicMints';

test('toAssetDescMatrix', t => {
  try {
    const { extentOps, labels, assetDescOps } = setup();
    const matrix = [[1, 2, 3], [4, 5, 6]];
    t.deepEquals(toAssetDescMatrix(extentOps, labels, matrix), [
      [
        assetDescOps[0].make(1),
        assetDescOps[1].make(2),
        assetDescOps[2].make(3),
      ],
      [
        assetDescOps[0].make(4),
        assetDescOps[1].make(5),
        assetDescOps[2].make(6),
      ],
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
