/* global setImmediate */
// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeNotifierKit } from '@agoric/notifier';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/index.js';
import { makePrioritizedVaults } from '../../src/vaultFactory/prioritizedVaults.js';

// Some notifier updates aren't propogating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
async function waitForPromisesToSettle() {
  const pk = makePromiseKit();
  setImmediate(pk.resolve);
  return pk.promise;
}

function makeCollector() {
  const ratios = [];

  function lookForRatio(vaultPair) {
    ratios.push(vaultPair.debtToCollateral);
  }

  return {
    lookForRatio,
    getRates: () => ratios,
  };
}

function makeRescheduler() {
  let called = false;

  async function fakeReschedule() {
    called = true;
    return called;
  }

  return {
    called: () => called,
    resetCalled: () => (called = false),
    fakeReschedule,
  };
}

function makeFakeVaultKit(
  initDebt,
  initCollateral = AmountMath.make(initDebt.brand, 100n),
) {
  let debt = initDebt;
  let collateral = initCollateral;
  const vault = Far('Vault', {
    getCollateralAmount: () => collateral,
    getDebtAmount: () => debt,
    setDebt: newDebt => (debt = newDebt),
    setCollateral: newCollateral => (collateral = newCollateral),
  });
  return harden({
    vault,
    liquidate: () => {},
  });
}

test('add to vault', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);
  const fakeVaultKit = makeFakeVaultKit(AmountMath.make(brand, 130n));
  const { notifier } = makeNotifierKit();
  vaults.addVaultKit(fakeVaultKit, notifier);
  const collector = makeCollector();
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), collector.lookForRatio);

  const rates = collector.getRates();
  const ratio130 = makeRatio(130n, brand, 100n);
  t.deepEqual(rates, [ratio130], 'expected vault');
  t.truthy(rescheduler.called(), 'should call reschedule()');
  t.deepEqual(vaults.highestRatio(), undefined);
});

test('updates', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(AmountMath.make(brand, 120n));
  const { updater: updater1, notifier: notifier1 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault1, notifier1);

  const fakeVault2 = makeFakeVaultKit(AmountMath.make(brand, 180n));
  const { updater: updater2, notifier: notifier2 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault2, notifier2);

  // prioritizedVaults doesn't care what the update contains
  updater1.updateState({ locked: AmountMath.make(brand, 300n) });
  updater2.updateState({ locked: AmountMath.make(brand, 300n) });
  await waitForPromisesToSettle();

  const collector = makeCollector();
  rescheduler.resetCalled();
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), collector.lookForRatio);
  const rates = collector.getRates();
  const ratio180 = makeRatio(180n, brand, 100n);
  const ratio120 = makeRatio(120n, brand, 100n);
  t.deepEqual(rates, [ratio180, ratio120]);
  t.falsy(rescheduler.called(), 'second vault did not call reschedule()');
  t.deepEqual(vaults.highestRatio(), undefined);
});

test('update changes ratio', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(AmountMath.make(brand, 120n));
  const { updater: updater1, notifier: notifier1 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault1, notifier1);

  const fakeVault2 = makeFakeVaultKit(AmountMath.make(brand, 180n));
  const { updater: updater2, notifier: notifier2 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault2, notifier2);

  // prioritizedVaults doesn't care what the update contains
  updater1.updateState({ locked: AmountMath.make(brand, 300n) });
  updater2.updateState({ locked: AmountMath.make(brand, 300n) });
  await waitForPromisesToSettle();

  const ratio180 = makeRatio(180n, brand, 100n);
  t.deepEqual(vaults.highestRatio(), ratio180);

  fakeVault1.vault.setDebt(AmountMath.make(brand, 200n));
  updater1.updateState({ locked: AmountMath.make(brand, 300n) });
  await waitForPromisesToSettle();
  t.deepEqual(vaults.highestRatio(), makeRatio(200n, brand, 100n));

  const newCollector = makeCollector();
  rescheduler.resetCalled();
  vaults.forEachRatioGTE(makeRatio(190n, brand), newCollector.lookForRatio);
  const newRates = newCollector.getRates();
  const ratio200 = makeRatio(200n, brand, 100n);
  t.deepEqual(newRates, [ratio200], 'only one is higher than 190');
  t.deepEqual(vaults.highestRatio(), makeRatio(180n, brand, 100n));
  t.truthy(rescheduler.called(), 'called rescheduler when foreach found vault');
});

