import '@agoric/zoe/exported.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import {
  currentDebtToCollateral,
  makePrioritizedVaults,
} from '../../src/vaultFactory/prioritizedVaults.js';
import {
  makeCompoundedInterestProvider,
  makeFakeVault,
} from './interestSupport.js';

/** @typedef {import('../../src/vaultFactory/vault.js').Vault} Vault */

const { brand } = makeIssuerKit('ducats');
const percent = n => makeRatio(BigInt(n), brand);

function makeCollector() {
  /** @type {Ratio[]} */
  const ratios = [];

  /**
   *
   * @param {[string, Vault]} record
   */
  function lookForRatio([_, vault]) {
    ratios.push(currentDebtToCollateral(vault));
  }

  return {
    lookForRatio,
    getPercentages: () => ratios.map(r => Number(r.numerator.value)),
  };
}

function makeRescheduler() {
  let called = false;

  async function fakeReschedule(ratio) {
    assert(ratio);
    called = true;
    return called;
  }

  return {
    called: () => called,
    resetCalled: () => (called = false),
    fakeReschedule,
  };
}

test('add to vault', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(store, rescheduler.fakeReschedule);
  vaults.addVault(
    'id-fakeVaultKit',
    makeFakeVault('id-fakeVaultKit', AmountMath.make(brand, 130n)),
  );
  const collector = makeCollector();
  // ??? why doesn't this work?
  // mapIterable(
  //   vaults.entriesPrioritizedGTE(makeRatio(1n, brand, 10n)),
  //   collector.lookForRatio,
  // );
  Array.from(vaults.entriesPrioritizedGTE(makeRatio(1n, brand, 10n))).map(
    collector.lookForRatio,
  );

  t.deepEqual(collector.getPercentages(), [130], 'expected vault');
  t.truthy(rescheduler.called(), 'should call reschedule()');
});

test('updates', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(store, rescheduler.fakeReschedule);

  vaults.addVault(
    'id-fakeVault1',
    makeFakeVault('id-fakeVault1', AmountMath.make(brand, 20n)),
  );

  vaults.addVault(
    'id-fakeVault2',
    makeFakeVault('id-fakeVault2', AmountMath.make(brand, 80n)),
  );

  const collector = makeCollector();
  rescheduler.resetCalled();
  Array.from(vaults.entriesPrioritizedGTE(makeRatio(1n, brand, 10n))).map(
    collector.lookForRatio,
  );
  t.deepEqual(collector.getPercentages(), [80, 20]);
  t.falsy(rescheduler.called(), 'second vault did not call reschedule()');
});

test('update changes ratio', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(store, rescheduler.fakeReschedule);

  // default collateral of makeFakeVaultKit
  const defaultCollateral = AmountMath.make(brand, 100n);

  const fakeVault1InitialDebt = AmountMath.make(brand, 20n);

  const fakeVault1 = makeFakeVault('id-fakeVault1', fakeVault1InitialDebt);
  vaults.addVault('id-fakeVault1', fakeVault1);
  t.true(
    vaults.hasVaultByAttributes(
      // @ts-expect-error cast
      fakeVault1InitialDebt,
      defaultCollateral,
      'id-fakeVault1',
    ),
  );
  t.true(
    vaults.hasVaultByAttributes(
      // @ts-expect-error cast
      fakeVault1InitialDebt,
      defaultCollateral,
      'id-fakeVault1',
    ),
  );

  vaults.addVault(
    'id-fakeVault2',
    makeFakeVault('id-fakeVault2', AmountMath.make(brand, 80n)),
  );

  t.deepEqual(Array.from(Array.from(vaults.entries()).map(([k, _v]) => k)), [
    'fbff4000000000000:id-fakeVault2',
    'fc014000000000000:id-fakeVault1',
  ]);

  t.deepEqual(vaults.highestRatio(), percent(80));

  // update the fake debt of the vault and then add/remove to refresh priority queue
  fakeVault1.setDebt(AmountMath.make(brand, 95n));
  const removedVault = vaults.removeVaultByAttributes(
    // @ts-expect-error cast
    fakeVault1InitialDebt,
    defaultCollateral,
    'id-fakeVault1',
  );
  t.is(removedVault, fakeVault1);
  vaults.addVault('id-fakeVault1', removedVault);
  // 95n from setDebt / 100n defaultCollateral
  t.deepEqual(vaults.highestRatio(), percent(95));

  const newCollector = makeCollector();
  rescheduler.resetCalled();
  Array.from(vaults.entriesPrioritizedGTE(percent(90))).map(
    newCollector.lookForRatio,
  );
  t.deepEqual(
    newCollector.getPercentages(),
    [95],
    'only one is higher than 90%',
  );
  t.deepEqual(vaults.highestRatio(), percent(95));
  t.falsy(rescheduler.called(), 'foreach does not trigger rescheduler'); // change from previous implementation
});

