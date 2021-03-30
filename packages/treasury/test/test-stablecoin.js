// @ts-check
/* global require */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import '../src/types';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';

import { makeZoe } from '@agoric/zoe';
import { makeIssuerKit, MathKind, amountMath } from '@agoric/ertp';

import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeRatio, multiplyBy } from '@agoric/zoe/src/contractSupport/ratio';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeTracer } from '../src/makeTracer';

const stablecoinRoot = '../src/stablecoinMachine.js';
const liquidationRoot = '../src/liquidateMinimum.js';
const autoswapRoot =
  '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap';
const trace = makeTracer('TestST');

const BASIS_POINTS = 10000n;
const PERCENT = 100n;

function setUpZoeForTest(setJig) {
  const { makeFar, makeNear } = makeLoopback('zoeTest');
  let isFirst = true;
  function makeRemote(arg) {
    const result = isFirst ? makeNear(arg) : arg;
    // this seems fragile. It relies on one contract being created first by Zoe
    isFirst = !isFirst;
    return result;
  }

  /**
   * These properties will be asssigned by `setJig` in the contract.
   *
   * @typedef {Object} TestContext
   * @property {ContractFacet} zcf
   * @property {IssuerRecord} stablecoin
   * @property {IssuerRecord} governance
   * @property {ERef<MultipoolAutoswapPublicFacet>} autoswap
   */

  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(makeZoe(makeFakeVatAdmin(setJig, makeRemote).admin));
  trace('makeZoe');
  return zoe;
}

async function makeInstall(sourceRoot, zoe) {
  const path = require.resolve(sourceRoot);
  const contractBundle = await bundleSource(path);
  const install = E(zoe).install(contractBundle);
  trace('install', sourceRoot, install);
  return install;
}

function setupAssets() {
  // setup collateral assets
  const aethKit = makeIssuerKit('aEth');

  trace('setup assets');
  return harden({
    aethKit,
  });
}

const makePriceAuthority = (
  brandIn,
  brandOut,
  priceList,
  tradeList,
  timer,
  quoteMint,
  unitAmountIn,
) => {
  const options = {
    actualBrandIn: brandIn,
    actualBrandOut: brandOut,
    priceList,
    tradeList,
    timer,
    quoteMint,
    unitAmountIn,
  };
  return makeFakePriceAuthority(options);
};

function makeRates(sconesBrand, aethBrand) {
  return harden({
    // exchange rate
    initialPrice: makeRatio(201n, sconesBrand, PERCENT, aethBrand),
    // margin required to open a loan
    initialMargin: makeRatio(120n, sconesBrand),
    // margin required to maintain a loan
    liquidationMargin: makeRatio(105n, sconesBrand),
    // periodic interest rate (per charging period)
    interestRate: makeRatio(100n, sconesBrand, BASIS_POINTS),
    // charge to create or increase loan balance
    loanFee: makeRatio(500n, sconesBrand, BASIS_POINTS),
  });
}

test('first', async t => {
  /* @type {TestContext} */
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
    },
  );

  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;

  const { issuer: sconeIssuer, brand: sconeBrand } = stablecoin;

  const { brand: govBrand } = governance;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // priceAuthority needs sconeBrand, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [500n, 15n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(900n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: amountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  /** @type {VaultManager} */
  const aethVaultManager = await E(aethVaultSeat).getOfferResult();

  // Create a loan for 470 scones with 1100 aeth collateral
  const collateralAmount = amountMath.make(1100n, aethBrand);
  const loanAmount = amountMath.make(470n, sconeBrand);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, _liquidationPayout } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(amountMath.make(470n, sconeBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    amountMath.add(loanAmount, fee),
    'vault lent 470 Scones',
  );
  trace('correct debt', debtAmount);

  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  const loanProceeds = await E(loanSeat).getPayouts();
  const sconesLent = await loanProceeds.Scones;
  // const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  t.deepEqual(lentAmount, loanAmount, 'received 47 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    amountMath.make(1100n, aethBrand),
    'vault holds 1100 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = amountMath.make(100n, aethBrand);
  const paybackAmount = amountMath.make(200n, sconeBrand);
  const [paybackPayment, _remainingPayment] = await E(sconeIssuer).split(
    sconesLent,
    paybackAmount,
  );

  const seat = await E(zoe).offer(
    vault.makeAdjustBalancesInvitation(),
    harden({
      give: { Scones: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({
      Scones: paybackPayment,
    }),
  );
  await E(seat).getOfferResult();

  const { Collateral: returnedCollateral } = await E(seat).getPayouts();
  const returnedAmount = await aethIssuer.getAmountOf(returnedCollateral);
  t.deepEqual(
    vault.getDebtAmount(),
    amountMath.make(293n, sconeBrand),
    'debt reduced to 293 scones',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    amountMath.make(1000n, aethBrand),
    'vault holds 1000 Collateral',
  );
  t.deepEqual(
    returnedAmount,
    amountMath.make(100n, aethBrand),
    'withdrew 100 collateral',
  );

  console.log('preDEBT ', vault.getDebtAmount());

  await E(aethVaultManager).liquidateAll();
  console.log('DEBT ', vault.getDebtAmount());
  t.truthy(amountMath.isEmpty(vault.getDebtAmount()), 'debt is paid off');
  console.log('COLLATERAL ', vault.getCollateralAmount());
  t.truthy(amountMath.isEmpty(vault.getCollateralAmount()), 'vault is cleared');

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: amountMath.make(23n, sconeBrand),
  });
});