test('removals', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(AmountMath.make(brand, 150n));
  const { notifier: notifier1 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault1, notifier1);
  const ratio150 = makeRatio(150n, brand);

  const fakeVault2 = makeFakeVaultKit(AmountMath.make(brand, 130n));
  const { notifier: notifier2 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault2, notifier2);
  const ratio130 = makeRatio(130n, brand);

  const fakeVault3 = makeFakeVaultKit(AmountMath.make(brand, 140n));
  const { notifier: notifier3 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault3, notifier3);

  rescheduler.resetCalled();
  vaults.removeVault(fakeVault3);
  t.falsy(rescheduler.called());
  t.deepEqual(vaults.highestRatio(), ratio150, 'should be 150');

  rescheduler.resetCalled();
  vaults.removeVault(fakeVault1);
  t.falsy(rescheduler.called(), 'should not call reschedule on removal');
  t.deepEqual(vaults.highestRatio(), ratio130, 'should be 130');
});

test('chargeInterest', async t => {
  const { brand } = makeIssuerKit('ducats');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(AmountMath.make(brand, 130n));
  const { notifier: notifier1 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault1, notifier1);

  const fakeVault2 = makeFakeVaultKit(AmountMath.make(brand, 150n));
  const { notifier: notifier2 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault2, notifier2);

  const touchedVaults = [];
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), vaultPair =>
    touchedVaults.push([
      vaultPair.vaultKit,
      makeRatioFromAmounts(
        vaultPair.vaultKit.vault.getDebtAmount(),
        vaultPair.vaultKit.vault.getCollateralAmount(),
      ),
    ]),
  );
  const cr1 = makeRatio(130n, brand);
  const cr2 = makeRatio(150n, brand);
  t.deepEqual(touchedVaults, [
    [fakeVault2, cr2],
    [fakeVault1, cr1],
  ]);
});

test('liquidation', async t => {
  const { brand } = makeIssuerKit('ducats');
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(AmountMath.make(brand, 130n));
  const { notifier: notifier1 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault1, notifier1);

  const fakeVault2 = makeFakeVaultKit(AmountMath.make(brand, 150n));
  const { notifier: notifier2 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault2, notifier2);
  const cr2 = makeRatio(150n, brand);

  const fakeVault3 = makeFakeVaultKit(AmountMath.make(brand, 140n));
  const { notifier: notifier3 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault3, notifier3);
  const cr3 = makeRatio(140n, brand);

  const touchedVaults = [];
  vaults.forEachRatioGTE(makeRatio(135n, brand), vaultPair =>
    touchedVaults.push(vaultPair),
  );

  t.deepEqual(touchedVaults, [
    { vaultKit: fakeVault2, debtToCollateral: cr2 },
    { vaultKit: fakeVault3, debtToCollateral: cr3 },
  ]);
});

test('highestRatio ', async t => {
  const { brand } = makeIssuerKit('ducats');
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(AmountMath.make(brand, 130n));
  const { notifier: notifier2 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault1, notifier2);
  const cr1 = makeRatio(130n, brand);
  t.deepEqual(vaults.highestRatio(), cr1);

  const fakeVault6 = makeFakeVaultKit(AmountMath.make(brand, 150n));
  const { notifier: notifier1 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault6, notifier1);
  const cr6 = makeRatio(150n, brand);
  t.deepEqual(vaults.highestRatio(), cr6);

  const fakeVault3 = makeFakeVaultKit(AmountMath.make(brand, 140n));
  const { notifier: notifier3 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault3, notifier3);
  const cr3 = makeRatio(140n, brand);

  const touchedVaults = [];
  vaults.forEachRatioGTE(makeRatio(145n, brand), vaultPair =>
    touchedVaults.push(vaultPair),
  );

  t.deepEqual(
    touchedVaults,
    [{ vaultKit: fakeVault6, debtToCollateral: cr6 }],
    'expected 150 to be highest',
  );
  t.deepEqual(vaults.highestRatio(), cr3);
});

test('removal by notification', async t => {
  const { brand } = makeIssuerKit('ducats');
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(AmountMath.make(brand, 150n));
  const { updater: updater1, notifier: notifier1 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault1, notifier1);
  const cr1 = makeRatio(150n, brand);
  t.deepEqual(vaults.highestRatio(), cr1);

  const fakeVault2 = makeFakeVaultKit(AmountMath.make(brand, 130n));
  const { notifier: notifier2 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault2, notifier2);
  t.deepEqual(vaults.highestRatio(), cr1, 'should be new highest');

  const fakeVault3 = makeFakeVaultKit(AmountMath.make(brand, 140n));
  const { notifier: notifier3 } = makeNotifierKit();
  vaults.addVaultKit(fakeVault3, notifier3);
  const cr3 = makeRatio(140n, brand);
  t.deepEqual(vaults.highestRatio(), cr1, '130 expected');

  updater1.finish('done');
  await waitForPromisesToSettle();

  t.deepEqual(vaults.highestRatio(), cr3, 'should have removed 150');

  const touchedVaults = [];
  vaults.forEachRatioGTE(makeRatio(135n, brand), vaultPair =>
    touchedVaults.push(vaultPair),
  );

  t.deepEqual(
    touchedVaults,
    [{ vaultKit: fakeVault3, debtToCollateral: cr3 }],
    'should be only one',
  );
});
