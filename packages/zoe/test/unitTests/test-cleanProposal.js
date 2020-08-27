// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import makeStore from '@agoric/weak-store';
import { cleanProposal } from '../../src/cleanProposal';
import { setup } from './setupBasicMints';
import buildManualTimer from '../../tools/manualTimer';

test('cleanProposal test', t => {
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

  t.deepEqual(actual, expected);
});

test('cleanProposal - all empty', t => {
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
  t.deepEqual(cleanProposal(getAmountMathForBrand, proposal), expected);
});

test('cleanProposal - repeated brands', t => {
  t.plan(3);
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
  t.deepEqual(actual.want, expected.want);
  t.deepEqual(actual.give, expected.give);
  t.deepEqual(actual.exit, expected.exit);
});
