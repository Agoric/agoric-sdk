// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { isOfferSafeForOffer, isOfferSafeForAll } from '../../src/offerSafety';
import { setup } from './setupBasicMints';

// Potential outcomes:
// 1. Users can get what they wanted, get back what they gave, both, or
// neither
// 2. Users can either get more than, less than, or equal to what they
//    wanted or gave

// possible combinations to test:
// more than want, more than give -> isOfferSafe() = true
// more than want, less than give -> true
// more than want, equal to give -> true
// less than want, more than give -> true
// less than want, less than give -> false
// less than want, equal to give -> true
// equal to want, more than give -> true
// equal to want, less than give -> true
// equal to want, equal to give -> true

// more than want, more than give -> isOfferSafe() = true
test('isOfferSafeForOffer - more than want, more than give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      give: { A: moola(8) },
      want: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(10), B: simoleans(7), C: bucks(8) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// more than want, less than give -> true
test('isOfferSafeForOffer - more than want, less than give', t => {
  t.plan(1);
  try {
    const { moola, moolaR, simoleans, simoleanR, bucks, bucksR } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      give: { A: moola(8) },
      want: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(1), B: simoleans(7), C: bucks(8) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// more than want, equal to give -> true
test('isOfferSafeForOffer - more than want, equal to give', t => {
  t.plan(1);
  try {
    const { moola, moolaR, simoleans, simoleanR, bucks, bucksR } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { A: moola(8) },
      give: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(9), B: simoleans(6), C: bucks(7) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// less than want, more than give -> true
test('isOfferSafeForOffer - less than want, more than give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { A: moola(8) },
      give: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(7), B: simoleans(9), C: bucks(19) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// exclude want, less than give -> true
test.skip('isOfferSafeForOffer - exclude want, less than give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { A: moola(8) },
      give: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ B: simoleans(9) });

    const filteredProposal =
    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// less than want, less than give -> false
test('isOfferSafeForOffer - less than want, less than give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { A: moola(8) },
      give: { B: simoleans(6), C: bucks(7) },
    });
    const amounts = harden({ A: moola(7), B: simoleans(5), C: bucks(6) });

    t.notOk(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// less than want, equal to give -> true
test('isOfferSafeForOffer - less than want, equal to give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { B: simoleans(6) },
      give: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(1), B: simoleans(5), C: bucks(7) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// equal to want, more than give -> true
test('isOfferSafeForOffer - equal to want, more than give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { B: simoleans(6) },
      give: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(2), B: simoleans(6), C: bucks(8) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// equal to want, less than give -> true
test('isOfferSafeForOffer - equal to want, less than give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { B: simoleans(6) },
      give: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(0), B: simoleans(6), C: bucks(0) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// equal to want, equal to give -> true
test('isOfferSafeForOffer - equal to want, equal to give', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { B: simoleans(6) },
      give: { A: moola(1), C: bucks(7) },
    });
    const amounts = harden({ A: moola(1), B: simoleans(6), C: bucks(7) });

    t.ok(isOfferSafeForOffer(amountMathByBrand, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

test('isOfferSafeForOffer - empty proposal', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathKeywordRecord = harden({
      A: moolaR.amountMath,
      B: simoleanR.amountMath,
      C: bucksR.amountMath,
    });
    const proposal = harden({ give: {}, want: {} });
    const amounts = harden({ A: moola(1), B: simoleans(6), C: bucks(7) });

    t.ok(isOfferSafeForOffer(amountMathKeywordRecord, proposal, amounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// All users get exactly what they wanted
test('isOfferSafeForAll - All users get what they wanted', t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { B: simoleans(6) },
      give: { A: moola(1), C: bucks(7) },
    });
    const proposals = [proposal, proposal, proposal];
    const amounts = harden({ A: moola(0), B: simoleans(6), C: bucks(0) });
    const amountKeywordRecords = [amounts, amounts, amounts];
    t.ok(isOfferSafeForAll(amountMathByBrand, proposals, amountKeywordRecords));
  } catch (e) {
    t.assert(false, e);
  }
});

test(`isOfferSafeForAll - One user doesn't get what they wanted`, t => {
  t.plan(1);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const amountMathByBrand = new Map([
      [moolaR.brand, moolaR.amountMath],
      [simoleanR.brand, simoleanR.amountMath],
      [bucksR.brand, bucksR.amountMath],
    ]);
    const proposal = harden({
      want: { B: simoleans(6) },
      give: { A: moola(1), C: bucks(7) },
    });
    const proposals = [proposal, proposal, proposal];
    const amounts = harden({ A: moola(0), B: simoleans(6), C: bucks(0) });
    const unsatisfiedAmounts = harden({
      A: moola(0),
      B: simoleans(4),
      C: bucks(0),
    });
    const amountKeywordRecords = [amounts, amounts, unsatisfiedAmounts];
    t.notOk(
      isOfferSafeForAll(amountMathByBrand, proposals, amountKeywordRecords),
    );
  } catch (e) {
    t.assert(false, e);
  }
});
