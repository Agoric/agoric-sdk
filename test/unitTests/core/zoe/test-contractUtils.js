import { test } from 'tape-promise/tape';

import {
  transpose,
  mapArrayOnMatrix,
  offerEqual,
  toAssetDescMatrix,
  makeEmptyExtents,
  vectorWith,
  makeAssetDesc,
  makeOfferDesc,
} from '../../../../core/zoe/contractUtils';
import { setup } from './setupBasicMints';

test('transpose', t => {
  try {
    t.deepEquals(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mapArrayOnMatrix', t => {
  try {
    const matrix = [[1, 2, 3], [4, 5, 6]];
    const add2 = x => x + 2;
    const subtract4 = x => x - 4;
    const mult5 = x => x * 5;
    const arrayF = [add2, subtract4, mult5];
    t.deepEquals(mapArrayOnMatrix(matrix, arrayF), [[3, -2, 15], [6, 1, 30]]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

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

test('offerEqual - offers are equal', t => {
  const { assays, extentOps } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    t.ok(offerEqual(extentOps, offer1, offer1));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - throws bc offers have different assays', t => {
  const { assays, extentOps } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[1].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[0].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    t.notOk(offerEqual(extentOps, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - returns false bc different extent', t => {
  const { assays, extentOps } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(4),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    t.notOk(offerEqual(extentOps, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - returns false bc different rule', t => {
  const { assays, extentOps } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'offerExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    t.notOk(offerEqual(extentOps, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - wantExactly vs wantAtLeast - returns false', t => {
  const { assays, extentOps } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
      {
        rule: 'wantAtLeast',
        assetDesc: assays[2].makeAssetDesc(7),
      },
    ];
    t.notOk(offerEqual(extentOps, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('vectorWith', t => {
  try {
    const { extentOps } = setup();
    const leftExtents = [4, 5, 6];
    const rightExtents = [3, 5, 10];
    t.deepEquals(vectorWith(extentOps, leftExtents, rightExtents), [7, 10, 16]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('makeAssetDesc', t => {
  try {
    const { extentOps, labels, assays, mints } = setup();
    const assetDesc = makeAssetDesc(extentOps[0], labels[0], 10);
    t.deepEquals(assetDesc, assays[0].makeAssetDesc(10));
    const purse = mints[0].mint(assetDesc);
    t.deepEquals(purse.getBalance(), assetDesc);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('makeOfferDesc', t => {
  try {
    const { extentOps, labels, assays } = setup();
    const rules = ['offerExactly', 'offerAtMost', 'wantAtLeast'];
    const extents = [4, 6, 2];
    const actualOfferDesc = makeOfferDesc(extentOps, labels, rules, extents);

    const expectedOfferDesc = [
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(4),
      },
      {
        rule: 'offerAtMost',
        assetDesc: assays[1].makeAssetDesc(6),
      },
      {
        rule: 'wantAtLeast',
        assetDesc: assays[2].makeAssetDesc(2),
      },
    ];
    t.deepEquals(actualOfferDesc, expectedOfferDesc);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
