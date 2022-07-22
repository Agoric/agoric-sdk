// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints.js';

import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { E, Far } from '@endo/far';
import { makeFeeDistributor } from '../src/feeDistributor.js';

/**
 * @param {Issuer} feeIssuer
 */
const makeFakeFeeDepositFacetKit = feeIssuer => {
  const depositPayments = [];

  const feeDepositFacet = {
    async receive(pmt) {
      depositPayments.push(pmt);
      return E(feeIssuer).getAmountOf(pmt);
    },
  };

  const getPayments = () =>
    // await event loop so the receive() can run
    Promise.resolve(eventLoopIteration()).then(_ => depositPayments);

  return { feeDepositFacet, getPayments };
};

const makeFakeFeeProducer = (makeEmptyPayment = () => {}) => {
  const feePayments = [];
  return Far('feeCollector', {
    collectFees: () => feePayments.shift() || makeEmptyPayment(),

    // tools for the fake:
    pushFees: payment => feePayments.push(payment),
  });
};
/**
 *
 * @param {*} t
 * @param {Promise<Payment[]>} paymentsP
 * @param {number} count
 * @param {*} values
 * @param {Issuer} issuer
 * @param {Brand} brand
 */
const assertPaymentArray = async (
  t,
  paymentsP,
  count,
  values,
  issuer,
  brand,
) => {
  const payments = await paymentsP;
  for (let i = 0; i < count; i += 1) {
    // XXX https://github.com/Agoric/agoric-sdk/issues/5527
    // eslint-disable-next-line no-await-in-loop
    await assertPayoutAmount(
      t,
      issuer,
      payments[i],
      AmountMath.make(brand, values[i]),
    );
  }
};

test('fee distribution', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const { feeDepositFacet, getPayments } = makeFakeFeeDepositFacetKit(issuer);
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

  t.deepEqual(await getPayments(), []);

  await timerService.tick();

  await assertPaymentArray(t, getPayments(), 2, [500n, 270n], issuer, brand);
});

test('fee distribution, leftovers', async t => {
  const { brands, moolaIssuer: issuer, moolaMint: runMint } = setup();
  const brand = brands.get('moola');
  const { feeDepositFacet, getPayments } = makeFakeFeeDepositFacetKit(issuer);
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

  t.deepEqual(await getPayments(), []);

  await timerService.tick();

  await assertPaymentArray(t, getPayments(), 2, [12n, 8n], issuer, brand);

  // Pay them again
  vaultFactory.pushFees(runMint.mintPayment(AmountMath.make(brand, 13n)));
  amm.pushFees(runMint.mintPayment(AmountMath.make(brand, 7n)));

  await timerService.tick();

  await assertPaymentArray(
    t,
    getPayments().then(p => p.slice(2)),
    2,
    [13n, 7n],
    issuer,
    brand,
  );
});