test('price drop', async t => {
  /* @type {TestContext} */
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  // When the price falls to 160, the loan will get liquidated. 160 for 900
  // Aeth is 5.6 each. The loan is 470 scones, the collateral is worth 160.
  // The margin is 1.2, so at 160, the collateral could support a loan of 192.

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);

  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
    },
  );

  const { stablecoin, governance } = testJig;

  const { issuer: sconeIssuer, brand: sconeBrand } = stablecoin;
  const { brand: govBrand } = governance;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [1000n, 677n, 636n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(900n, aethBrand),
  );
  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 scones/aeth rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: amountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultSeat).getOfferResult();

  // Create a loan for 270 scones with 40 aeth collateral
  const collateralAmount = amountMath.make(400n, aethBrand);
  const loanAmount = amountMath.make(270n, sconeBrand);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, liquidationPayout, uiNotifier } = await E(
    loanSeat,
  ).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(amountMath.make(270n, sconeBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    amountMath.add(loanAmount, fee),
    'borrower owes 283 Scones',
  );

  const notification1 = await uiNotifier.getUpdateSince();
  t.falsy(notification1.value.liquidated);
  t.deepEqual(
    await notification1.value.collateralizationRatio,
    makeRatio(444n, sconeBrand, 283n),
  );
  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.truthy(amountMath.isEqual(lentAmount, loanAmount), 'received 470 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    amountMath.make(400n, aethBrand),
    'vault holds 11 Collateral',
  );

  await manualTimer.tick();
  const notification2 = await uiNotifier.getUpdateSince();
  t.is(notification2.updateCount, 2);
  t.falsy(notification2.value.liquidated);

  await manualTimer.tick();
  const notification3 = await uiNotifier.getUpdateSince();
  t.is(notification3.updateCount, 2);
  t.falsy(notification3.value.liquidated);

  await manualTimer.tick();
  const notification4 = await uiNotifier.getUpdateSince(2);

  t.falsy(notification4.updateCount);
  t.truthy(notification4.value.liquidated);

  // 38 Aeth will be sold for 283, so the borrower will get 232 Aeth back
  const sconesPayout = await E.G(liquidationPayout).Scones;
  const sconesAmount = await E(sconeIssuer).getAmountOf(sconesPayout);
  t.deepEqual(sconesAmount, amountMath.makeEmpty(sconeBrand));
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, amountMath.make(232n, aethBrand));
  const debtAmountAfter = await E(vault).getDebtAmount();
  const finalNotification = await uiNotifier.getUpdateSince();
  t.truthy(finalNotification.value.liquidated);
  t.deepEqual(
    await finalNotification.value.collateralizationRatio,
    makeRatio(232n, sconeBrand, 1n),
  );
  t.truthy(amountMath.isEmpty(debtAmountAfter));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: amountMath.make(13n, sconeBrand),
  });
});

