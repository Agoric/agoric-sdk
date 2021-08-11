// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints.js';

import { makePromiseKit } from '@agoric/promise-kit';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { E } from '@agoric/eventual-send';
import { buildDistributor } from '../src/distributeFees.js';

// Some notifier updates aren't propogating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
async function waitForPromisesToSettle() {
  const pk = makePromiseKit();
  // eslint-disable-next-line no-undef
  setImmediate(pk.resolve);
  return pk.promise;
}

/**
 * @param {Issuer} feeIssuer
 */
function makeFakeFeeDepositFacet(feeIssuer) {
  const depositPayments = [];

  const feeDepositFacet = {
    async receive(pmt) {
      depositPayments.push(pmt);
      return E(feeIssuer).getAmountOf(pmt);
    },
  };

  return { feeDepositFacet, getPayments: _ => depositPayments };
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
    assertPayoutAmount(t, issuer, payments[i], AmountMath.make(brand, value));
  }
}

test('fee distribution', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const { feeDepositFacet, getPayments } = makeFakeFeeDepositFacet(issuer);
  const treasury = makeFakeTreasury();
  const epochTimer = buildManualTimer(console.log);
  const distributorParams = {
    epochInterval: 1n,
  };
  buildDistributor(
    treasury,
    feeDepositFacet,
    epochTimer,
    distributorParams,
  ).catch(e => {
    t.fail(e.stack);
  });

  treasury.pushFees(runMint.mintPayment(AmountMath.make(brand, 500n)));

  t.deepEqual(getPayments(), []);

  await epochTimer.tick();
  await waitForPromisesToSettle();

  assertPaymentArray(t, getPayments(), 1, 500, issuer, brand);
});

test('fee distribution, leftovers', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const { feeDepositFacet, getPayments } = makeFakeFeeDepositFacet(issuer);
  const treasury = makeFakeTreasury();
  const epochTimer = buildManualTimer(console.log);
  const distributorParams = {
    epochInterval: 1n,
  };
  buildDistributor(treasury, feeDepositFacet, epochTimer, distributorParams);

  treasury.pushFees(runMint.mintPayment(AmountMath.make(brand, 12n)));

  t.deepEqual(getPayments(), []);

  await epochTimer.tick();
  await waitForPromisesToSettle();

  assertPaymentArray(t, getPayments(), 1, 12, issuer, brand);

  // Pay them again
  treasury.pushFees(runMint.mintPayment(AmountMath.make(brand, 13n)));

  await epochTimer.tick();
  await waitForPromisesToSettle();

  assertPaymentArray(t, getPayments().slice(1), 1, 13, issuer, brand);
});
