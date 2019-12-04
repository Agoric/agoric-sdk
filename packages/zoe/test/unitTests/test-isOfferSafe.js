import { test } from 'tape-promise/tape';

import { isOfferSafeForOffer, isOfferSafeForAll } from '../../isOfferSafe';
import { setup } from './setupBasicMints';

// The player must have payoutRules for each assay
test('isOfferSafeForOffer - empty payoutRules', t => {
  try {
    const { extentOps } = setup();
    const payoutRules = [];
    const extents = [8, 6, 7];

    t.throws(
      _ => isOfferSafeForOffer(extentOps, payoutRules, extents),
      'extentOps, payoutRules, and extents must be arrays of the same length',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The extents array must have an item for each assay/rule
test('isOfferSafeForOffer - empty extents', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'wantExactly', units: unitOps[0].make(8) },
      { kind: 'wantExactly', units: unitOps[1].make(6) },
      { kind: 'wantExactly', units: unitOps[2].make(7) },
    ];
    const extents = [];

    t.throws(
      _ => isOfferSafeForOffer(extentOps, payoutRules, extents),
      'extentOps, payoutRules, and extents must be arrays of the same length',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player puts in something and gets exactly what they wanted,
// with no refund
test('isOfferSafeForOffer - gets wantExactly, with offerExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(8) },
      { kind: 'wantExactly', units: unitOps[1].make(6) },
      { kind: 'wantExactly', units: unitOps[2].make(7) },
    ];
    const extents = [0, 6, 7];

    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player gets exactly what they wanted, with no 'offer'
test('isOfferSafeForOffer - gets wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'wantExactly', units: unitOps[0].make(8) },
      { kind: 'wantExactly', units: unitOps[1].make(6) },
      { kind: 'wantExactly', units: unitOps[2].make(7) },
    ];
    const extents = [8, 6, 7];

    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player gets more than what they wanted, with no 'offer' rule
// kind. Note: This returns 'true' counterintuitively because no
// 'offer' rule kind was specified and none were given back, so the
// refund condition was fulfilled trivially.
test('isOfferSafeForOffer - gets wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'wantExactly', units: unitOps[0].make(8) },
      { kind: 'wantExactly', units: unitOps[1].make(6) },
      { kind: 'wantExactly', units: unitOps[2].make(7) },
    ];
    const extents = [9, 6, 7];

    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with a 'wantExactly'
test(`isOfferSafeForOffer - gets offerExactly, doesn't get wantExactly`, t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(1) },
      { kind: 'wantExactly', units: unitOps[1].make(2) },
      { kind: 'offerExactly', units: unitOps[2].make(3) },
    ];
    const extents = [1, 0, 3];

    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with no 'wantExactly'
test('isOfferSafeForOffer - gets offerExactly, no wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(1) },
      { kind: 'offerExactly', units: unitOps[1].make(2) },
      { kind: 'offerExactly', units: unitOps[2].make(3) },
    ];
    const extents = [1, 2, 3];

    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets a refund *and* winnings. This is 'offer safe'.
test('isOfferSafeForOffer - refund and winnings', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'wantExactly', units: unitOps[1].make(3) },
      { kind: 'wantExactly', units: unitOps[2].make(3) },
    ];
    const extents = [2, 3, 3];
    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantExactly
test('isOfferSafeForOffer - more than wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'wantExactly', units: unitOps[1].make(3) },
      { kind: 'wantExactly', units: unitOps[2].make(4) },
    ];
    const extents = [0, 3, 5];
    t.notOk(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantAtLeast
test('isOfferSafeForOffer - more than wantAtLeast', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', units: unitOps[0].make(2) },
      { kind: 'wantAtLeast', units: unitOps[1].make(3) },
      { kind: 'wantAtLeast', units: unitOps[2].make(4) },
    ];
    const extents = [2, 6, 7];
    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in
test('isOfferSafeForOffer - more than offerExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'offerExactly', units: unitOps[1].make(3) },
      { kind: 'wantExactly', units: unitOps[2].make(4) },
    ];
    const extents = [5, 6, 8];
    t.notOk(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in, with no
// wantExactly. Note: This returns 'true' counterintuitively
// because no winnings were specified and none were given back.
test('isOfferSafeForOffer - more than offerExactly, no wants', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'offerExactly', units: unitOps[1].make(3) },
      { kind: 'offerExactly', units: unitOps[2].make(4) },
    ];
    const extents = [5, 6, 8];
    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in, with 'offerAtMost'
test('isOfferSafeForOffer - more than offerAtMost', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: unitOps[0].make(2) },
      { kind: 'offerAtMost', units: unitOps[1].make(3) },
      { kind: 'wantExactly', units: unitOps[2].make(4) },
    ];
    const extents = [5, 3, 0];
    t.ok(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantExactly
test('isOfferSafeForOffer - less than wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'wantExactly', units: unitOps[1].make(3) },
      { kind: 'wantExactly', units: unitOps[2].make(5) },
    ];
    const extents = [0, 2, 1];
    t.notOk(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantAtLeast
test('isOfferSafeForOffer - less than wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'wantAtLeast', units: unitOps[1].make(3) },
      { kind: 'wantAtLeast', units: unitOps[2].make(9) },
    ];
    const extents = [0, 2, 1];
    t.notOk(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded less than they put in
test('isOfferSafeForOffer - less than wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'wantAtLeast', units: unitOps[1].make(3) },
      { kind: 'wantAtLeast', units: unitOps[2].make(3) },
    ];
    const extents = [1, 0, 0];
    t.notOk(isOfferSafeForOffer(extentOps, payoutRules, extents));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForOffer - empty arrays', t => {
  try {
    const { extentOps } = setup();
    const payoutRules = [];
    const extents = [];
    t.throws(
      () => isOfferSafeForOffer(extentOps, payoutRules, extents),
      /extentOpsArray, the offer description, and extents must be arrays of the same length/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForOffer - null for some assays', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      null,
      { kind: 'offerExactly', units: unitOps[2].make(4) },
    ];
    const extents = [5, 6, 8];
    t.throws(
      () => isOfferSafeForOffer(extentOps, payoutRules, extents),
      /payoutRule must be specified/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// All users get exactly what they wanted
test('isOfferSafeForAll - get wantExactly', t => {
  try {
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'wantExactly', units: unitOps[1].make(3) },
      { kind: 'wantExactly', units: unitOps[2].make(3) },
    ];

    const offerMatrix = [payoutRules, payoutRules, payoutRules];
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
    const { extentOps, unitOps } = setup();
    const payoutRules = [
      { kind: 'offerExactly', units: unitOps[0].make(2) },
      { kind: 'wantExactly', units: unitOps[1].make(3) },
      { kind: 'wantExactly', units: unitOps[2].make(3) },
    ];

    const offerMatrix = [payoutRules, payoutRules, payoutRules];
    const extents = [0, 3, 3];
    const unsatisfiedUserextents = [
      unitOps[0].make(0),
      unitOps[1].make(3),
      unitOps[2].make(2),
    ];
    const extentsMatrix = [extents, extents, unsatisfiedUserextents];
    t.notOk(isOfferSafeForAll(extentOps, offerMatrix, extentsMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
