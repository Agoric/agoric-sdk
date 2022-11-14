// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import { makeRatio } from '../../../src/contractSupport/ratio.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';
import buildManualTimer from '../../../tools/manualTimer.js';
import { makeManualPriceAuthority } from '../../../tools/manualPriceAuthority.js';

import '../../../exported.js';
import '../../../src/contracts/exported.js';

/**
 * @callback MakeFakePriceOracle
 * @param {ExecutionContext} t
 * @param {bigint} [valueOut]
 * @returns {Promise<OracleKit & { instance: Instance }>}
 */

/**
 * @typedef {object} TestContext
 * @property {ZoeService} zoe
 * @property {Installation<typeof import('../../../src/contracts/scaledPriceAuthority.js').start>} scaledPriceInstallation
 * @property {Brand} atomBrand
 * @property {Brand} usdBrand
 * @property {IssuerKit} ibcAtom
 * @property {IssuerKit} run
 *
 * @typedef {import('ava').ExecutionContext<TestContext>} ExecutionContext
 */

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const scaledPricePath = `${dirname}/../../../src/contracts/scaledPriceAuthority.js`;

test.before(
  'setup scaled price authority',
  /** @param {ExecutionContext} ot */ async ot => {
    // Outside of tests, we should use the long-lived Zoe on the
    // testnet. In this test, we must create a new Zoe.
    const { admin, vatAdminState } = makeFakeVatAdmin();
    const { zoeService: zoe } = makeZoeKit(admin);

    // Pack the contracts.
    const scaledPriceBundle = await bundleSource(scaledPricePath);

    // Install the contract on Zoe, getting an installation. We can
    // use this installation to look up the code we installed. Outside
    // of tests, we can also send the installation to someone
    // else, and they can use it to create a new contract instance
    // using the same code.
    vatAdminState.installBundle('b1-scaled-price-authority', scaledPriceBundle);
    const scaledPriceInstallation = await E(zoe).installBundleID(
      'b1-scaled-price-authority',
    );

    // Pick some weird decimal places.
    const dp = decimalPlaces => harden({ decimalPlaces });
    const { brand: atomBrand } = makeIssuerKit('$ATOM', undefined, dp(5));
    const { brand: usdBrand } = makeIssuerKit('$USD', undefined, dp(4));

    const ibcAtom = makeIssuerKit('IBC-ATOM', undefined, dp(6));
    const run = makeIssuerKit('RUN', undefined, dp(6));

    ot.context.zoe = zoe;
    ot.context.scaledPriceInstallation = /** @type {any} */ (
      scaledPriceInstallation
    );
    ot.context.atomBrand = atomBrand;
    ot.context.usdBrand = usdBrand;
    ot.context.ibcAtom = ibcAtom;
    ot.context.run = run;
  },
);

test('scaled price authority', /** @param {ExecutionContext} t */ async t => {
  const timer = buildManualTimer(t.log);
  const makeSourcePrice = (valueIn, valueOut) =>
    makeRatio(valueOut, t.context.usdBrand, valueIn, t.context.atomBrand);
  const sourcePriceAuthority = makeManualPriceAuthority({
    actualBrandIn: t.context.atomBrand,
    actualBrandOut: t.context.usdBrand,
    initialPrice: makeSourcePrice(10n ** 5n, 35_6100n),
    timer,
  });

  const scaledPrice = await E(t.context.zoe).startInstance(
    t.context.scaledPriceInstallation,
    undefined,
    {
      sourcePriceAuthority,
      scaleIn: makeRatio(
        10n ** 5n,
        t.context.atomBrand,
        10n ** 6n,
        t.context.ibcAtom.brand,
      ),
      scaleOut: makeRatio(
        10n ** 4n,
        t.context.usdBrand,
        10n ** 6n,
        t.context.run.brand,
      ),
    },
  );

  const pa = await E(scaledPrice.publicFacet).getPriceAuthority();

  const notifier = E(pa).makeQuoteNotifier(
    AmountMath.make(t.context.ibcAtom.brand, 10n ** 6n),
    t.context.run.brand,
  );
  const sourceNotifier = E(sourcePriceAuthority).makeQuoteNotifier(
    AmountMath.make(t.context.atomBrand, 10n ** 5n),
    t.context.usdBrand,
  );

  const {
    value: { quoteAmount: qa1 },
    updateCount: uc1,
  } = await E(notifier).getUpdateSince();
  t.deepEqual(qa1.value, [
    {
      amountIn: { brand: t.context.ibcAtom.brand, value: 10n ** 6n },
      amountOut: { brand: t.context.run.brand, value: 35_610_000n },
      timer,
      timestamp: 0n,
    },
  ]);

  const {
    value: { quoteAmount: sqa1 },
    updateCount: suc1,
  } = await E(sourceNotifier).getUpdateSince();
  t.deepEqual(sqa1.value, [
    {
      amountIn: { brand: t.context.atomBrand, value: 10n ** 5n },
      amountOut: { brand: t.context.usdBrand, value: 35_6100n },
      timer,
      timestamp: 0n,
    },
  ]);

  await E(timer).tick();
  sourcePriceAuthority.setPrice(makeSourcePrice(10n ** 5n, 32_4301n));
  const {
    value: { quoteAmount: qa2 },
  } = await E(notifier).getUpdateSince(uc1);
  t.deepEqual(qa2.value, [
    {
      amountIn: { brand: t.context.ibcAtom.brand, value: 1_000_000n },
      amountOut: { brand: t.context.run.brand, value: 32_430_100n },
      timer,
      timestamp: 1n,
    },
  ]);

  const {
    value: { quoteAmount: sqa2 },
  } = await E(sourceNotifier).getUpdateSince(suc1);
  t.deepEqual(sqa2.value, [
    {
      amountIn: { brand: t.context.atomBrand, value: 1_00000n },
      amountOut: { brand: t.context.usdBrand, value: 32_4301n },
      timer,
      timestamp: 1n,
    },
  ]);
});

