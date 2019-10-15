import { test } from 'tape-promise/tape';

import {
  isOfferSafeForPlayer,
  isOfferSafeForAll,
} from '../../../../core/zoe/zoe/isOfferSafe';
import { setup } from './setupBasicMints';

// The player must have offerDesc for each assay
test('isOfferSafeForPlayer - empty offerDesc', t => {
  try {
    const { extentOps } = setup();
    const offerDesc = [];
    const extents = [8, 6, 7];

    t.throws(
      _ => isOfferSafeForPlayer(extentOps, offerDesc, extents),
      'extentOps, offerDesc, and extents must be arrays of the same length',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The extents array must have an item for each assay/rule
test('isOfferSafeForPlayer - empty extents', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'wantExactly', assetDesc: descOps[0].make(8) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(6) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(7) },
    ];
    const extents = [];

    t.throws(
      _ => isOfferSafeForPlayer(extentOps, offerDesc, extents),
      'extentOps, offerDesc, and extents must be arrays of the same length',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player puts in something and gets exactly what they wanted,
// with no refund
test('isOfferSafeForPlayer - gets wantExactly, with offerExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(8) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(6) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(7) },
    ];
    const extents = [0, 6, 7];

    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player gets exactly what they wanted, with no 'have'
test('isOfferSafeForPlayer - gets wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'wantExactly', assetDesc: descOps[0].make(8) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(6) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(7) },
    ];
    const extents = [8, 6, 7];

    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player gets more than what they wanted, with no 'have'. Note:
// This returns 'true' counterintuitively because no 'have' assetDesc was
// specified and none were given back, so the refund condition was
// fulfilled.
test('isOfferSafeForPlayer - gets wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'wantExactly', assetDesc: descOps[0].make(8) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(6) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(7) },
    ];
    const extents = [9, 6, 7];

    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with a 'wantExactly'
test(`isOfferSafeForPlayer - gets offerExactly, doesn't get wantExactly`, t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(1) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(2) },
      { rule: 'offerExactly', assetDesc: descOps[2].make(3) },
    ];
    const extents = [1, 0, 3];

    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with no 'wantExactly'
test('isOfferSafeForPlayer - gets offerExactly, no wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(1) },
      { rule: 'offerExactly', assetDesc: descOps[1].make(2) },
      { rule: 'offerExactly', assetDesc: descOps[2].make(3) },
    ];
    const extents = [1, 2, 3];

    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets a refund *and* winnings. This is 'offer safe'.
test('isOfferSafeForPlayer - refund and winnings', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(3) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(3) },
    ];
    const extents = [2, 3, 3];
    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantExactly
test('isOfferSafeForPlayer - more than wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(3) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(4) },
    ];
    const extents = [0, 3, 5];
    t.notOk(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantAtLeast
test('isOfferSafeForPlayer - more than wantAtLeast', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'wantAtLeast', assetDesc: descOps[0].make(2) },
      { rule: 'wantAtLeast', assetDesc: descOps[1].make(3) },
      { rule: 'wantAtLeast', assetDesc: descOps[2].make(4) },
    ];
    const extents = [2, 6, 7];
    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in
test('isOfferSafeForPlayer - more than offerExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'offerExactly', assetDesc: descOps[1].make(3) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(4) },
    ];
    const extents = [5, 6, 8];
    t.notOk(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in, with no
// wantExactly. Note: This returns 'true' counterintuitively
// because no winnings were specified and none were given back.
test('isOfferSafeForPlayer - more than offerExactly, no wants', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'offerExactly', assetDesc: descOps[1].make(3) },
      { rule: 'offerExactly', assetDesc: descOps[2].make(4) },
    ];
    const extents = [5, 6, 8];
    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in, with 'offerAtMost'
test('isOfferSafeForPlayer - more than offerAtMost', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerAtMost', assetDesc: descOps[0].make(2) },
      { rule: 'offerAtMost', assetDesc: descOps[1].make(3) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(4) },
    ];
    const extents = [5, 3, 0];
    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantExactly
test('isOfferSafeForPlayer - less than wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(3) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(5) },
    ];
    const extents = [0, 2, 1];
    t.notOk(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantAtLeast
test('isOfferSafeForPlayer - less than wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'wantAtLeast', assetDesc: descOps[1].make(3) },
      { rule: 'wantAtLeast', assetDesc: descOps[2].make(9) },
    ];
    const extents = [0, 2, 1];
    t.notOk(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded less than they put in
test('isOfferSafeForPlayer - less than wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'wantAtLeast', assetDesc: descOps[1].make(3) },
      { rule: 'wantAtLeast', assetDesc: descOps[2].make(3) },
    ];
    const extents = [1, 0, 0];
    t.notOk(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForPlayer - empty arrays', t => {
  try {
    const { extentOps } = setup();
    const offerDesc = [];
    const extents = [];
    t.throws(
      () => isOfferSafeForPlayer(extentOps, offerDesc, extents),
      /extentOps, the offer description, and extents must be arrays of the same length/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForPlayer - null for some assays', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      null,
      { rule: 'offerExactly', assetDesc: descOps[2].make(4) },
    ];
    const extents = [5, 6, 8];
    t.ok(isOfferSafeForPlayer(extentOps, offerDesc, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// All users get exactly what they wanted
test('isOfferSafeForAll - get wantExactly', t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(3) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(3) },
    ];

    const offerMatrix = [offerDesc, offerDesc, offerDesc];
    const extents = [0, 3, 3];
    const extentsMatrix = [extents, extents, extents];
    t.ok(isOfferSafeForAll(extentOps, offerMatrix, extentsMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// One user doesn't get what they wanted
test(`isOfferSafeForAll - get wantExactly - one doesn't`, t => {
  try {
    const { extentOps, descOps } = setup();
    const offerDesc = [
      { rule: 'offerExactly', assetDesc: descOps[0].make(2) },
      { rule: 'wantExactly', assetDesc: descOps[1].make(3) },
      { rule: 'wantExactly', assetDesc: descOps[2].make(3) },
    ];

    const offerMatrix = [offerDesc, offerDesc, offerDesc];
    const extents = [0, 3, 3];
    const unsatisfiedUserextents = [
      descOps[0].make(0),
      descOps[1].make(3),
      descOps[2].make(2),
    ];
    const extentsMatrix = [extents, extents, unsatisfiedUserextents];
    t.notOk(isOfferSafeForAll(extentOps, offerMatrix, extentsMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
