import { test } from 'tape-promise/tape';

import { areRightsConserved } from '../../../../core/zoe/zoe/areRightsConserved';
import { setup } from './setupBasicMints';

// rights are conserved for Nat extents
test(`areRightsConserved - true for nat extents`, t => {
  try {
    const { extentOps } = setup();
    const oldExtents = [[0, 1, 0], [4, 1, 0], [6, 3, 0]];
    const newExtents = [[1, 2, 0], [3, 1, 0], [6, 2, 0]];

    t.ok(areRightsConserved(extentOps, oldExtents, newExtents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// rights are *not* conserved for Nat extents
test(`areRightsConserved - false for nat extents`, t => {
  try {
    const { extentOps } = setup();
    const oldExtents = [[0, 1, 4], [4, 1, 0], [6, 3, 0]];
    const newExtents = [[1, 2, 0], [3, 1, 0], [6, 2, 0]];

    t.notOk(areRightsConserved(extentOps, oldExtents, newExtents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test(`areRightsConserved - empty arrays`, t => {
  try {
    const { extentOps } = setup();
    const oldExtents = [[], [], []];
    const newExtents = [[], [], []];

    t.ok(areRightsConserved(extentOps, oldExtents, newExtents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