test('mutableQuoteWhenLT: brands in/out match', /** @param {ExecutionContext} t */ async t => {
  const timer = buildManualTimer(t.log);
  const makeSourcePrice = (valueIn, valueOut) =>
    makeRatio(valueOut, t.context.usdBrand, valueIn, t.context.atomBrand);
  const sourcePriceAuthority = makeManualPriceAuthority({
    actualBrandIn: t.context.atomBrand,
    actualBrandOut: t.context.usdBrand,
    initialPrice: makeSourcePrice(10n ** 5n, 35_6100n),
    timer,
  });

  const scaledPrice = await E(t.context.zoe).startInstance(
    t.context.scaledPriceInstallation,
    undefined,
    {
      sourcePriceAuthority,
      scaleIn: makeRatio(
        10n ** 5n,
        t.context.atomBrand,
        10n ** 6n,
        t.context.ibcAtom.brand,
      ),
      scaleOut: makeRatio(
        10n ** 4n,
        t.context.usdBrand,
        10n ** 6n,
        t.context.run.brand,
      ),
    },
  );

  const pa = await E(scaledPrice.publicFacet).getPriceAuthority();

  const mutableQuote = E(pa).mutableQuoteWhenLT(
    AmountMath.make(t.context.ibcAtom.brand, 10n ** 6n),
    AmountMath.make(t.context.run.brand, 32_430_100n),
  );
  const sourceNotifier = E(sourcePriceAuthority).makeQuoteNotifier(
    AmountMath.make(t.context.atomBrand, 10n ** 5n),
    t.context.usdBrand,
  );

  const {
    value: { quoteAmount: sqa1 },
    updateCount: suc1,
  } = await E(sourceNotifier).getUpdateSince();
  t.deepEqual(sqa1.value, [
    {
      amountIn: { brand: t.context.atomBrand, value: 10n ** 5n },
      amountOut: { brand: t.context.usdBrand, value: 35_6100n },
      timer,
      timestamp: 0n,
    },
  ]);

  await E(timer).tick();
  sourcePriceAuthority.setPrice(makeSourcePrice(10n ** 5n, 30_4301n));
  const { quoteAmount: qa2 } = await E(mutableQuote).getPromise();
  t.deepEqual(qa2.value, [
    {
      amountIn: { brand: t.context.ibcAtom.brand, value: 1_000_000n },
      amountOut: { brand: t.context.run.brand, value: 30_430_100n },
      timer,
      timestamp: 1n,
    },
  ]);

  // check source quote
  const {
    value: { quoteAmount: sqa2 },
  } = await E(sourceNotifier).getUpdateSince(suc1);
  t.deepEqual(sqa2.value, [
    {
      amountIn: { brand: t.context.atomBrand, value: 1_00000n },
      amountOut: { brand: t.context.usdBrand, value: 30_4301n },
      timer,
      timestamp: 1n,
    },
  ]);
});
