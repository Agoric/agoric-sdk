// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints.js';

import { makePromiseKit } from '@endo/promise-kit';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { E, Far } from '@endo/far';
import { makeFeeDistributor } from '../src/feeDistributor.js';

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

function makeFakeFeeProducer(makeEmptyPayment = () => {}) {
  const feePayments = [];
  return Far('feeCollector', {
    collectFees: () => feePayments.shift() || makeEmptyPayment(),

    // tools for the fake:
    pushFees: payment => feePayments.push(payment),
  });
}

function assertPaymentArray(t, payments, count, values, issuer, brand) {
  for (let i = 0; i < count; i += 1) {
    assertPayoutAmount(
      t,
      issuer,
      payments[i],
      AmountMath.make(brand, values[i]),
    );
  }
}

test('fee distribution', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const { feeDepositFacet, getPayments } = makeFakeFeeDepositFacet(issuer);
  const makeEmptyPayment = () =>
    runMint.mintPayment(AmountMath.makeEmpty(brand));
  const vaultFactory = makeFakeFeeProducer(makeEmptyPayment);
  const amm = makeFakeFeeProducer(makeEmptyPayment);
  const timerService = buildManualTimer(t.log);
  const { creatorFacet } = await makeFeeDistributor(issuer, {
    timerService,
    collectionInterval: 1n,
    keywordShares: {
      Rewards: 3n,
    },
  });

  const feeCollectors = {
    vaultFactory,
    amm,
  };
  await Promise.all(
    Object.entries(feeCollectors).map(async ([debugName, collector]) => {
      await creatorFacet.startPeriodicCollection(debugName, collector);
    }),
  );

  const rewardsDestination =
    creatorFacet.makeDepositFacetDestination(feeDepositFacet);
  await creatorFacet.setDestinations({ Rewards: rewardsDestination });

  vaultFactory.pushFees(runMint.mintPayment(AmountMath.make(brand, 500n)));
  amm.pushFees(runMint.mintPayment(AmountMath.make(brand, 270n)));

  t.deepEqual(getPayments(), []);

  await timerService.tick();
  await waitForPromisesToSettle();

  await assertPaymentArray(t, getPayments(), 2, [500n, 270n], issuer, brand);
});

test('fee distribution, leftovers', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const { feeDepositFacet, getPayments } = makeFakeFeeDepositFacet(issuer);
  const makeEmptyPayment = () =>
    runMint.mintPayment(AmountMath.makeEmpty(brand));
  const vaultFactory = makeFakeFeeProducer(makeEmptyPayment);
  const amm = makeFakeFeeProducer(makeEmptyPayment);
  const timerService = buildManualTimer(t.log);
  const { creatorFacet } = await makeFeeDistributor(issuer, {
    timerService,
    collectionInterval: 1n,
    keywordShares: {
      Rewards: 6n,
    },
  });

  const feeCollectors = {
    vaultFactory,
    amm,
  };
  await Promise.all(
    Object.entries(feeCollectors).map(async ([debugName, collector]) => {
      await creatorFacet.startPeriodicCollection(debugName, collector);
    }),
  );

  const rewardsDestination =
    creatorFacet.makeDepositFacetDestination(feeDepositFacet);
  await creatorFacet.setDestinations({ Rewards: rewardsDestination });

  vaultFactory.pushFees(runMint.mintPayment(AmountMath.make(brand, 12n)));
  amm.pushFees(runMint.mintPayment(AmountMath.make(brand, 8n)));

  t.deepEqual(getPayments(), []);

  await timerService.tick();
  await waitForPromisesToSettle();

  assertPaymentArray(t, getPayments(), 2, [12n, 8n], issuer, brand);

  // Pay them again
  vaultFactory.pushFees(runMint.mintPayment(AmountMath.make(brand, 13n)));
  amm.pushFees(runMint.mintPayment(AmountMath.make(brand, 7n)));

  await timerService.tick();
  await waitForPromisesToSettle();

  await assertPaymentArray(
    t,
    getPayments().slice(2),
    2,
    [13n, 7n],
    issuer,
    brand,
  );
});