test('price falls precipitously', async t => {
  /* @type {TestContext} */
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  // The borrower will deposit 4 Aeth, and ask to borrow 470 scones. The
  // PriceAuthority's initial quote is 180. The max loan on 4 Aeth would be 600
  // (to make the margin 20%).
  // When the price falls to 123, the loan will get liquidated. At that point, 4
  // Aeth is worth 492, with a 5% margin, 493 is required.
  // The Autowap provides 534 scones for the 4 Aeth collateral, so the borrower
  // gets 41 back

  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
    },
  );

  const { stablecoin, governance, autoswap: autoswapAPI } = testJig;

  const { issuer: sconeIssuer, brand: sconeBrand } = stablecoin;
  const { brand: govBrand } = governance;
  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [2200n, 19180n, 1650n, 150n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(900n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 scones/aeth rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: amountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  /** @type {VaultManager} */
  await E(aethVaultSeat).getOfferResult();

  // Create a loan for 370 scones with 400 aeth collateral
  const collateralAmount = amountMath.make(400n, aethBrand);
  const loanAmount = amountMath.make(370n, sconeBrand);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, liquidationPayout } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(amountMath.make(370n, sconeBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    amountMath.add(loanAmount, fee),
    'borrower owes 388 Scones',
  );
  trace('correct debt', debtAmount);

  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.deepEqual(lentAmount, loanAmount, 'received 470 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    amountMath.make(400n, aethBrand),
    'vault holds 400 Collateral',
  );

  // Sell some Eth to drive the value down
  const swapInvitation = E(autoswapAPI).makeSwapInvitation();
  const proposal = {
    give: { In: amountMath.make(200n, aethBrand) },
    want: { Out: amountMath.makeEmpty(sconeBrand) },
  };
  await E(zoe).offer(
    swapInvitation,
    proposal,
    harden({
      In: aethMint.mintPayment(amountMath.make(200n, aethBrand)),
    }),
  );

  await manualTimer.tick();
  t.falsy(amountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(amountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(amountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();

  const sconesPayout = await E.G(liquidationPayout).Scones;
  const sconesAmount = await E(sconeIssuer).getAmountOf(sconesPayout);

  t.deepEqual(sconesAmount, amountMath.makeEmpty(sconeBrand));
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, amountMath.make(8n, aethBrand));
  t.truthy(amountMath.isEmpty(await E(vault).getDebtAmount()));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: amountMath.make(18n, sconeBrand),
  });
});

test('stablecoin display collateral', async t => {
  /* @type {TestContext} */
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine } = await E(zoe).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
    },
  );

  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;
  const { brand: sconeBrand } = stablecoin;
  const { brand: govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(90n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = harden({
    initialPrice: makeRatio(201n, sconeBrand, PERCENT, aethBrand),
    initialMargin: makeRatio(120n, sconeBrand),
    liquidationMargin: makeRatio(105n, sconeBrand),
    interestRate: makeRatio(100n, sconeBrand, BASIS_POINTS),
    loanFee: makeRatio(530n, sconeBrand, BASIS_POINTS),
  });
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: amountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  const collaterals = await E(stablecoinMachine).getCollaterals();

  t.deepEqual(collaterals[0], {
    brand: aethBrand,
    liquidationMargin: makeRatio(105n, sconeBrand),
    initialMargin: makeRatio(120n, sconeBrand),
    stabilityFee: makeRatio(530n, sconeBrand, BASIS_POINTS),
    marketPrice: makeRatio(5n, sconeBrand, 1n, aethBrand),
  });
});

