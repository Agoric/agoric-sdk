// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { amountMath } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints';

import { makePromiseKit } from '@agoric/promise-kit';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers';
import { buildDistributor } from '../src/distributeFees';

// Some notifier updates aren't propogating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
async function waitForPromisesToSettle() {
  const pk = makePromiseKit();
  // eslint-disable-next-line no-undef
  setImmediate(pk.resolve);
  return pk.promise;
}

function makeFakeBank() {
  const depositAccounts = [];
  const depositPayments = [];
  const { notifier, updater } = makeNotifierKit();

  return {
    getAccountsNotifier: () => notifier,
    deposit: async (brand, a, p) => {
      depositAccounts.push(a);
      depositPayments.push(p);
      // success or failure is all that matters for the test
      return amountMath.makeEmpty(brand);
    },

    // tools for the fake:
    getUpdater: _ => updater,
    getAccounts: _ => depositAccounts,
    getPayments: _ => depositPayments,
  };
}

function makeFakeTreasury() {
  const feePayments = [];
  return {
    collectFees: () => feePayments.pop(),

    // tools for the fake:
    pushFees: payment => feePayments.push(payment),
  };
}

function assertPaymentArray(t, payments, count, value, issuer, brand) {
  for (let i = 0; i < count; i += 1) {
    assertPayoutAmount(t, issuer, payments[i], amountMath.make(brand, value));
  }
}

test('fee distribution', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const bank = makeFakeBank();
  const bankUpdater = bank.getUpdater();
  const treasury = makeFakeTreasury();
  const epochTimer = buildManualTimer(console.log);
  const distributorParams = {
    epochInterval: 1n,
    runIssuer: issuer,
    runBrand: brand,
  };
  buildDistributor(treasury, bank, epochTimer, distributorParams);

  treasury.pushFees(runMint.mintPayment(amountMath.make(brand, 500n)));
  bankUpdater.updateState(['a37', 'a2389', 'a274', 'a16', 'a1772']);

  t.deepEqual(bank.getAccounts(), []);
  t.deepEqual(bank.getPayments(), []);

  await epochTimer.tick();
  await waitForPromisesToSettle();

  t.deepEqual(bank.getAccounts(), ['a37', 'a2389', 'a274', 'a16', 'a1772']);
  assertPaymentArray(t, bank.getPayments(), 5, 100, issuer, brand);
});

test('fee distribution, leftovers', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const bank = makeFakeBank();
  const bankUpdater = bank.getUpdater();
  const treasury = makeFakeTreasury();
  const epochTimer = buildManualTimer(console.log);
  const distributorParams = {
    epochInterval: 1n,
    runIssuer: issuer,
    runBrand: brand,
  };
  buildDistributor(treasury, bank, epochTimer, distributorParams);

  treasury.pushFees(runMint.mintPayment(amountMath.make(brand, 12n)));
  bankUpdater.updateState(['a37', 'a2389', 'a274', 'a16', 'a1772']);

  t.deepEqual(bank.getAccounts(), []);
  t.deepEqual(bank.getPayments(), []);

  await epochTimer.tick();
  await waitForPromisesToSettle();

  t.deepEqual(bank.getAccounts(), ['a37', 'a2389', 'a274', 'a16', 'a1772']);
  assertPaymentArray(t, bank.getPayments(), 5, 2, issuer, brand);

  // Pay them again
  treasury.pushFees(runMint.mintPayment(amountMath.make(brand, 13n)));

  await epochTimer.tick();
  await waitForPromisesToSettle();

  t.deepEqual(bank.getAccounts(), [
    'a37',
    'a2389',
    'a274',
    'a16',
    'a1772',
    'a37',
    'a2389',
    'a274',
    'a16',
    'a1772',
  ]);
  assertPaymentArray(t, bank.getPayments().slice(5), 5, 3, issuer, brand);
});
