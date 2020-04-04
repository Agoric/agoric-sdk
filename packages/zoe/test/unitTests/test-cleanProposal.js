// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import harden from '@agoric/harden';

import { cleanProposal } from '../../src/cleanProposal';
import { setup } from './setupBasicMints2';
import buildManualTimer from '../../tools/manualTimer';

test('cleanProposal test', t => {
  t.plan(1);
  try {
    const { simoleanR, moolaR, bucksR, moola, simoleans } = setup();

    const issuerKeywordRecord = harden({
      Asset: simoleanR.issuer,
      Price: moolaR.issuer,
      AlternativePrice: bucksR.issuer,
    });

    const proposal = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3) },
    });

    const amountMathKeywordRecord = harden({
      Asset: simoleanR.amountMath,
      Price: moolaR.amountMath,
      AlternativePrice: bucksR.amountMath,
    });

    // CleanProposal no longer fills in missing keywords
    const expected = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3) },
      exit: { onDemand: null },
    });

    const actual = cleanProposal(
      issuerKeywordRecord,
      amountMathKeywordRecord,
      proposal,
    );

    t.deepEquals(actual, expected);
  } catch (e) {
    t.assert(false, e);
  }
});

test('cleanProposal - all empty', t => {
  t.plan(1);
  try {
    const { simoleanR, moolaR, bucksR } = setup();

    const issuerKeywordRecord = {
      Asset: simoleanR.issuer,
      Price: moolaR.issuer,
      AlternativePrice: bucksR.issuer,
    };
    const amountMathKeywordRecord = harden({
      Asset: simoleanR.amountMath,
      Price: moolaR.amountMath,
      AlternativePrice: bucksR.amountMath,
    });

    const proposal = harden({
      give: {},
      want: {},
      exit: { waived: null },
    });

    const expected = harden({
      give: {},
      want: {},
      exit: { waived: null },
    });

    // cleanProposal no longer fills in empty keywords
    t.deepEquals(
      cleanProposal(issuerKeywordRecord, amountMathKeywordRecord, proposal),
      expected,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('cleanProposal - repeated brands', t => {
  t.plan(3);
  try {
    const { moolaR, simoleanR, bucksR, moola, simoleans } = setup();
    const timer = buildManualTimer(console.log);

    const issuerKeywordRecord = {
      Asset1: simoleanR.issuer,
      Price1: moolaR.issuer,
      AlternativePrice1: bucksR.issuer,
      Asset2: simoleanR.issuer,
      Price2: moolaR.issuer,
      AlternativePrice2: bucksR.issuer,
    };
    const amountMathsObj = harden({
      Asset1: simoleanR.amountMath,
      Price1: moolaR.amountMath,
      AlternativePrice1: bucksR.amountMath,
      Asset2: simoleanR.amountMath,
      Price2: moolaR.amountMath,
      AlternativePrice2: bucksR.amountMath,
    });

    const proposal = harden({
      want: { Asset2: simoleans(1) },
      give: { Price2: moola(3) },
      exit: { afterDeadline: { timer, deadline: 100 } },
    });

    const expected = harden({
      want: {
        Asset2: simoleans(1),
      },
      give: { Price2: moola(3) },
      exit: { afterDeadline: { timer, deadline: 100 } },
    });
    // cleanProposal no longer fills in empty keywords
    const actual = cleanProposal(issuerKeywordRecord, amountMathsObj, proposal);
    t.deepEquals(actual.want, expected.want);
    t.deepEquals(actual.give, expected.give);
    t.deepEquals(actual.exit, expected.exit);
  } catch (e) {
    t.assert(false, e);
  }
});