test('interest on multiple vaults', async t => {
  /* @type {TestContext} */
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
    },
  );

  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;
  const { issuer: sconeIssuer, brand: sconeBrand } = stablecoin;
  const { brand: govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(90n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: amountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // Create a loan for Alice for 4700 scones with 1100 aeth collateral
  const collateralAmount = amountMath.make(1100n, aethBrand);
  const aliceLoanAmount = amountMath.make(4700n, sconeBrand);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: aliceLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );
  const { vault: aliceVault, uiNotifier: aliceNotifier } = await E(
    aliceLoanSeat,
  ).getOfferResult();

  const debtAmount = await E(aliceVault).getDebtAmount();
  const fee = multiplyBy(aliceLoanAmount, rates.loanFee);
  t.deepEqual(
    debtAmount,
    amountMath.add(aliceLoanAmount, fee),
    'vault lent 4700 Scones + fees',
  );

  const { Scones: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 4700 Scones');

  const sconesLent = await loanProceeds.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent),
      amountMath.make(4700n, sconeBrand),
    ),
  );

  // Create a loan for Bob for 3200 scones with 800 aeth collateral
  const bobCollateralAmount = amountMath.make(800n, aethBrand);
  const bobLoanAmount = amountMath.make(3200n, sconeBrand);
  const bobLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: bobCollateralAmount },
      want: { Scones: bobLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(bobCollateralAmount),
    }),
  );
  const { vault: bobVault, uiNotifier: bobNotifier } = await E(
    bobLoanSeat,
  ).getOfferResult();

  const bobDebtAmount = await E(bobVault).getDebtAmount();
  const bobFee = multiplyBy(bobLoanAmount, rates.loanFee);
  t.deepEqual(
    bobDebtAmount,
    amountMath.add(bobLoanAmount, bobFee),
    'vault lent 3200 Scones + fees',
  );

  const { Scones: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 4700 Scones');

  const bobSconesLent = await bobLoanProceeds.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(bobSconesLent),
      amountMath.make(3200n, sconeBrand),
    ),
  );

  // { chargingPeriod: 2, recordingPeriod: 6 }  charge 1% 3 times
  for (let i = 0; i < 10; i += 1) {
    manualTimer.tick();
  }

  await manualTimer.tick();
  await manualTimer.tick();
  await manualTimer.tick();
  const aliceUpdate = await aliceNotifier.getUpdateSince();
  const bobUpdate = await bobNotifier.getUpdateSince();
  const bobAddedDebt = 160n + 33n + 33n + 34n;
  t.deepEqual(
    bobUpdate.value.debt,
    amountMath.make(3200n + bobAddedDebt, sconeBrand),
  );
  t.deepEqual(
    bobUpdate.value.interestRate,
    makeRatio(100n, sconeBrand, 10000n),
  );
  t.deepEqual(
    bobUpdate.value.liquidationRatio,
    makeRatio(105n, sconeBrand, 100n),
  );
  const bobCollateralization = bobUpdate.value.collateralizationRatio;
  t.truthy(
    bobCollateralization.numerator.value >
      bobCollateralization.denominator.value,
  );

  const aliceAddedDebt = 235n + 49n + 49n + 50n;
  t.deepEqual(
    aliceUpdate.value.debt,
    amountMath.make(4700n + aliceAddedDebt, sconeBrand),
    `should have collected ${aliceAddedDebt}`,
  );
  t.deepEqual(
    aliceUpdate.value.interestRate,
    makeRatio(100n, sconeBrand, 10000n),
  );
  t.deepEqual(aliceUpdate.value.liquidationRatio, makeRatio(105n, sconeBrand));
  const aliceCollateralization = aliceUpdate.value.collateralizationRatio;
  t.truthy(
    aliceCollateralization.numerator.value >
      aliceCollateralization.denominator.value,
  );

  t.truthy(
    amountMath.isEqual(
      stablecoinMachine.getRewardAllocation().Scones,
      amountMath.make(aliceAddedDebt + bobAddedDebt, sconeBrand),
    ),
    // reward includes 5% fees on two loans plus 1% interest three times on each
    `Should be ${aliceAddedDebt + bobAddedDebt}, was ${
      stablecoinMachine.getRewardAllocation().value
    }`,
  );
});

