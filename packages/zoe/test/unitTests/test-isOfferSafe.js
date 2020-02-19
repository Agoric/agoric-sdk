import { test } from 'tap';

import { isOfferSafeForOffer, isOfferSafeForAll } from '../../src/isOfferSafe';
import { setup } from './setupBasicMints';

// The player must have payoutRules for each assay
test('isOfferSafeForOffer - empty payoutRules', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [];
    const units = [moola(8), simoleans(6), bucks(7)];

    t.throws(
      _ => isOfferSafeForOffer(unitOps, payoutRules, units),
      /unitOpsArray, payoutRules, and units must be arrays of the same length/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The units array must have an item for each assay/rule
test('isOfferSafeForOffer - empty units', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', units: moola(8) },
      { kind: 'wantAtLeast', units: simoleans(6) },
      { kind: 'wantAtLeast', units: bucks(7) },
    ];
    const units = [];

    t.throws(
      _ => isOfferSafeForOffer(unitOps, payoutRules, units),
      'unitOpsArray, payoutRules, and units must be arrays of the same length',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player puts in something and gets exactly what they wanted,
// with no refund
test('isOfferSafeForOffer - gets want exactly', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(8) },
      { kind: 'wantAtLeast', units: simoleans(6) },
      { kind: 'wantAtLeast', units: bucks(7) },
    ];
    const units = [moola(0), simoleans(6), bucks(7)];

    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player gets exactly what they wanted, with no 'offer'
test('isOfferSafeForOffer - gets wantAtLeast', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', units: moola(8) },
      { kind: 'wantAtLeast', units: simoleans(6) },
      { kind: 'wantAtLeast', units: bucks(7) },
    ];
    const units = [moola(8), simoleans(6), bucks(7)];

    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
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
test('isOfferSafeForOffer - gets wantAtLeast', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', units: moola(8) },
      { kind: 'wantAtLeast', units: simoleans(6) },
      { kind: 'wantAtLeast', units: bucks(7) },
    ];
    const units = [moola(9), simoleans(6), bucks(7)];

    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with a 'wantAtLeast'
test(`isOfferSafeForOffer - gets offerAtMost, doesn't get wantAtLeast`, t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(1) },
      { kind: 'wantAtLeast', units: simoleans(2) },
      { kind: 'offerAtMost', units: bucks(3) },
    ];
    const units = [moola(1), simoleans(0), bucks(3)];

    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with no 'wantAtLeast'
test('isOfferSafeForOffer - gets offerAtMost, no wantAtLeast', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(1) },
      { kind: 'offerAtMost', units: simoleans(2) },
      { kind: 'offerAtMost', units: bucks(3) },
    ];
    const units = [moola(1), simoleans(2), bucks(3)];

    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets a refund *and* winnings. This is 'offer safe'.
test('isOfferSafeForOffer - refund and winnings', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(3) },
    ];
    const units = [moola(2), simoleans(3), bucks(3)];
    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted
test('isOfferSafeForOffer - more than wantAtLeast', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(4) },
    ];
    const units = [moola(0), simoleans(3), bucks(5)];
    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantAtLeast
test('isOfferSafeForOffer - more than wantAtLeast (no offerAtMost)', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(4) },
    ];
    const units = [moola(2), simoleans(6), bucks(7)];
    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in
test('isOfferSafeForOffer - more than offerAtMost', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'offerAtMost', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(4) },
    ];
    const units = [moola(5), simoleans(6), bucks(8)];
    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in, with no
// wantAtLeast. Note: This returns 'true' counterintuitively
// because no winnings were specified and none were given back.
test('isOfferSafeForOffer - more than offerAtMost, no wants', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'offerAtMost', units: simoleans(3) },
      { kind: 'offerAtMost', units: bucks(4) },
    ];
    const units = [moola(5), simoleans(6), bucks(8)];
    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in, with 'offer'
test('isOfferSafeForOffer - more than offer', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'offerAtMost', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(4) },
    ];
    const units = [moola(5), simoleans(3), bucks(0)];
    t.ok(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantAtLeast
test('isOfferSafeForOffer - less than wantAtLeast', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(5) },
    ];
    const units = [moola(0), simoleans(2), bucks(1)];
    t.notOk(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantAtLeast
test('isOfferSafeForOffer - less than wantAtLeast', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(9) },
    ];
    const units = [moola(0), simoleans(2), bucks(1)];
    t.notOk(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded less than they put in
test('isOfferSafeForOffer - less than wantAtLeast', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(3) },
    ];
    const units = [moola(1), simoleans(0), bucks(0)];
    t.notOk(isOfferSafeForOffer(unitOps, payoutRules, units));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForOffer - empty arrays', t => {
  try {
    const { unitOps } = setup();
    const payoutRules = [];
    const units = [];
    t.throws(
      () => isOfferSafeForOffer(unitOps, payoutRules, units),
      /unitOpsArray, payoutRules, and units must be arrays of the same length/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForOffer - null for some assays', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      null,
      { kind: 'offerAtMost', units: bucks(4) },
    ];
    const units = [moola(5), simoleans(6), bucks(8)];
    t.throws(
      () => isOfferSafeForOffer(unitOps, payoutRules, units),
      /payoutRule must be specified/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// All users get exactly what they wanted
test('isOfferSafeForAll - All users get what they wanted', t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(3) },
    ];

    const offerMatrix = [payoutRules, payoutRules, payoutRules];
    const units = [moola(0), simoleans(3), bucks(3)];
    const unitsMatrix = [units, units, units];
    t.ok(isOfferSafeForAll(unitOps, offerMatrix, unitsMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test(`isOfferSafeForAll - One user doesn't get what they wanted`, t => {
  try {
    const { unitOps, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', units: moola(2) },
      { kind: 'wantAtLeast', units: simoleans(3) },
      { kind: 'wantAtLeast', units: bucks(3) },
    ];

    const offerMatrix = [payoutRules, payoutRules, payoutRules];
    const units = [moola(0), simoleans(3), bucks(3)];
    const unsatisfiedUserUnits = [moola(0), simoleans(3), bucks(2)];
    const unitsMatrix = [units, units, unsatisfiedUserUnits];
    t.notOk(isOfferSafeForAll(unitOps, offerMatrix, unitsMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
