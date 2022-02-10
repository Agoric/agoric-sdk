/* global setImmediate */
// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makePromiseKit } from '@agoric/promise-kit';

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
    getPercentages: () => ratios.map(r => Number(r.numerator.value)),
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

const { brand } = makeIssuerKit('ducats');
const percent = n => makeRatio(BigInt(n), brand);

test('add to vault', async t => {
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);
  const fakeVaultKit = makeFakeVaultKit(
    'id-fakeVaultKit',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVaultKit', fakeVaultKit);
  const collector = makeCollector();
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), collector.lookForRatio);

  t.deepEqual(collector.getPercentages(), [130], 'expected vault');
  t.truthy(rescheduler.called(), 'should call reschedule()');
  // FIXME is it material that this be undefined?
  // t.deepEqual(vaults.highestRatio(), undefined);
});

test('updates', async t => {
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
  t.deepEqual(collector.getPercentages(), [80, 20]);
  t.falsy(rescheduler.called(), 'second vault did not call reschedule()');
  // FIXME is it material that this be undefined?
  // t.deepEqual(vaults.highestRatio(), undefined);
});

test('update changes ratio', async t => {
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

  t.deepEqual(Array.from(Array.from(vaults.entries()).map(([k, _v]) => k)), [
    'fbff4000000000000:id-fakeVault2',
    'fc014000000000000:id-fakeVault1',
  ]);

  t.deepEqual(vaults.highestRatio(), percent(80));

  // update the fake debt of the vault and then refresh priority queue
  fakeVault1.vault.setDebt(AmountMath.make(brand, 95n));
  vaults.refreshVaultPriority(
    AmountMath.make(brand, 20n),
    AmountMath.make(brand, 100n), // default collateral of makeFakeVaultKit
    'id-fakeVault1',
  );

  await waitForPromisesToSettle();
  t.deepEqual(vaults.highestRatio(), percent(95));

  const newCollector = makeCollector();
  rescheduler.resetCalled();
  vaults.forEachRatioGTE(percent(90), newCollector.lookForRatio);
  t.deepEqual(
    newCollector.getPercentages(),
    [95],
    'only one is higher than 90%',
  );
  t.deepEqual(vaults.highestRatio(), percent(95));
  t.falsy(rescheduler.called(), 'foreach does not trigger rescheduler'); // change from previous implementation
});

test('removals', async t => {
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  // Add fakes 1,2,3
  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);
  const fakeVault2 = makeFakeVaultKit(
    'id-fakeVault2',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVault2', fakeVault2);

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 140n),
  );
  vaults.addVaultKit('id-fakeVault3', fakeVault3);

  // remove fake 3
  rescheduler.resetCalled();
  vaults.removeVaultByAttributes(
    AmountMath.make(brand, 140n),
    AmountMath.make(brand, 100n), // default collateral of makeFakeVaultKit
    'id-fakeVault3',
  );
  t.falsy(rescheduler.called());
  t.deepEqual(vaults.highestRatio(), percent(150), 'should be 150');

  // remove fake 1
  rescheduler.resetCalled();
  vaults.removeVaultByAttributes(
    AmountMath.make(brand, 150n),
    AmountMath.make(brand, 100n), // default collateral of makeFakeVaultKit
    'id-fakeVault1',
  );
  t.falsy(rescheduler.called(), 'should not call reschedule on removal');
  t.deepEqual(vaults.highestRatio(), percent(130), 'should be 130');

  t.throws(() =>
    vaults.removeVaultByAttributes(
      AmountMath.make(brand, 150n),
      AmountMath.make(brand, 100n),
      'id-fakeVault1',
    ),
  );
});

test('highestRatio', async t => {
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 30n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);
  const cr1 = percent(30);
  t.deepEqual(vaults.highestRatio(), cr1);

  const fakeVault6 = makeFakeVaultKit(
    'id-fakeVault6',
    AmountMath.make(brand, 50n),
  );
  vaults.addVaultKit('id-fakeVault6', fakeVault6);
  const cr6 = percent(50);
  t.deepEqual(vaults.highestRatio(), cr6);

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 40n),
  );
  vaults.addVaultKit('id-fakeVault3', fakeVault3);

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
  vaults.forEachRatioGTE(percent(45), (key, vk) =>
    debtsOverThreshold.push([
      vk.vault.getDebtAmount(),
      vk.vault.getCollateralAmount(),
    ]),
  );

  t.deepEqual(debtsOverThreshold, [
    [fakeVault6.vault.getDebtAmount(), fakeVault6.vault.getCollateralAmount()],
  ]);
  t.deepEqual(vaults.highestRatio(), percent(50), 'expected 50% to be highest');
});

test.skip('removal by notification', async t => {
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);
  const cr1 = percent(150);
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