test('adjust balances', async t => {
  /* @type {TestContext} */
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
    },
  );

  const { stablecoin, governance } = testJig;
  const { issuer: sconeIssuer, brand: sconeBrand } = stablecoin;
  const { brand: govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  const priceConversion = makeRatio(15n, sconeBrand, 1n, aethBrand);
  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: amountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // initial loan /////////////////////////////////////

  // Create a loan for Alice for 5000 scones with 1000 aeth collateral
  const collateralAmount = amountMath.make(1000n, aethBrand);
  const aliceLoanAmount = amountMath.make(5000n, sconeBrand);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: aliceLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );
  const { vault: aliceVault, uiNotifier: aliceNotifier } = await E(
    aliceLoanSeat,
  ).getOfferResult();

  let debtAmount = await E(aliceVault).getDebtAmount();
  const fee = multiplyBy(aliceLoanAmount, rates.loanFee);
  let runningSconeDebt = amountMath.add(aliceLoanAmount, fee);
  let runningCollateral = amountMath.make(1000n, aethBrand);

  t.deepEqual(debtAmount, runningSconeDebt, 'vault lent 5000 Scones + fees');
  const { Scones: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 Scones');

  const sconesLent = await loanProceeds.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent),
      amountMath.make(5000n, sconeBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runningSconeDebt);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(
    aliceCollateralization1.denominator.value,
    runningSconeDebt.value,
  );

  // increase collateral 1 ///////////////////////////////////// (give both)

  // Alice increase collateral by 100, paying in 50 scones against debt
  const collateralIncrement = amountMath.make(100n, aethBrand);
  const depositSconesAmount = amountMath.make(50n, sconeBrand);
  runningSconeDebt = amountMath.subtract(runningSconeDebt, depositSconesAmount);
  runningCollateral = amountMath.add(runningCollateral, collateralIncrement);

  const [paybackPayment, _remainingPayment] = await E(sconeIssuer).split(
    sconesLent,
    depositSconesAmount,
  );

  const aliceAddCollateralSeat1 = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { Collateral: collateralIncrement, Scones: depositSconesAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralIncrement),
      Scones: paybackPayment,
    }),
  );

  await E(aliceAddCollateralSeat1).getOfferResult();
  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runningSconeDebt);

  const { Scones: lentAmount2 } = await E(
    aliceAddCollateralSeat1,
  ).getCurrentAllocation();
  const loanProceeds2 = await E(aliceAddCollateralSeat1).getPayouts();
  t.deepEqual(lentAmount2, amountMath.makeEmpty(sconeBrand), 'no payout');

  const sconesLent2 = await loanProceeds2.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent2),
      amountMath.makeEmpty(sconeBrand),
    ),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runningSconeDebt);
  const aliceCollateralization2 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization2.numerator,
    multiplyBy(runningCollateral, priceConversion),
  );
  t.deepEqual(aliceCollateralization2.denominator, runningSconeDebt);

  // increase collateral 2 ////////////////////////////////// (want:s, give:c)

  // Alice increase collateral by 100, withdrawing 50 scones
  const collateralIncrement2 = amountMath.make(100n, aethBrand);
  const withdrawSconesAmount = amountMath.make(50n, sconeBrand);
  const withdrawSconesAmountWithFees = multiplyBy(
    withdrawSconesAmount,
    rates.loanFee,
  );
  runningSconeDebt = amountMath.add(
    runningSconeDebt,
    amountMath.add(withdrawSconesAmount, withdrawSconesAmountWithFees),
  );
  runningCollateral = amountMath.add(runningCollateral, collateralIncrement2);

  const aliceAddCollateralSeat2 = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { Collateral: collateralIncrement2 },
      want: { Scones: withdrawSconesAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralIncrement2),
    }),
  );

  await E(aliceAddCollateralSeat2).getOfferResult();
  const { Scones: lentAmount3 } = await E(
    aliceAddCollateralSeat2,
  ).getCurrentAllocation();
  const loanProceeds3 = await E(aliceAddCollateralSeat2).getPayouts();
  t.deepEqual(lentAmount3, amountMath.make(50n, sconeBrand));

  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runningSconeDebt);

  const sconesLent3 = await loanProceeds3.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent3),
      amountMath.make(50n, sconeBrand),
    ),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runningSconeDebt);
  const aliceCollateralization3 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization3.numerator,
    multiplyBy(runningCollateral, priceConversion),
  );
  t.deepEqual(aliceCollateralization3.denominator, runningSconeDebt);

  // reduce collateral  ///////////////////////////////////// (want both)

  // Alice reduce collateral by 100, withdrawing 50 scones
  const collateralDecrement = amountMath.make(100n, aethBrand);
  const withdrawScones2 = amountMath.make(50n, sconeBrand);
  const withdrawScones2WithFees = multiplyBy(withdrawScones2, rates.loanFee);
  runningSconeDebt = amountMath.add(
    runningSconeDebt,
    amountMath.add(withdrawSconesAmount, withdrawScones2WithFees),
  );
  runningCollateral = amountMath.subtract(
    runningCollateral,
    collateralDecrement,
  );
  const aliceReduceCollateralSeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      want: { Scones: withdrawScones2, Collateral: collateralDecrement },
    }),
    harden({}),
  );

  await E(aliceReduceCollateralSeat).getOfferResult();

  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runningSconeDebt);

  const { Scones: lentAmount4 } = await E(
    aliceReduceCollateralSeat,
  ).getCurrentAllocation();
  const loanProceeds4 = await E(aliceReduceCollateralSeat).getPayouts();
  t.deepEqual(lentAmount4, amountMath.make(50n, sconeBrand));

  const sconesBorrowed = await loanProceeds4.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesBorrowed),
      amountMath.make(50n, sconeBrand),
    ),
  );
  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    amountMath.isEqual(
      await E(aethIssuer).getAmountOf(collateralWithdrawn),
      collateralDecrement,
    ),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runningSconeDebt);
  const aliceCollateralization4 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization4.numerator,
    multiplyBy(runningCollateral, priceConversion),
  );
  t.deepEqual(aliceCollateralization4.denominator, runningSconeDebt);

  // NSF  ///////////////////////////////////// (want too much of both)

  // Alice reduce collateral by 100, withdrawing 50 scones
  const collateralDecr2 = amountMath.make(800n, aethBrand);
  const withdrawScones3 = amountMath.make(500n, sconeBrand);
  const withdrawScones3WithFees = multiplyBy(withdrawScones3, rates.loanFee);
  runningSconeDebt = amountMath.add(
    runningSconeDebt,
    amountMath.add(withdrawSconesAmount, withdrawScones3WithFees),
  );
  runningCollateral = amountMath.subtract(runningCollateral, collateralDecr2);
  const aliceReduceCollateralSeat2 = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      want: { Scones: withdrawScones3, Collateral: collateralDecr2 },
    }),
    harden({}),
  );

  await t.throwsAsync(() => E(aliceReduceCollateralSeat2).getOfferResult(), {
    // Double-disclosure bug endojs/endo#640
    // wildcards were:
    // "brand":"[Alleged: Scones brand]","value":"[5829n]"
    // "value":"[3750n]","brand":"[Alleged: Scones brand]"
    message: /The requested debt {.*} is more than the collateralization ratio allows: {.*}/,
  });
});

