// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import harden from '@agoric/harden';

import { cleanProposal } from '../../src/cleanProposal';
import { setup } from './setupBasicMints';
import buildManualTimer from '../../tools/manualTimer';

test('cleanProposal', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();

    const keywords = ['Asset', 'Price', 'AlternativePrice'];

    const proposal = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3) },
    });

    const amountMathKeywordRecord = harden({
      Asset: amountMaths[1],
      Price: amountMaths[0],
      AlternativePrice: amountMaths[2],
    });

    const expected = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3), AlternativePrice: bucks(0) },
      exit: { onDemand: null },
    });

    const actual = cleanProposal(keywords, amountMathKeywordRecord, proposal);

    t.deepEquals(actual, expected);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('cleanProposal - all empty', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();

    const keywords = ['Asset', 'Price', 'AlternativePrice'];
    const amountMathKeywordRecord = harden({
      Asset: amountMaths[1],
      Price: amountMaths[0],
      AlternativePrice: amountMaths[2],
    });

    const proposal = harden({
      give: {},
      want: {},
      exit: { waived: null },
    });

    const expected = harden({
      give: {},
      want: {
        Asset: simoleans(0),
        Price: moola(0),
        AlternativePrice: bucks(0),
      },
      exit: { waived: null },
    });

    t.deepEquals(
      cleanProposal(keywords, amountMathKeywordRecord, proposal),
      expected,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('cleanProposal - repeated brands', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const timer = buildManualTimer(console.log);

    const keywords = [
      'Asset1',
      'Price1',
      'AlternativePrice1',
      'Asset2',
      'Price2',
      'AlternativePrice2',
    ];
    const amountMathsObj = harden({
      Asset1: amountMaths[1],
      Price1: amountMaths[0],
      AlternativePrice1: amountMaths[2],
      Asset2: amountMaths[1],
      Price2: amountMaths[0],
      AlternativePrice2: amountMaths[2],
    });

    const proposal = harden({
      want: { Asset2: simoleans(1) },
      give: { Price2: moola(3) },
      exit: { afterDeadline: { timer, deadline: 100 } },
    });

    const expected = harden({
      want: {
        Asset2: simoleans(1),
        Asset1: simoleans(0),
        Price1: moola(0),
        AlternativePrice1: bucks(0),
        AlternativePrice2: bucks(0),
      },
      give: { Price2: moola(3) },
      exit: { afterDeadline: { timer, deadline: 100 } },
    });

    const actual = cleanProposal(keywords, amountMathsObj, proposal);
    t.deepEquals(actual.want, expected.want);
    t.deepEquals(actual.give, expected.give);
    t.deepEquals(actual.exit, expected.exit);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
