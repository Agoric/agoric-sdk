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

test.skip('update changes ratio', async t => {
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

  t.deepEqual(vaults.highestRatio(), percent(180));

  fakeVault1.vault.setDebt(AmountMath.make(brand, 200n));
  await waitForPromisesToSettle();
  t.deepEqual(vaults.highestRatio(), percent(200));

  const newCollector = makeCollector();
  rescheduler.resetCalled();
  vaults.forEachRatioGTE(percent(190), newCollector.lookForRatio);
  t.deepEqual(
    newCollector.getPercentages(),
    [200],
    'only one is higher than 190',
  );
  t.deepEqual(vaults.highestRatio(), percent(180));
  t.truthy(rescheduler.called(), 'called rescheduler when foreach found vault');
});

test.skip('removals', async t => {
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

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

  rescheduler.resetCalled();
  vaults.removeVault('id-fakeVault3', fakeVault3.vault);
  t.falsy(rescheduler.called());
  t.deepEqual(vaults.highestRatio(), percent(150), 'should be 150');

  rescheduler.resetCalled();
  vaults.removeVault('id-fakeVault1', fakeVault1.vault);
  t.falsy(rescheduler.called(), 'should not call reschedule on removal');
  t.deepEqual(vaults.highestRatio(), percent(130), 'should be 130');
});

// FIXME this relied on special logic of forEachRatioGTE
test.skip('chargeInterest', async t => {
  const rescheduler = makeRescheduler();
  const vaults = makePrioritizedVaults(rescheduler.fakeReschedule);

  const kit1 = makeFakeVaultKit('id-fakeVault1', AmountMath.make(brand, 130n));
  vaults.addVaultKit('id-fakeVault1', kit1);

  const kit2 = makeFakeVaultKit('id-fakeVault2', AmountMath.make(brand, 150n));
  vaults.addVaultKit('id-fakeVault2', kit2);

  const touchedVaults = [];
  vaults.forEachRatioGTE(makeRatio(1n, brand, 10n), (_vaultId, { vault }) =>
    touchedVaults.push([
      vault,
      makeRatioFromAmounts(vault.getDebtAmount(), vault.getCollateralAmount()),
    ]),
  );
  t.deepEqual(touchedVaults, [
    [kit2.vault, percent(150)],
    [kit1.vault, percent(130)],
  ]);
});

// FIXME this relied on special logic of forEachRatioGTE
test.skip('liquidation', async t => {
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

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 140n),
  );
  vaults.addVaultKit('id-fakeVault3', fakeVault3);

  const touchedVaults = [];
  vaults.forEachRatioGTE(percent(135), vaultPair =>
    touchedVaults.push(vaultPair),
  );

  t.deepEqual(touchedVaults, [
    { vaultKit: fakeVault2, debtToCollateral: percent(150) },
    { vaultKit: fakeVault3, debtToCollateral: percent(140) },
  ]);
});

test.skip('highestRatio ', async t => {
  const reschedulePriceCheck = makeRescheduler();
  const vaults = makePrioritizedVaults(reschedulePriceCheck.fakeReschedule);

  const fakeVault1 = makeFakeVaultKit(
    'id-fakeVault1',
    AmountMath.make(brand, 130n),
  );
  vaults.addVaultKit('id-fakeVault1', fakeVault1);
  const cr1 = percent(130);
  t.deepEqual(vaults.highestRatio(), cr1);

  const fakeVault6 = makeFakeVaultKit(
    'id-fakeVault6',
    AmountMath.make(brand, 150n),
  );
  vaults.addVaultKit('id-fakeVault6', fakeVault6);
  const cr6 = percent(150);
  t.deepEqual(vaults.highestRatio(), cr6);

  const fakeVault3 = makeFakeVaultKit(
    'id-fakeVault3',
    AmountMath.make(brand, 140n),
  );
  vaults.addVaultKit('id-fakeVault3', fakeVault3);
  const cr3 = percent(140);

  const touchedVaults = [];
  vaults.forEachRatioGTE(percent(145), vaultPair =>
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