test('removals', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(store, rescheduler.fakeReschedule);

  // Add fakes 1,2,3
  vaults.addVault(
    'id-fakeVault1',
    makeFakeVault('id-fakeVault1', AmountMath.make(brand, 150n)),
  );
  vaults.addVault(
    'id-fakeVault2',
    makeFakeVault('id-fakeVault2', AmountMath.make(brand, 130n)),
  );
  vaults.addVault(
    'id-fakeVault3',
    makeFakeVault('id-fakeVault3', AmountMath.make(brand, 140n)),
  );

  // remove fake 3
  rescheduler.resetCalled();
  vaults.removeVaultByAttributes(
    // @ts-expect-error cast
    AmountMath.make(brand, 140n),
    AmountMath.make(brand, 100n), // default collateral of makeFakeVaultKit
    'id-fakeVault3',
  );
  t.falsy(rescheduler.called());
  t.deepEqual(vaults.highestRatio(), percent(150), 'should be 150');

  // remove fake 1
  rescheduler.resetCalled();
  vaults.removeVaultByAttributes(
    // @ts-expect-error cast
    AmountMath.make(brand, 150n),
    AmountMath.make(brand, 100n), // default collateral of makeFakeVaultKit
    'id-fakeVault1',
  );
  t.falsy(rescheduler.called(), 'should not call reschedule on removal');
  t.deepEqual(vaults.highestRatio(), percent(130), 'should be 130');

  t.throws(() =>
    vaults.removeVaultByAttributes(
      // @ts-expect-error cast
      AmountMath.make(brand, 150n),
      AmountMath.make(brand, 100n),
      'id-fakeVault1',
    ),
  );
});

test('highestRatio', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(store);
  vaults.onHigherHighest(rescheduler.fakeReschedule);

  vaults.addVault(
    'id-fakeVault1',
    makeFakeVault('id-fakeVault1', AmountMath.make(brand, 30n)),
  );
  const cr1 = percent(30);
  t.deepEqual(vaults.highestRatio(), cr1);

  const fakeVault6 = makeFakeVault(
    'id-fakeVault6',
    AmountMath.make(brand, 50n),
  );
  vaults.addVault('id-fakeVault6', fakeVault6);
  const cr6 = percent(50);
  t.deepEqual(vaults.highestRatio(), cr6);

  vaults.addVault(
    'id-fakeVault3',
    makeFakeVault('id-fakeVault3', AmountMath.make(brand, 40n)),
  );

  // sanity check ordering
  t.deepEqual(
    Array.from(vaults.entries()).map(([k, _v]) => k),
    [
      'fc000000000000000:id-fakeVault6',
      'fc004000000000000:id-fakeVault3',
      'fc00aaaaaaaaaaaab:id-fakeVault1',
    ],
  );

  const debtsOverThreshold = [];
  Array.from(vaults.entriesPrioritizedGTE(percent(45))).map(([_key, vault]) =>
    debtsOverThreshold.push([
      vault.getCurrentDebt(),
      vault.getCollateralAmount(),
    ]),
  );

  t.deepEqual(debtsOverThreshold, [
    [fakeVault6.getCurrentDebt(), fakeVault6.getCollateralAmount()],
  ]);
  t.deepEqual(vaults.highestRatio(), percent(50), 'expected 50% to be highest');
});

test('stable ordering as interest accrues', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(store, rescheduler.fakeReschedule);

  const m = makeCompoundedInterestProvider(brand);

  // ACTUAL DEBTS AFTER 100% DAILY INTEREST
  // day 0
  // v1: 10 / 100
  // v2: 20 / 100 HIGHEST
  const v1 = makeFakeVault(
    'id-fakeVault1',
    AmountMath.make(brand, 10n),
    undefined,
    m,
  );
  const v2 = makeFakeVault(
    'id-fakeVault2',
    AmountMath.make(brand, 20n),
    undefined,
    m,
  );
  vaults.addVault('id-fakeVault1', v1);
  vaults.addVault('id-fakeVault2', v2);
  // ordering
  t.deepEqual(
    Array.from(vaults.entries()).map(([k, _v]) => k),
    ['fc014000000000000:id-fakeVault2', 'fc024000000000000:id-fakeVault1'],
  );
  t.deepEqual(vaults.highestRatio(), percent(20));

  // day 1, interest doubled
  // v1: 20 / 100 (third)
  // v2: 40 / 100 (first)
  // v3: 30 / 100 (second)
  m.chargeHundredPercentInterest();
  const v3 = makeFakeVault(
    'id-fakeVault3',
    AmountMath.make(brand, 30n),
    undefined,
    m,
  );
  vaults.addVault('id-fakeVault3', v3);
  t.is(v1.getCurrentDebt().value, 20n);
  t.is(v2.getCurrentDebt().value, 40n);
  t.is(v3.getCurrentDebt().value, 30n);
  t.is(v1.getNormalizedDebt().value, 10n);
  t.is(v2.getNormalizedDebt().value, 20n);
  t.is(v3.getNormalizedDebt().value, 15n);
  const actualOrder = Array.from(vaults.entries()).map(([k, _v]) => k);
  t.deepEqual(actualOrder, [
    'fc014000000000000:id-fakeVault2',
    'fc01aaaaaaaaaaaab:id-fakeVault3',
    'fc024000000000000:id-fakeVault1',
  ]);
});
