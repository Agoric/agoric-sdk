// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import harden from '@agoric/harden';

import { cleanProposal, getKeywords } from '../../src/cleanProposal';
import { setup } from './setupBasicMints';
import buildManualTimer from '../../tools/manualTimer';

test('cleanProposal test', t => {
  t.plan(1);
  try {
    const {
      simoleanIssuer,
      moolaIssuer,
      bucksIssuer,
      moola,
      simoleans,
      amountMaths,
    } = setup();

    const issuerKeywordRecord = harden({
      Asset: simoleanIssuer,
      Price: moolaIssuer,
      AlternativePrice: bucksIssuer,
    });

    const proposal = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3) },
    });

    const amountMathKeywordRecord = harden({
      Asset: amountMaths.get('simoleans'),
      Price: amountMaths.get('moola'),
      AlternativePrice: amountMaths.get('bucks'),
    });

    // CleanProposal no longer fills in missing keywords
    const expected = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3) },
      exit: { onDemand: null },
    });

    const actual = cleanProposal(
      getKeywords(issuerKeywordRecord),
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
    const { simoleanIssuer, moolaIssuer, bucksIssuer, amountMaths } = setup();

    const issuerKeywordRecord = {
      Asset: simoleanIssuer,
      Price: moolaIssuer,
      AlternativePrice: bucksIssuer,
    };
    const amountMathKeywordRecord = harden({
      Asset: amountMaths.get('simoleans'),
      Price: amountMaths.get('moola'),
      AlternativePrice: amountMaths.get('bucks'),
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
    const allKeywords = getKeywords(issuerKeywordRecord);
    t.deepEquals(
      cleanProposal(allKeywords, amountMathKeywordRecord, proposal),
      expected,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('cleanProposal - repeated brands', t => {
  t.plan(3);
  try {
    const {
      moolaIssuer,
      simoleanIssuer,
      bucksIssuer,
      moola,
      simoleans,
      amountMaths,
    } = setup();
    const timer = buildManualTimer(console.log);

    const issuerKeywordRecord = {
      Asset1: simoleanIssuer,
      Price1: moolaIssuer,
      AlternativePrice1: bucksIssuer,
      Asset2: simoleanIssuer,
      Price2: moolaIssuer,
      AlternativePrice2: bucksIssuer,
    };
    const amountMathsObj = harden({
      Asset1: amountMaths.get('simoleans'),
      Price1: amountMaths.get('moola'),
      AlternativePrice1: amountMaths.get('bucks'),
      Asset2: amountMaths.get('simoleans'),
      Price2: amountMaths.get('moola'),
      AlternativePrice2: amountMaths.get('bucks'),
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
    const keywords = getKeywords(issuerKeywordRecord);
    const actual = cleanProposal(keywords, amountMathsObj, proposal);
    t.deepEquals(actual.want, expected.want);
    t.deepEquals(actual.give, expected.give);
    t.deepEquals(actual.exit, expected.exit);
  } catch (e) {
    t.assert(false, e);
  }
});
