// @ts-check
/* global require */

import '@agoric/zoe/tools/prepare-test-env';
import '@agoric/zoe/exported';
import '../src/types';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';

import { makeZoe } from '@agoric/zoe';
import { makeIssuerKit, MathKind } from '@agoric/ertp';

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
  // const { mint: aethMint, amountMath: aethMath } = aethKit;

  // const abtcKit = produceIssuer('aBtc');
  // const { mint: abtcMint, amountMath: abtcMath } = abtcKit;
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
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
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

  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;

  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [500n, 15n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(900n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  /** @type {VaultManager} */
  const aethVaultManager = await E(aethVaultSeat).getOfferResult();

  // Create a loan for 470 scones with 1100 aeth collateral
  const collateralAmount = aethMath.make(1100n);
  const loanAmount = sconeMath.make(470n);
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
  const fee = multiplyBy(sconeMath.make(470n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    sconeMath.add(loanAmount, fee),
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
    aethMath.make(1100n),
    'vault holds 1100 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = aethMath.make(100n);
  const paybackAmount = sconeMath.make(200n);
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
    sconeMath.make(293n),
    'debt reduced to 293 scones',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    aethMath.make(1000n),
    'vault holds 1000 Collateral',
  );
  t.deepEqual(returnedAmount, aethMath.make(100n), 'withdrew 100 collateral');

  console.log('preDEBT ', vault.getDebtAmount());

  await E(aethVaultManager).liquidateAll();
  console.log('DEBT ', vault.getDebtAmount());
  t.truthy(sconeMath.isEmpty(vault.getDebtAmount()), 'debt is paid off');
  console.log('COLLATERAL ', vault.getCollateralAmount());
  t.truthy(aethMath.isEmpty(vault.getCollateralAmount()), 'vault is cleared');

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: sconeMath.make(23n),
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
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
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

  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [1000n, 677n, 636n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(900n),
  );
  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 scones/aeth rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultSeat).getOfferResult();

  // Create a loan for 270 scones with 40 aeth collateral
  const collateralAmount = aethMath.make(400n);
  const loanAmount = sconeMath.make(270n);
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
  const fee = multiplyBy(sconeMath.make(270n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    sconeMath.add(loanAmount, fee),
    'borrower owes 283 Scones',
  );

  const notification1 = await uiNotifier.getUpdateSince();
  t.falsy(notification1.value.liquidated);
  t.deepEqual(
    await notification1.value.collateralizationRatio,
    makeRatio(444n, sconeBrand, 283n),
  );
  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.truthy(sconeMath.isEqual(lentAmount, loanAmount), 'received 470 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    aethMath.make(400n),
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
  t.deepEqual(sconesAmount, sconeMath.getEmpty());
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, aethMath.make(232n));
  const debtAmountAfter = await E(vault).getDebtAmount();
  const finalNotification = await uiNotifier.getUpdateSince();
  t.truthy(finalNotification.value.liquidated);
  t.deepEqual(
    await finalNotification.value.collateralizationRatio,
    makeRatio(232n, sconeBrand, 1n),
  );
  t.truthy(sconeMath.isEmpty(debtAmountAfter));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: sconeMath.make(13n),
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
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
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

  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;
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
    aethMath.make(900n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 scones/aeth rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  /** @type {VaultManager} */
  await E(aethVaultSeat).getOfferResult();

  // Create a loan for 370 scones with 400 aeth collateral
  const collateralAmount = aethMath.make(400n);
  const loanAmount = sconeMath.make(370n);
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
  const fee = multiplyBy(sconeMath.make(370n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    sconeMath.add(loanAmount, fee),
    'borrower owes 388 Scones',
  );
  trace('correct debt', debtAmount);

  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.deepEqual(lentAmount, loanAmount, 'received 470 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    aethMath.make(400n),
    'vault holds 400 Collateral',
  );

  // Sell some Eth to drive the value down
  const swapInvitation = E(autoswapAPI).makeSwapInvitation();
  const proposal = {
    give: { In: aethMath.make(200n) },
    want: { Out: sconeMath.getEmpty() },
  };
  await E(zoe).offer(
    swapInvitation,
    proposal,
    harden({
      In: aethMint.mintPayment(aethMath.make(200n)),
    }),
  );

  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();

  const sconesPayout = await E.G(liquidationPayout).Scones;
  const sconesAmount = await E(sconeIssuer).getAmountOf(sconesPayout);

  t.deepEqual(sconesAmount, sconeMath.getEmpty());
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, aethMath.make(8n));
  t.truthy(sconeMath.isEmpty(await E(vault).getDebtAmount()));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: sconeMath.make(18n),
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
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
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
  const { amountMath: govMath, brand: _govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(90n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
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
      want: { Governance: govMath.getEmpty() },
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
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
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
  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const { amountMath: govMath, brand: _govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(90n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // Create a loan for Alice for 4700 scones with 1100 aeth collateral
  const collateralAmount = aethMath.make(1100n);
  const aliceLoanAmount = sconeMath.make(4700n);
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
    sconeMath.add(aliceLoanAmount, fee),
    'vault lent 4700 Scones + fees',
  );

  const { Scones: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 4700 Scones');

  const sconesLent = await loanProceeds.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent),
      sconeMath.make(4700n),
    ),
  );

  // Create a loan for Bob for 3200 scones with 800 aeth collateral
  const bobCollateralAmount = aethMath.make(800n);
  const bobLoanAmount = sconeMath.make(3200n);
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
    sconeMath.add(bobLoanAmount, bobFee),
    'vault lent 3200 Scones + fees',
  );

  const { Scones: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 4700 Scones');

  const bobSconesLent = await bobLoanProceeds.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(bobSconesLent),
      sconeMath.make(3200n),
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
  t.deepEqual(bobUpdate.value.debt, sconeMath.make(3200n + bobAddedDebt));
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
    sconeMath.make(4700n + aliceAddedDebt),
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
    sconeMath.isEqual(
      stablecoinMachine.getRewardAllocation().Scones,
      sconeMath.make(aliceAddedDebt + bobAddedDebt),
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
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
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
  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const { amountMath: govMath } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(1n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  const priceConversion = makeRatio(15n, sconeBrand, 1n, aethBrand);
  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // initial loan /////////////////////////////////////

  // Create a loan for Alice for 5000 scones with 1000 aeth collateral
  const collateralAmount = aethMath.make(1000n);
  const aliceLoanAmount = sconeMath.make(5000n);
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
  let runningSconeDebt = sconeMath.add(aliceLoanAmount, fee);
  let runningCollateral = aethMath.make(1000n);

  t.deepEqual(debtAmount, runningSconeDebt, 'vault lent 5000 Scones + fees');
  const { Scones: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 Scones');

  const sconesLent = await loanProceeds.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent),
      sconeMath.make(5000n),
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
  const collateralIncrement = aethMath.make(100n);
  const depositSconesAmount = sconeMath.make(50n);
  runningSconeDebt = sconeMath.subtract(runningSconeDebt, depositSconesAmount);
  runningCollateral = aethMath.add(runningCollateral, collateralIncrement);

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
  t.deepEqual(lentAmount2, sconeMath.getEmpty(), 'no payout');

  const sconesLent2 = await loanProceeds2.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent2),
      sconeMath.getEmpty(),
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
  const collateralIncrement2 = aethMath.make(100n);
  const withdrawSconesAmount = sconeMath.make(50n);
  const withdrawSconesAmountWithFees = multiplyBy(
    withdrawSconesAmount,
    rates.loanFee,
  );
  runningSconeDebt = sconeMath.add(
    runningSconeDebt,
    sconeMath.add(withdrawSconesAmount, withdrawSconesAmountWithFees),
  );
  runningCollateral = aethMath.add(runningCollateral, collateralIncrement2);

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
  t.deepEqual(lentAmount3, sconeMath.make(50n));

  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runningSconeDebt);

  const sconesLent3 = await loanProceeds3.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent3),
      sconeMath.make(50n),
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
  const collateralDecrement = aethMath.make(100n);
  const withdrawScones2 = sconeMath.make(50n);
  const withdrawScones2WithFees = multiplyBy(withdrawScones2, rates.loanFee);
  runningSconeDebt = sconeMath.add(
    runningSconeDebt,
    sconeMath.add(withdrawSconesAmount, withdrawScones2WithFees),
  );
  runningCollateral = aethMath.subtract(runningCollateral, collateralDecrement);
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
  t.deepEqual(lentAmount4, sconeMath.make(50n));

  const sconesBorrowed = await loanProceeds4.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesBorrowed),
      sconeMath.make(50n),
    ),
  );
  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    aethMath.isEqual(
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
  const collateralDecr2 = aethMath.make(800n);
  const withdrawScones3 = sconeMath.make(500n);
  const withdrawScones3WithFees = multiplyBy(withdrawScones3, rates.loanFee);
  runningSconeDebt = sconeMath.add(
    runningSconeDebt,
    sconeMath.add(withdrawSconesAmount, withdrawScones3WithFees),
  );
  runningCollateral = aethMath.subtract(runningCollateral, collateralDecr2);
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
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
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
  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const { amountMath: govMath } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    sconeBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(1n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // Alice's loan /////////////////////////////////////

  // Create a loan for Alice for 5000 scones with 1000 aeth collateral
  const collateralAmount = aethMath.make(1000n);
  const aliceLoanAmount = sconeMath.make(5000n);
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
  const sconeDebt = sconeMath.add(aliceLoanAmount, fee);

  t.deepEqual(debtAmount, sconeDebt, 'vault lent 5000 Scones + fees');
  const { Scones: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const aliceProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 Scones');

  const borrowedScones = await aliceProceeds.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(borrowedScones),
      sconeMath.make(5000n),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, sconeDebt);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, sconeDebt.value);

  // Bob's loan /////////////////////////////////////

  // Create a loan for Bob for 1000 scones with 200 aeth collateral
  const bobCollateralAmount = aethMath.make(200n);
  const bobLoanAmount = sconeMath.make(1000n);
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
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(bobScones),
      sconeMath.make(1000n),
    ),
  );

  // overpay debt ///////////////////////////////////// (give scones)

  const combinedScones = await E(sconeIssuer).combine([
    borrowedScones,
    bobScones,
  ]);
  const depositScones2 = sconeMath.make(6000n);

  const aliceOverpaySeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { Scones: depositScones2 },
    }),
    harden({ Scones: combinedScones }),
  );

  await E(aliceOverpaySeat).getOfferResult();
  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, sconeMath.getEmpty());

  const { Scones: lentAmount5 } = await E(
    aliceOverpaySeat,
  ).getCurrentAllocation();
  const loanProceeds5 = await E(aliceOverpaySeat).getPayouts();
  t.deepEqual(lentAmount5, sconeMath.make(750n));

  const sconesReturned = await loanProceeds5.Scones;
  t.deepEqual(
    await E(sconeIssuer).getAmountOf(sconesReturned),
    sconeMath.make(750n),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, sconeMath.getEmpty());
  const aliceCollateralization5 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization5.numerator, sconeMath.make(1000n));
  t.deepEqual(aliceCollateralization5.denominator, sconeMath.make(1n));
});
