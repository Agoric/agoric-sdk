// eslint-disable-next-line import/no-extraneous-dependencies

import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
import makeStore from '@agoric/weak-store';
import { cleanProposal } from '../../src/cleanProposal';
import { setup } from './setupBasicMints';
import buildManualTimer from '../../tools/manualTimer';

test('cleanProposal test', t => {
  t.plan(1);
  try {
    const { simoleanR, moolaR, bucksR, moola, simoleans } = setup();

    const brandToAmountMath = makeStore('brand');
    brandToAmountMath.init(moolaR.brand, moolaR.amountMath);
    brandToAmountMath.init(simoleanR.brand, simoleanR.amountMath);
    brandToAmountMath.init(bucksR.brand, bucksR.amountMath);

    const getAmountMathForBrand = brandToAmountMath.get;

    const proposal = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3) },
    });

    const expected = harden({
      give: { Asset: simoleans(1) },
      want: { Price: moola(3) },
      exit: { onDemand: null },
    });

    const actual = cleanProposal(getAmountMathForBrand, proposal);

    t.deepEquals(actual, expected);
  } catch (e) {
    t.assert(false, e);
  }
});

test('cleanProposal - all empty', t => {
  t.plan(1);
  try {
    const { simoleanR, moolaR, bucksR } = setup();

    const brandToAmountMath = makeStore('brand');
    brandToAmountMath.init(moolaR.brand, moolaR.amountMath);
    brandToAmountMath.init(simoleanR.brand, simoleanR.amountMath);
    brandToAmountMath.init(bucksR.brand, bucksR.amountMath);

    const getAmountMathForBrand = brandToAmountMath.get;

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
    t.deepEquals(cleanProposal(getAmountMathForBrand, proposal), expected);
  } catch (e) {
    t.assert(false, e);
  }
});

test('cleanProposal - repeated brands', t => {
  t.plan(3);
  try {
    const { simoleanR, moolaR, bucksR, moola, simoleans } = setup();

    const brandToAmountMath = makeStore('brand');
    brandToAmountMath.init(moolaR.brand, moolaR.amountMath);
    brandToAmountMath.init(simoleanR.brand, simoleanR.amountMath);
    brandToAmountMath.init(bucksR.brand, bucksR.amountMath);

    const getAmountMathForBrand = brandToAmountMath.get;
    const timer = buildManualTimer(console.log);

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
    const actual = cleanProposal(getAmountMathForBrand, proposal);
    t.deepEquals(actual.want, expected.want);
    t.deepEquals(actual.give, expected.give);
    t.deepEquals(actual.exit, expected.exit);
  } catch (e) {
    t.assert(false, e);
  }
});
