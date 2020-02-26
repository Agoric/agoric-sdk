// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { isOfferSafeForOffer, isOfferSafeForAll } from '../../src/isOfferSafe';
import { setup } from './setupBasicMints';

// The player must have payoutRules for each issuer
test('isOfferSafeForOffer - empty payoutRules', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [];
    const amounts = [moola(8), simoleans(6), bucks(7)];

    t.throws(
      _ => isOfferSafeForOffer(amountMaths, payoutRules, amounts),
      /amountMaths, payoutRules, and amounts must be arrays of the same length/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The amount array must have an item for each issuer/rule
test('isOfferSafeForOffer - empty amount', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', amount: moola(8) },
      { kind: 'wantAtLeast', amount: simoleans(6) },
      { kind: 'wantAtLeast', amount: bucks(7) },
    ];
    const amount = [];

    t.throws(
      _ => isOfferSafeForOffer(amountMaths, payoutRules, amount),
      /amountMaths, payoutRules, and amounts must be arrays of the same length/,
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
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(8) },
      { kind: 'wantAtLeast', amount: simoleans(6) },
      { kind: 'wantAtLeast', amount: bucks(7) },
    ];
    const amount = [moola(0), simoleans(6), bucks(7)];

    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player gets exactly what they wanted, with no 'offer'
test('isOfferSafeForOffer - gets wantAtLeast', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', amount: moola(8) },
      { kind: 'wantAtLeast', amount: simoleans(6) },
      { kind: 'wantAtLeast', amount: bucks(7) },
    ];
    const amount = [moola(8), simoleans(6), bucks(7)];

    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
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
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', amount: moola(8) },
      { kind: 'wantAtLeast', amount: simoleans(6) },
      { kind: 'wantAtLeast', amount: bucks(7) },
    ];
    const amount = [moola(9), simoleans(6), bucks(7)];

    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with a 'wantAtLeast'
test(`isOfferSafeForOffer - gets offerAtMost, doesn't get wantAtLeast`, t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(1) },
      { kind: 'wantAtLeast', amount: simoleans(2) },
      { kind: 'offerAtMost', amount: bucks(3) },
    ];
    const amount = [moola(1), simoleans(0), bucks(3)];

    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in, with no 'wantAtLeast'
test('isOfferSafeForOffer - gets offerAtMost, no wantAtLeast', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(1) },
      { kind: 'offerAtMost', amount: simoleans(2) },
      { kind: 'offerAtMost', amount: bucks(3) },
    ];
    const amount = [moola(1), simoleans(2), bucks(3)];

    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets a refund *and* winnings. This is 'offer safe'.
test('isOfferSafeForOffer - refund and winnings', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(3) },
    ];
    const amount = [moola(2), simoleans(3), bucks(3)];
    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted
test('isOfferSafeForOffer - more than wantAtLeast', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(4) },
    ];
    const amount = [moola(0), simoleans(3), bucks(5)];
    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantAtLeast
test('isOfferSafeForOffer - more than wantAtLeast (no offerAtMost)', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'wantAtLeast', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(4) },
    ];
    const amount = [moola(2), simoleans(6), bucks(7)];
    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in
test('isOfferSafeForOffer - more than offerAtMost', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'offerAtMost', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(4) },
    ];
    const amount = [moola(5), simoleans(6), bucks(8)];
    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
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
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'offerAtMost', amount: simoleans(3) },
      { kind: 'offerAtMost', amount: bucks(4) },
    ];
    const amount = [moola(5), simoleans(6), bucks(8)];
    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in, with 'offer'
test('isOfferSafeForOffer - more than offer', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'offerAtMost', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(4) },
    ];
    const amount = [moola(5), simoleans(3), bucks(0)];
    t.ok(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantAtLeast
test('isOfferSafeForOffer - less than wantAtLeast', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(5) },
    ];
    const amount = [moola(0), simoleans(2), bucks(1)];
    t.notOk(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantAtLeast
test('isOfferSafeForOffer - less than wantAtLeast', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(9) },
    ];
    const amount = [moola(0), simoleans(2), bucks(1)];
    t.notOk(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded less than they put in
test('isOfferSafeForOffer - less than wantAtLeast', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(3) },
    ];
    const amount = [moola(1), simoleans(0), bucks(0)];
    t.notOk(isOfferSafeForOffer(amountMaths, payoutRules, amount));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForOffer - empty arrays', t => {
  try {
    const { amountMaths } = setup();
    const payoutRules = [];
    const amount = [];
    t.throws(
      () => isOfferSafeForOffer(amountMaths, payoutRules, amount),
      /amountMaths, payoutRules, and amounts must be arrays of the same length/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('isOfferSafeForOffer - null for some issuers', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      null,
      { kind: 'offerAtMost', amount: bucks(4) },
    ];
    const amount = [moola(5), simoleans(6), bucks(8)];
    t.throws(
      () => isOfferSafeForOffer(amountMaths, payoutRules, amount),
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
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(3) },
    ];

    const offerMatrix = [payoutRules, payoutRules, payoutRules];
    const amount = [moola(0), simoleans(3), bucks(3)];
    const amountMatrix = [amount, amount, amount];
    t.ok(isOfferSafeForAll(amountMaths, offerMatrix, amountMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test(`isOfferSafeForAll - One user doesn't get what they wanted`, t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const payoutRules = [
      { kind: 'offerAtMost', amount: moola(2) },
      { kind: 'wantAtLeast', amount: simoleans(3) },
      { kind: 'wantAtLeast', amount: bucks(3) },
    ];

    const offerMatrix = [payoutRules, payoutRules, payoutRules];
    const amount = [moola(0), simoleans(3), bucks(3)];
    const unsatisfiedUserAmounts = [moola(0), simoleans(3), bucks(2)];
    const amountMatrix = [amount, amount, unsatisfiedUserAmounts];
    t.notOk(isOfferSafeForAll(amountMaths, offerMatrix, amountMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
