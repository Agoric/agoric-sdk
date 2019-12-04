import { test } from 'tape-promise/tape';

import { areRightsConserved, transpose } from '../../areRightsConserved';
import { setup } from './setupBasicMints';

test('transpose', t => {
  try {
    t.deepEquals(
      transpose([
        [1, 2, 3],
        [4, 5, 6],
      ]),
      [
        [1, 4],
        [2, 5],
        [3, 6],
      ],
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// rights are conserved for Nat extents
test(`areRightsConserved - true for nat extents`, t => {
  try {
    const { extentOps } = setup();
    const oldExtents = [
      [0, 1, 0],
      [4, 1, 0],
      [6, 3, 0],
    ];
    const newExtents = [
      [1, 2, 0],
      [3, 1, 0],
      [6, 2, 0],
    ];

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
    const oldExtents = [
      [0, 1, 4],
      [4, 1, 0],
      [6, 3, 0],
    ];
    const newExtents = [
      [1, 2, 0],
      [3, 1, 0],
      [6, 2, 0],
    ];

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

// TODO: add tests for non-Nat extents
