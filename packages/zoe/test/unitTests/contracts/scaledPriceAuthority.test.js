import { test as unknownTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { makeZoeForTest } from '../../../tools/setup-zoe.js';
import { makeRatio } from '../../../src/contractSupport/ratio.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';
import buildManualTimer from '../../../tools/manualTimer.js';
import { makeManualPriceAuthority } from '../../../tools/manualPriceAuthority.js';

// This contract still uses 'prepare', so this test covers that case.
/**
 * @typedef {object} TestContext
 * @property {ZoeService} zoe
 * @property {Installation<typeof import('../../../src/contracts/scaledPriceAuthority.js').prepare>} scaledPriceInstallation
 * @property {Brand<'nat'>} atomBrand
 * @property {Brand<'nat'>} usdBrand
 * @property {IssuerKit<'nat'>} atom
 * @property {IssuerKit<'nat'>} run
 */

const test = /** @type {import('ava').TestFn<TestContext>} */ (unknownTest);

const dirname = path.dirname(new URL(import.meta.url).pathname);

const scaledPricePath = `${dirname}/../../../src/contracts/scaledPriceAuthority.js`;

test.before('setup scaled price authority', async ot => {
  // Outside of tests, we should use the long-lived Zoe on the
  // testnet. In this test, we must create a new Zoe.
  const { admin, vatAdminState } = makeFakeVatAdmin();
  const zoe = makeZoeForTest(admin);

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
  const { brand: atomBrand } = makeIssuerKit('$ATOM', 'nat', dp(5));
  const { brand: usdBrand } = makeIssuerKit('$USD', 'nat', dp(4));

  const atom = makeIssuerKit('ATOM', 'nat', dp(6));
  const run = makeIssuerKit('RUN', 'nat', dp(6));

  ot.context.zoe = zoe;
  ot.context.scaledPriceInstallation = /** @type {any} */ (
    scaledPriceInstallation
  );
  ot.context.atomBrand = atomBrand;
  ot.context.usdBrand = usdBrand;
  ot.context.atom = atom;
  ot.context.run = run;
});

/**
 * @param {import('ava').ExecutionContext<TestContext>} t
 * @param {bigint} [initialPriceInCents]
 */
const makeScenario = async (t, initialPriceInCents) => {
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
        t.context.atom.brand,
      ),
      scaleOut: makeRatio(
        10n ** 4n,
        t.context.usdBrand,
        10n ** 6n,
        t.context.run.brand,
      ),
      initialPrice: initialPriceInCents
        ? makeRatio(
            initialPriceInCents,
            t.context.run.brand,
            100n,
            t.context.atom.brand,
          )
        : undefined,
    },
  );

  const pa = await E(scaledPrice.publicFacet).getPriceAuthority();

  return { timer, sourcePriceAuthority, makeSourcePrice, pa };
};

test('scaled price authority', async t => {
  const { timer, sourcePriceAuthority, makeSourcePrice, pa } =
    await makeScenario(t);
  const timerBrand = timer.getTimerBrand();

  const notifier = E(pa).makeQuoteNotifier(
    AmountMath.make(t.context.atom.brand, 10n ** 6n),
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
      amountIn: { brand: t.context.atom.brand, value: 10n ** 6n },
      amountOut: { brand: t.context.run.brand, value: 35_610_000n },
      timer,
      timestamp: { timerBrand, absValue: 0n },
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
      timestamp: { timerBrand, absValue: 0n },
    },
  ]);

  await E(timer).tick();
  sourcePriceAuthority.setPrice(makeSourcePrice(10n ** 5n, 32_4301n));
  const {
    value: { quoteAmount: qa2 },
  } = await E(notifier).getUpdateSince(uc1);
  t.deepEqual(qa2.value, [
    {
      amountIn: { brand: t.context.atom.brand, value: 1_000_000n },
      amountOut: { brand: t.context.run.brand, value: 32_430_100n },
      timer,
      timestamp: { timerBrand, absValue: 1n },
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
      timestamp: { timerBrand, absValue: 1n },
    },
  ]);
});

test('mutableQuoteWhenLT: brands in/out match', async t => {
  const { timer, sourcePriceAuthority, makeSourcePrice, pa } =
    await makeScenario(t);
  const timerBrand = timer.getTimerBrand();

  const mutableQuote = E(pa).mutableQuoteWhenLT(
    AmountMath.make(t.context.atom.brand, 10n ** 6n),
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
      timestamp: { timerBrand, absValue: 0n },
    },
  ]);

  await E(timer).tick();
  sourcePriceAuthority.setPrice(makeSourcePrice(10n ** 5n, 30_4301n));
  const { quoteAmount: qa2 } = await E(mutableQuote).getPromise();
  t.deepEqual(qa2.value, [
    {
      amountIn: { brand: t.context.atom.brand, value: 1_000_000n },
      amountOut: { brand: t.context.run.brand, value: 30_430_100n },
      timer,
      timestamp: { timerBrand, absValue: 1n },
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
      timestamp: { timerBrand, absValue: 1n },
    },
  ]);
});

/** @param {Brand<'nat'>} brand */
const unitAmount = async brand => {
  // Brand methods are remote
  const displayInfo = await E(brand).getDisplayInfo();
  const decimalPlaces = displayInfo.decimalPlaces ?? 0;
  return AmountMath.make(brand, 10n ** BigInt(decimalPlaces));
};

test('initialPrice', async t => {
  const { make } = AmountMath;
  const { atom: collateral, run: debt } = t.context;
  const { timer, pa } = await makeScenario(t, 12_34n);
  const timerBrand = timer.getTimerBrand();

  t.log('vault manager makes unit quote notifier');
  const collateralUnit = await unitAmount(collateral.brand);
  const quotes = E(pa).makeQuoteNotifier(collateralUnit, debt.brand);

  t.log('clients can see initial price before source price is available');
  const {
    value: { quoteAmount: qa1 },
    updateCount: uc1,
  } = await E(quotes).getUpdateSince();
  t.deepEqual(
    qa1.value,
    [
      {
        amountIn: { brand: collateral.brand, value: 100n },
        amountOut: { brand: debt.brand, value: 12_34n },
        timer,
        timestamp: { timerBrand, absValue: 0n },
      },
    ],
    'check, for example, manager0.quotes',
  );

  t.log('vault manager gets quote for 500 ATOM');
  const q500 = await E(pa).quoteGiven(make(collateral.brand, 500n), debt.brand);
  t.deepEqual(q500.quoteAmount.value[0].amountOut, make(debt.brand, 6170n));

  t.log('clients get remaining prices as usual');
  const {
    value: { quoteAmount: qa2 },
  } = await E(quotes).getUpdateSince(uc1);
  t.deepEqual(qa2.value, [
    {
      amountIn: { brand: collateral.brand, value: 1_000_000n },
      amountOut: { brand: debt.brand, value: 35_610_000n },
      timer,
      timestamp: { timerBrand, absValue: 0n },
    },
  ]);

  t.log('vault manager gets quote for 400 ATOM at usual price');
  const q400 = await E(pa).quoteGiven(make(collateral.brand, 400n), debt.brand);
  t.deepEqual(q400.quoteAmount.value[0].amountOut, make(debt.brand, 14200n));
});