// Alice will over repay her borrowed scones. In order to make that possible,
// Bob will also take out a loan and will give her the proceeds.
test('overdeposit', async t => {
  /* @type {TestContext} */
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
      liquidationInstall,
    },
  );

  const { stablecoin, governance } = testJig;
  const { issuer: sconeIssuer, brand: sconeBrand } = stablecoin;
  const { brand: govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: amountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // Alice's loan /////////////////////////////////////

  // Create a loan for Alice for 5000 scones with 1000 aeth collateral
  const collateralAmount = amountMath.make(1000n, aethBrand);
  const aliceLoanAmount = amountMath.make(5000n, sconeBrand);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: aliceLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );
  const { vault: aliceVault, uiNotifier: aliceNotifier } = await E(
    aliceLoanSeat,
  ).getOfferResult();

  let debtAmount = await E(aliceVault).getDebtAmount();
  const fee = multiplyBy(aliceLoanAmount, rates.loanFee);
  const sconeDebt = amountMath.add(aliceLoanAmount, fee);

  t.deepEqual(debtAmount, sconeDebt, 'vault lent 5000 Scones + fees');
  const { Scones: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const aliceProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 Scones');

  const borrowedScones = await aliceProceeds.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(borrowedScones),
      amountMath.make(5000n, sconeBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, sconeDebt);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, sconeDebt.value);

  // Bob's loan /////////////////////////////////////

  // Create a loan for Bob for 1000 scones with 200 aeth collateral
  const bobCollateralAmount = amountMath.make(200n, aethBrand);
  const bobLoanAmount = amountMath.make(1000n, sconeBrand);
  const bobLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: bobCollateralAmount },
      want: { Scones: bobLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(bobCollateralAmount),
    }),
  );
  const bobProceeds = await E(bobLoanSeat).getPayouts();
  await E(bobLoanSeat).getOfferResult();
  const bobScones = await bobProceeds.Scones;
  t.truthy(
    amountMath.isEqual(
      await E(sconeIssuer).getAmountOf(bobScones),
      amountMath.make(1000n, sconeBrand),
    ),
  );

  // overpay debt ///////////////////////////////////// (give scones)

  const combinedScones = await E(sconeIssuer).combine([
    borrowedScones,
    bobScones,
  ]);
  const depositScones2 = amountMath.make(6000n, sconeBrand);

  const aliceOverpaySeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { Scones: depositScones2 },
    }),
    harden({ Scones: combinedScones }),
  );

  await E(aliceOverpaySeat).getOfferResult();
  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, amountMath.makeEmpty(sconeBrand));

  const { Scones: lentAmount5 } = await E(
    aliceOverpaySeat,
  ).getCurrentAllocation();
  const loanProceeds5 = await E(aliceOverpaySeat).getPayouts();
  t.deepEqual(lentAmount5, amountMath.make(750n, sconeBrand));

  const sconesReturned = await loanProceeds5.Scones;
  t.deepEqual(
    await E(sconeIssuer).getAmountOf(sconesReturned),
    amountMath.make(750n, sconeBrand),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, amountMath.makeEmpty(sconeBrand));
  const aliceCollateralization5 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization5.numerator,
    amountMath.make(1000n, sconeBrand),
  );
  t.deepEqual(
    aliceCollateralization5.denominator,
    amountMath.make(1n, sconeBrand),
  );
});
