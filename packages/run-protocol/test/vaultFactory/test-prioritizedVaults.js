/* global setImmediate */
// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/index.js';
import {
  currentDebtToCollateral,
  makePrioritizedVaults,
} from '../../src/vaultFactory/prioritizedVaults.js';
import { makeFakeVaultKit } from '../supports.js';

/** @typedef {import('../../src/vaultFactory/vault.js').VaultKit} VaultKit */

// Some notifier updates aren't propogating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
async function waitForPromisesToSettle() {
  // TODO can't we do simply:
  // return new Promise(resolve => setImmediate(resolve));
  const pk = makePromiseKit();
  setImmediate(pk.resolve);
  return pk.promise;
}

function makeCollector() {
  /** @type {Ratio[]} */
  const ratios = [];

  /**
   *
   * @param {VaultId} _vaultId
   * @param {VaultKit} vaultKit
   */
  function lookForRatio(_vaultId, vaultKit) {
    ratios.push(currentDebtToCollateral(vaultKit.vault));
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

test('add to vault', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);
  const fakeVaultKit = makeFakeVaultKit(
    'id-fakeVaultKit',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVaultKit', fakeVaultKit);
  const collector = makeCollector();
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), collector.lookForRatio);

  const rates = collector.getRates();
  const ratio130 = makeRatio(130n, brand, 100n);
  t.deepEqual(rates, [ratio130], 'expected vault');
  t.truthy(rescheduler.called(), 'should call reschedule()');
  // FIXME is it material that this be undefined?
  // t.deepEqual(vaults.highestRatio(), undefined);
});

test('updates', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 20n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);

  const fakeVault2 = makeFakeVaultKit(
    'id-fakeVault2',
    AmountMath.make(brand, 80n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault2);

  await waitForPromisesToSettle();

  const collector = makeCollector();
  rescheduler.resetCalled();
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), collector.lookForRatio);
  const rates = collector.getRates();
  t.deepEqual(rates, [makeRatio(80n, brand), makeRatio(20n, brand)]);
  t.falsy(rescheduler.called(), 'second vault did not call reschedule()');
  // FIXME is it material that this be undefined?
  // t.deepEqual(vaults.highestRatio(), undefined);
});

test.skip('update changes ratio', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 120n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);

  const fakeVault2 = makeFakeVaultKit(
    'id-fakeVault2',
    AmountMath.make(brand, 180n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault2);

  await waitForPromisesToSettle();

  const ratio180 = makeRatio(180n, brand, 100n);
  t.deepEqual(vaults.highestRatio(), ratio180);

  fakeVault1.vault.setDebt(AmountMath.make(brand, 200n));
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

test.skip('removals', async t => {
  const { brand } = makeIssuerKit('ducats');

  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);
  const ratio150 = makeRatio(150n, brand);

  const fakeVault2 = makeFakeVaultKit(
    'id-fakeVault2',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault2);
  const ratio130 = makeRatio(130n, brand);

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 140n),
  );
  vaults.addVaultKit('id-fakeVault3', fakeVault3);

  rescheduler.resetCalled();
  vaults.removeVault('id-fakeVault3', fakeVault3.vault);
  t.falsy(rescheduler.called());
  t.deepEqual(vaults.highestRatio(), ratio150, 'should be 150');

  rescheduler.resetCalled();
  vaults.removeVault('id-fakeVault1', fakeVault1.vault);
  t.falsy(rescheduler.called(), 'should not call reschedule on removal');
  t.deepEqual(vaults.highestRatio(), ratio130, 'should be 130');
});

test.skip('chargeInterest', async t => {
  const { brand } = makeIssuerKit('ducats');
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);

  const fakeVault2 = makeFakeVaultKit(
    'id-fakeVault2',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault2);

  const touchedVaults = [];
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), (_vaultId, vaultKit) =>
    touchedVaults.push([
      vaultKit,
      makeRatioFromAmounts(
        vaultKit.vault.getDebtAmount(),
        vaultKit.vault.getCollateralAmount(),
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

test.skip('liquidation', async t => {
  const { brand } = makeIssuerKit('ducats');
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);

  const fakeVault2 = makeFakeVaultKit(
    'id-fakeVault2',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault2);
  const cr2 = makeRatio(150n, brand);

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 140n),
  );
  vaults.addVaultKit('id-fakeVault3', fakeVault3);
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

test.skip('highestRatio ', async t => {
  const { brand } = makeIssuerKit('ducats');
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);
  const cr1 = makeRatio(130n, brand);
  t.deepEqual(vaults.highestRatio(), cr1);

  const fakeVault6 = makeFakeVaultKit(
    'id-fakeVault6',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault6', fakeVault6);
  const cr6 = makeRatio(150n, brand);
  t.deepEqual(vaults.highestRatio(), cr6);

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 140n),
  );
  vaults.addVaultKit('id-fakeVault3', fakeVault3);
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

test.skip('removal by notification', async t => {
  const { brand } = makeIssuerKit('ducats');
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);
  const cr1 = makeRatio(150n, brand);
  t.deepEqual(vaults.highestRatio(), cr1);

  const fakeVault2 = makeFakeVaultKit(
    'id-fakeVault2',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault2);
  t.deepEqual(vaults.highestRatio(), cr1, 'should be new highest');

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 140n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault3);
  const cr3 = makeRatio(140n, brand);
  t.deepEqual(vaults.highestRatio(), cr1, '130 expected');

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
