// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { isOfferSafeForOffer, isOfferSafeForAll } from '../../src/isOfferSafe';
import { setup } from './setupBasicMints2';

// Potential outcomes:
// 1. Users can get what they wanted, get what they offered, both, or
// neither
// 2. Users can either get more than, less than, or equal to what they
//    wanted or offered

// possible combinations to test:
// more than want, more than offer -> isOfferSafe() = true
// more than want, less than offer -> true
// more than want, equal to offer -> true
// less than want, more than offer -> true
// less than want, less than offer -> false
// less than want, equal to offer -> true
// equal to want, more than offer -> true
// equal to want, less than offer -> true
// equal to want, equal to offer -> true

// more than want, more than offer -> isOfferSafe() = true
test('isOfferSafeForOffer - more than want, more than offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      offer: { A: moola(8) },
      want: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(10), B: simoleans(7), C: bucks(8) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// more than want, less than offer -> true
test('isOfferSafeForOffer - more than want, less than offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      offer: { A: moola(8) },
      want: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(1), B: simoleans(7), C: bucks(8) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// more than want, equal to offer -> true
test('isOfferSafeForOffer - more than want, equal to offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { A: moola(8) },
      offer: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(9), B: simoleans(6), C: bucks(7) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// less than want, more than offer -> true
test('isOfferSafeForOffer - less than want, more than offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { A: moola(8) },
      offer: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(7), B: simoleans(9), C: bucks(19) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// less than want, less than offer -> false
test('isOfferSafeForOffer - less than want, less than offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { A: moola(8) },
      offer: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(7), B: simoleans(5), C: bucks(6) });

    t.notOk(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// less than want, equal to offer -> true
test('isOfferSafeForOffer - less than want, equal to offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { B: simoleans(6) },
      offer: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(1), B: simoleans(5), C: bucks(7) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// equal to want, more than offer -> true
test('isOfferSafeForOffer - equal to want, more than offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { B: simoleans(6) },
      offer: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(2), B: simoleans(6), C: bucks(8) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// equal to want, less than offer -> true
test('isOfferSafeForOffer - equal to want, less than offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { B: simoleans(6) },
      offer: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(0), B: simoleans(6), C: bucks(0) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// equal to want, equal to offer -> true
test('isOfferSafeForOffer - equal to want, equal to offer', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { B: simoleans(6) },
      offer: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(1), B: simoleans(6), C: bucks(7) });

    t.ok(isOfferSafeForOffer(amountMaths, offerRules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// All users get exactly what they wanted
test('isOfferSafeForAll - All users get what they wanted', t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { B: simoleans(6) },
      offer: { A: moola(1), C: bucks(7) },
    });
    const offerRulesObjs = [offerRules, offerRules, offerRules];
    const amounts = harden({ A: moola(0), B: simoleans(6), C: bucks(0) });
    const amountObjs = [amounts, amounts, amounts];
    t.ok(isOfferSafeForAll(amountMaths, offerRulesObjs, amountObjs));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test(`isOfferSafeForAll - One user doesn't get what they wanted`, t => {
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMaths = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const offerRules = harden({
      want: { B: simoleans(6) },
      offer: { A: moola(1), C: bucks(7) },
    });
    const offerRulesObjs = [offerRules, offerRules, offerRules];
    const amounts = harden({ A: moola(0), B: simoleans(6), C: bucks(0) });
    const unsatisfiedAmounts = harden({
      A: moola(0),
      B: simoleans(4),
      C: bucks(0),
    });
    const amountObjs = [amounts, amounts, unsatisfiedAmounts];
    t.notOk(isOfferSafeForAll(amountMaths, offerRulesObjs, amountObjs));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
