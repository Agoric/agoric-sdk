// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import harden from '@agoric/harden';

import { cleanOfferRules } from '../../src/cleanOfferRules';
import { setup } from './setupBasicMints';
import buildManualTimer from '../../tools/manualTimer';

test('cleanOfferRules', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();

    const roleNames = ['Asset', 'Price', 'AlternativePrice'];

    const offerRules = harden({
      offer: { Asset: simoleans(1) },
      want: { Price: moola(3) },
      exit: { onDemand: {} },
    });

    const expected = harden({
      payoutRules: [
        { role: 'Asset', kind: 'offerAtMost', amount: simoleans(1) },
        { role: 'Price', kind: 'wantAtLeast', amount: moola(3) },
        { role: 'AlternativePrice', kind: 'wantAtLeast', amount: bucks(0) },
      ],
      exitRule: { kind: 'onDemand' },
    });

    const actual = cleanOfferRules(roleNames, amountMaths, offerRules);

    t.deepEquals(actual, expected);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('cleanOfferRules - all empty', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();

    const roleNames = ['Asset', 'Price', 'AlternativePrice'];

    const offerRules = harden({
      offer: {},
      want: {},
      exit: { waived: {} },
    });

    const expected = harden({
      payoutRules: [
        { role: 'Asset', kind: 'wantAtLeast', amount: moola(0) },
        { role: 'Price', kind: 'wantAtLeast', amount: simoleans(0) },
        { role: 'AlternativePrice', kind: 'wantAtLeast', amount: bucks(0) },
      ],
      exitRule: { kind: 'waived' },
    });

    t.deepEquals(cleanOfferRules(roleNames, amountMaths, offerRules), expected);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('cleanOfferRules - repeated brands', t => {
  try {
    const { amountMaths, moola, simoleans, bucks } = setup();
    const timer = buildManualTimer(console.log);

    const roleNames = [
      'Asset1',
      'Price1',
      'AlternativePrice1',
      'Asset2',
      'Price2',
      'AlternativePrice2',
    ];
    const repeatedAmountMaths = [...amountMaths, ...amountMaths];

    const offerRules = {
      want: { Asset2: simoleans(1) },
      offer: { Price2: moola(3) },
      exit: { afterDeadline: { timer, deadline: 100 } },
    };

    const expected = harden({
      payoutRules: [
        { role: 'Asset1', kind: 'wantAtLeast', amount: moola(0) },
        { role: 'Price1', kind: 'wantAtLeast', amount: simoleans(0) },
        { role: 'AlternativePrice1', kind: 'wantAtLeast', amount: bucks(0) },
        { role: 'Asset2', kind: 'wantAtLeast', amount: simoleans(1) },
        { role: 'Price2', kind: 'offerAtMost', amount: moola(3) },
        { role: 'AlternativePrice2', kind: 'wantAtLeast', amount: bucks(0) },
      ],
      exitRule: { kind: 'afterDeadline', timer, deadline: 100 },
    });

    t.deepEquals(
      cleanOfferRules(roleNames, repeatedAmountMaths, offerRules),
      expected,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
