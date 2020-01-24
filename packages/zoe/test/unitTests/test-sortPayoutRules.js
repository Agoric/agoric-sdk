import { test } from 'tape-promise/tape';

import { sortPayoutRules } from '../../src/sortPayoutRules';
import { setup } from './setupBasicMints';

test('sortPayoutRules', t => {
  try {
    const { unitOps, assays, moola, simoleans, bucks } = setup();

    const payoutRules = [
      { kind: 'wantAtLeast', units: simoleans(1) },
      { kind: 'offerAtMost', units: moola(3) },
    ];

    const expectedSortedAndFilledPayoutRules = [
      { kind: 'offerAtMost', units: moola(3) },
      { kind: 'wantAtLeast', units: simoleans(1) },
      { kind: 'wantAtLeast', units: bucks(0) },
    ];

    t.deepEquals(
      sortPayoutRules(assays, unitOps, payoutRules),
      expectedSortedAndFilledPayoutRules,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('sortPayoutRules - all empty', t => {
  try {
    const { unitOps, assays, moola, simoleans, bucks } = setup();

    const payoutRules = [];

    const expectedSortedAndFilledPayoutRules = [
      { kind: 'wantAtLeast', units: moola(0) },
      { kind: 'wantAtLeast', units: simoleans(0) },
      { kind: 'wantAtLeast', units: bucks(0) },
    ];

    t.deepEquals(
      sortPayoutRules(assays, unitOps, payoutRules),
      expectedSortedAndFilledPayoutRules,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('sortPayoutRules - repeated assays', t => {
  try {
    const { unitOps, assays, moola, simoleans, bucks } = setup();

    const repeatedAssays = [...assays, ...assays];
    const repeatedUnitOps = [...unitOps, ...unitOps];

    const payoutRules = [
      { kind: 'wantAtLeast', units: simoleans(1) },
      { kind: 'offerAtMost', units: moola(3) },
    ];

    const expectedSortedAndFilledPayoutRules = [
      { kind: 'offerAtMost', units: moola(3) },
      { kind: 'wantAtLeast', units: simoleans(1) },
      { kind: 'wantAtLeast', units: bucks(0) },
      { kind: 'wantAtLeast', units: moola(0) },
      { kind: 'wantAtLeast', units: simoleans(0) },
      { kind: 'wantAtLeast', units: bucks(0) },
    ];

    t.deepEquals(
      sortPayoutRules(repeatedAssays, repeatedUnitOps, payoutRules),
      expectedSortedAndFilledPayoutRules,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
