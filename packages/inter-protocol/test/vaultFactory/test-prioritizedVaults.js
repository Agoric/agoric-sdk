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
import { toVaultKey } from '../../src/vaultFactory/storeUtils.js';

/** @typedef {import('../../src/vaultFactory/vault.js').Vault} Vault */

const MINIMAL_VAULT_KEY = 'id.';

const { brand } = makeIssuerKit('ducats');
const percent = n => makeRatio(BigInt(n), brand);

const makeCollector = () => {
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
};

test('add to vault', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const vaults = makePrioritizedVaults(store);
  const fakeVault = makeFakeVault(
    'id-fakeVaultKit',
    AmountMath.make(brand, 130n),
  );
  vaults.addVault('id-fakeVaultKit', fakeVault);
  const collector = makeCollector();
  const crKey = toVaultKey(
    // @ts-expect-error cast
    AmountMath.make(brand, 1n),
    AmountMath.make(brand, 10n),
    MINIMAL_VAULT_KEY,
  );

  const vaultsToLiquidate = vaults.removeVaultsBelow(crKey);
  for (const entry of vaultsToLiquidate.entries()) {
    collector.lookForRatio(entry);
  }

  t.deepEqual(collector.getPercentages(), [130], 'expected vault');
  t.deepEqual([...vaultsToLiquidate.values()], [fakeVault]);
});

test('updates', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const vaults = makePrioritizedVaults(store);
  const fakeVault1 = makeFakeVault(
    'id1-fakeVaultKit',
    AmountMath.make(brand, 20n),
  );
  const fakeVault2 = makeFakeVault(
    'id2-fakeVaultKit',
    AmountMath.make(brand, 80n),
  );

  vaults.addVault('id-fakeVault1', fakeVault1);
  vaults.addVault('id-fakeVault2', fakeVault2);

  const crKey = toVaultKey(
    // @ts-expect-error cast
    AmountMath.make(brand, 1n),
    AmountMath.make(brand, 10n),
    MINIMAL_VAULT_KEY,
  );
  const vaultsToLiquidate = vaults.removeVaultsBelow(crKey);
  const collector = makeCollector();
  Array.from(vaultsToLiquidate.entries()).map(collector.lookForRatio);

  t.deepEqual(collector.getPercentages(), [80, 20], 'expected vault');
});

test('update changes ratio', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const vaults = makePrioritizedVaults(store);

  // default collateral of makeFakeVaultKit
  const defaultCollateral = AmountMath.make(brand, 100n);

  const fakeVault1InitialDebt = AmountMath.make(brand, 20n);

  const fakeVaultID1 = 'id-fakeVault1';
  const fakeVault1 = makeFakeVault(fakeVaultID1, fakeVault1InitialDebt);
  vaults.addVault(fakeVaultID1, fakeVault1);
  t.true(
    vaults.hasVaultByAttributes(
      // @ts-expect-error cast
      fakeVault1InitialDebt,
      defaultCollateral,
      fakeVaultID1,
    ),
  );
  t.true(
    vaults.hasVaultByAttributes(
      // @ts-expect-error cast
      fakeVault1InitialDebt,
      defaultCollateral,
      fakeVaultID1,
    ),
  );

  const fakeVaultID2 = 'id-fakeVault2';
  const fakeVault2 = makeFakeVault(fakeVaultID2, AmountMath.make(brand, 80n));
  vaults.addVault(fakeVaultID2, fakeVault2);

  t.deepEqual(Array.from(Array.from(vaults.entries()).map(([k, _v]) => k)), [
    `fbff4000000000000:${fakeVaultID2}`,
    `fc014000000000000:${fakeVaultID1}`,
  ]);

  t.deepEqual(vaults.highestRatio(), percent(80));

  // update the fake debt of the vault and then add/remove to refresh priority queue
  fakeVault1.setDebt(AmountMath.make(brand, 95n));
  const removedVault = vaults.removeVaultByAttributes(
    // @ts-expect-error cast
    fakeVault1InitialDebt,
    defaultCollateral,
    fakeVaultID1,
  );
  t.is(removedVault, fakeVault1);
  vaults.addVault(fakeVaultID1, removedVault);
  // 95n from setDebt / 100n defaultCollateral
  t.deepEqual(vaults.highestRatio(), percent(95));

  const crKey = toVaultKey(
    // @ts-expect-error cast
    AmountMath.make(brand, 90n),
    AmountMath.make(brand, 100n),
    MINIMAL_VAULT_KEY,
  );

  const vaultsRemoved = vaults.removeVaultsBelow(crKey);

  const collector = makeCollector();
  Array.from(vaultsRemoved.entries()).map(collector.lookForRatio);
  t.deepEqual(collector.getPercentages(), [95], 'only one is higher than 90%');
  t.deepEqual(vaults.highestRatio(), percent(80n));
});

test('removals', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const vaults = makePrioritizedVaults(store);

  const fakeVaultID1 = 'id-fakeVault1';
  // Add fakes 1,2,3
  vaults.addVault(
    fakeVaultID1,
    makeFakeVault(fakeVaultID1, AmountMath.make(brand, 150n)),
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
  vaults.removeVaultByAttributes(
    // @ts-expect-error cast
    AmountMath.make(brand, 140n),
    AmountMath.make(brand, 100n), // default collateral of makeFakeVaultKit
    'id-fakeVault3',
  );
  t.deepEqual(vaults.highestRatio(), percent(150), 'should be 150');

  // remove fake 1
  vaults.removeVaultByAttributes(
    // @ts-expect-error cast
    AmountMath.make(brand, 150n),
    AmountMath.make(brand, 100n), // default collateral of makeFakeVaultKit
    fakeVaultID1,
  );
  t.deepEqual(vaults.highestRatio(), percent(130), 'should be 130');

  t.throws(() =>
    vaults.removeVaultByAttributes(
      // @ts-expect-error cast
      AmountMath.make(brand, 150n),
      AmountMath.make(brand, 100n),
      fakeVaultID1,
    ),
  );
});

test('stable ordering as interest accrues', async t => {
  const store = makeScalarBigMapStore('orderedVaultStore');
  const vaults = makePrioritizedVaults(store);

  const fakeVaultID1 = 'id-fakeVault1';
  const m = makeCompoundedInterestProvider(brand);

  // ACTUAL DEBTS AFTER 100% DAILY INTEREST
  // day 0
  // v1: 10 / 100
  // v2: 20 / 100 HIGHEST
  const v1 = makeFakeVault(
    fakeVaultID1,
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
  vaults.addVault(fakeVaultID1, v1);
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
