// @ts-check
/* global require, setImmediate */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import '../src/types';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';

import { makeZoe } from '@agoric/zoe';
import { makeIssuerKit, MathKind, amountMath } from '@agoric/ertp';

import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeRatio, multiplyBy } from '@agoric/zoe/src/contractSupport/ratio';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority';
import { makeTracer } from '../src/makeTracer';
import { SECONDS_PER_YEAR } from '../src/interest';

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
   * @property {IssuerRecord} runIssuerRecord
   * @property {IssuerRecord} govIssuerRecord
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

// Some notifier updates aren't propagating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
async function waitForPromisesToSettle() {
  const pk = makePromiseKit();
  setImmediate(pk.resolve);
  return pk.promise;
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
  return makeScriptedPriceAuthority(options);
};

function makeRates(runBrand, aethBrand) {
  return harden({
    // exchange rate
    initialPrice: makeRatio(201n, runBrand, PERCENT, aethBrand),
    // margin required to open a loan
    initialMargin: makeRatio(120n, runBrand),
    // margin required to maintain a loan
    liquidationMargin: makeRatio(105n, runBrand),
    // periodic interest rate (per charging period)
    interestRate: makeRatio(100n, runBrand, BASIS_POINTS),
    // charge to create or increase loan balance
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
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

  const { runIssuerRecord, govIssuerRecord, autoswap: _autoswapAPI } = testJig;

  const { issuer: runIssuer, brand: runBrand } = runIssuerRecord;

  const { brand: govBrand } = govIssuerRecord;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // priceAuthority needs the RUN brand, which isn't available until the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [500n, 15n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(900n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
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

  // Create a loan for 470 RUN with 1100 aeth collateral
  const collateralAmount = amountMath.make(1100n, aethBrand);
  const loanAmount = amountMath.make(470n, runBrand);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, _liquidationPayout } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(amountMath.make(470n, runBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    amountMath.add(loanAmount, fee),
    'vault lent 470 RUN',
  );
  trace('correct debt', debtAmount);

  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  const loanProceeds = await E(loanSeat).getPayouts();
  const runLent = await loanProceeds.RUN;
  // const lentAmount = await runIssuer.getAmountOf(runLent);
  t.deepEqual(lentAmount, loanAmount, 'received 47 RUN');
  t.deepEqual(
    vault.getCollateralAmount(),
    amountMath.make(1100n, aethBrand),
    'vault holds 1100 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = amountMath.make(100n, aethBrand);
  const paybackAmount = amountMath.make(200n, runBrand);
  const [paybackPayment, _remainingPayment] = await E(runIssuer).split(
    runLent,
    paybackAmount,
  );

  const seat = await E(zoe).offer(
    vault.makeAdjustBalancesInvitation(),
    harden({
      give: { RUN: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({
      RUN: paybackPayment,
    }),
  );
  await E(seat).getOfferResult();

  const { Collateral: returnedCollateral } = await E(seat).getPayouts();
  const returnedAmount = await aethIssuer.getAmountOf(returnedCollateral);
  t.deepEqual(
    vault.getDebtAmount(),
    amountMath.make(293n, runBrand),
    'debt reduced to 293 RUN',
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
    RUN: amountMath.make(23n, runBrand),
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
  // Aeth is 5.6 each. The loan is 470 RUN, the collateral is worth 160.
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

  const { runIssuerRecord, govIssuerRecord } = testJig;

  const { issuer: runIssuer, brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [1000n, 677n, 636n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(900n, aethBrand),
  );
  // priceAuthority needs runDebt, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 RUN/aeth rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
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

  // Create a loan for 270 RUN with 40 aeth collateral
  const collateralAmount = amountMath.make(400n, aethBrand);
  const loanAmount = amountMath.make(270n, runBrand);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, liquidationPayout, uiNotifier } = await E(
    loanSeat,
  ).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(amountMath.make(270n, runBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    amountMath.add(loanAmount, fee),
    'borrower owes 283 RUN',
  );

  const notification1 = await uiNotifier.getUpdateSince();
  t.falsy(notification1.value.liquidated);
  t.deepEqual(
    await notification1.value.collateralizationRatio,
    makeRatio(444n, runBrand, 283n),
  );
  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.truthy(amountMath.isEqual(lentAmount, loanAmount), 'received 470 RUN');
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
  const runPayout = await E.G(liquidationPayout).RUN;
  const runAmount = await E(runIssuer).getAmountOf(runPayout);
  t.deepEqual(runAmount, amountMath.makeEmpty(runBrand));
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, amountMath.make(232n, aethBrand));
  const debtAmountAfter = await E(vault).getDebtAmount();
  const finalNotification = await uiNotifier.getUpdateSince();
  t.truthy(finalNotification.value.liquidated);
  t.deepEqual(
    await finalNotification.value.collateralizationRatio,
    makeRatio(232n, runBrand, 1n),
  );
  t.truthy(amountMath.isEmpty(debtAmountAfter));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    RUN: amountMath.make(13n, runBrand),
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

  // The borrower will deposit 4 Aeth, and ask to borrow 470 RUN. The
  // PriceAuthority's initial quote is 180. The max loan on 4 Aeth would be 600
  // (to make the margin 20%).
  // When the price falls to 123, the loan will get liquidated. At that point, 4
  // Aeth is worth 492, with a 5% margin, 493 is required.
  // The Autowap provides 534 RUN for the 4 Aeth collateral, so the borrower
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

  const { runIssuerRecord, govIssuerRecord, autoswap: autoswapAPI } = testJig;

  const { issuer: runIssuer, brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;
  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // RUN, which uses an autoswap that presents a fixed price of 4 RUN
  // per Collateral.

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // priceAuthority needs the RUN brand, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [2200n, 19180n, 1650n, 150n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(900n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 RUN/aeth rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
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

  // Create a loan for 370 RUN with 400 aeth collateral
  const collateralAmount = amountMath.make(400n, aethBrand);
  const loanAmount = amountMath.make(370n, runBrand);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, liquidationPayout } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(amountMath.make(370n, runBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    amountMath.add(loanAmount, fee),
    'borrower owes 388 RUN',
  );
  trace('correct debt', debtAmount);

  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.deepEqual(lentAmount, loanAmount, 'received 470 RUN');
  t.deepEqual(
    vault.getCollateralAmount(),
    amountMath.make(400n, aethBrand),
    'vault holds 400 Collateral',
  );

  // Sell some Eth to drive the value down
  const swapInvitation = E(autoswapAPI).makeSwapInvitation();
  const proposal = {
    give: { In: amountMath.make(200n, aethBrand) },
    want: { Out: amountMath.makeEmpty(runBrand) },
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

  const runPayout = await E.G(liquidationPayout).RUN;
  const runAmount = await E(runIssuer).getAmountOf(runPayout);

  t.deepEqual(runAmount, amountMath.makeEmpty(runBrand));
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, amountMath.make(8n, aethBrand));
  t.truthy(amountMath.isEmpty(await E(vault).getDebtAmount()));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    RUN: amountMath.make(18n, runBrand),
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

  const { runIssuerRecord, govIssuerRecord, autoswap: _autoswapAPI } = testJig;
  const { brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(90n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = harden({
    initialPrice: makeRatio(201n, runBrand, PERCENT, aethBrand),
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    interestRate: makeRatio(100n, runBrand, BASIS_POINTS),
    loanFee: makeRatio(530n, runBrand, BASIS_POINTS),
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
    liquidationMargin: makeRatio(105n, runBrand),
    initialMargin: makeRatio(120n, runBrand),
    stabilityFee: makeRatio(530n, runBrand, BASIS_POINTS),
    marketPrice: makeRatio(5n, runBrand, 1n, aethBrand),
    interestRate: makeRatio(100n, runBrand, 10000n, runBrand),
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

  const { runIssuerRecord, govIssuerRecord, autoswap: _autoswapAPI } = testJig;
  const { issuer: runIssuer, brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(90n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const interestRate = makeRatio(
    100n * SECONDS_PER_YEAR,
    runBrand,
    BASIS_POINTS * 2n,
  );
  const rates = harden({
    initialPrice: makeRatio(201n, runBrand, PERCENT, aethBrand),
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    interestRate,
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
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

  // Create a loan for Alice for 4700 RUN with 1100 aeth collateral
  const collateralAmount = amountMath.make(1100n, aethBrand);
  const aliceLoanAmount = amountMath.make(4700n, runBrand);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: aliceLoanAmount },
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
    'vault lent 4700 RUN + fees',
  );

  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 4700 RUN');

  const runLent = await loanProceeds.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent),
      amountMath.make(4700n, runBrand),
    ),
  );

  // Create a loan for Bob for 3200 RUN with 800 aeth collateral
  const bobCollateralAmount = amountMath.make(800n, aethBrand);
  const bobLoanAmount = amountMath.make(3200n, runBrand);
  const bobLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: bobCollateralAmount },
      want: { RUN: bobLoanAmount },
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
    'vault lent 3200 RUN + fees',
  );

  const { RUN: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 4700 RUN');

  const bobRunLent = await bobLoanProceeds.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRunLent),
      amountMath.make(3200n, runBrand),
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
    amountMath.make(3200n + bobAddedDebt, runBrand),
  );
  t.deepEqual(bobUpdate.value.interestRate, interestRate);
  t.deepEqual(
    bobUpdate.value.liquidationRatio,
    makeRatio(105n, runBrand, 100n),
  );
  const bobCollateralization = bobUpdate.value.collateralizationRatio;
  t.truthy(
    bobCollateralization.numerator.value >
      bobCollateralization.denominator.value,
  );

  const aliceAddedDebt = 235n + 49n + 49n + 50n;
  t.deepEqual(
    aliceUpdate.value.debt,
    amountMath.make(4700n + aliceAddedDebt, runBrand),
    `should have collected ${aliceAddedDebt}`,
  );
  t.deepEqual(aliceUpdate.value.interestRate, interestRate);
  t.deepEqual(aliceUpdate.value.liquidationRatio, makeRatio(105n, runBrand));
  const aliceCollateralization = aliceUpdate.value.collateralizationRatio;
  t.truthy(
    aliceCollateralization.numerator.value >
      aliceCollateralization.denominator.value,
  );

  t.truthy(
    amountMath.isEqual(
      stablecoinMachine.getRewardAllocation().RUN,
      amountMath.make(aliceAddedDebt + bobAddedDebt, runBrand),
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

  const { runIssuerRecord, govIssuerRecord } = testJig;
  const { issuer: runIssuer, brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  const priceConversion = makeRatio(15n, runBrand, 1n, aethBrand);
  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
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

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = amountMath.make(1000n, aethBrand);
  const aliceLoanAmount = amountMath.make(5000n, runBrand);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: aliceLoanAmount },
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
  let runDebtLevel = amountMath.add(aliceLoanAmount, fee);
  let collateralLevel = amountMath.make(1000n, aethBrand);

  t.deepEqual(debtAmount, runDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const runLent = await loanProceeds.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent),
      amountMath.make(5000n, runBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebtLevel.value);

  // increase collateral 1 ///////////////////////////////////// (give both)

  // Alice increase collateral by 100, paying in 50 RUN against debt
  const collateralIncrement = amountMath.make(100n, aethBrand);
  const depositRunAmount = amountMath.make(50n, runBrand);
  runDebtLevel = amountMath.subtract(runDebtLevel, depositRunAmount);
  collateralLevel = amountMath.add(collateralLevel, collateralIncrement);

  const [paybackPayment, _remainingPayment] = await E(runIssuer).split(
    runLent,
    depositRunAmount,
  );

  const aliceAddCollateralSeat1 = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { Collateral: collateralIncrement, RUN: depositRunAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralIncrement),
      RUN: paybackPayment,
    }),
  );

  await E(aliceAddCollateralSeat1).getOfferResult();
  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runDebtLevel);

  const { RUN: lentAmount2 } = await E(
    aliceAddCollateralSeat1,
  ).getCurrentAllocation();
  const loanProceeds2 = await E(aliceAddCollateralSeat1).getPayouts();
  t.deepEqual(lentAmount2, amountMath.makeEmpty(runBrand), 'no payout');

  const runLent2 = await loanProceeds2.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent2),
      amountMath.makeEmpty(runBrand),
    ),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization2 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization2.numerator,
    multiplyBy(collateralLevel, priceConversion),
  );
  t.deepEqual(aliceCollateralization2.denominator, runDebtLevel);

  // increase collateral 2 ////////////////////////////////// (want:s, give:c)

  // Alice increase collateral by 100, withdrawing 50 RUN
  const collateralIncrement2 = amountMath.make(100n, aethBrand);
  const withdrawRunAmount = amountMath.make(50n, runBrand);
  const withdrawRunAmountWithFees = multiplyBy(
    withdrawRunAmount,
    rates.loanFee,
  );
  runDebtLevel = amountMath.add(
    runDebtLevel,
    amountMath.add(withdrawRunAmount, withdrawRunAmountWithFees),
  );
  collateralLevel = amountMath.add(collateralLevel, collateralIncrement2);

  const aliceAddCollateralSeat2 = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { Collateral: collateralIncrement2 },
      want: { RUN: withdrawRunAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralIncrement2),
    }),
  );

  await E(aliceAddCollateralSeat2).getOfferResult();
  const { RUN: lentAmount3 } = await E(
    aliceAddCollateralSeat2,
  ).getCurrentAllocation();
  const loanProceeds3 = await E(aliceAddCollateralSeat2).getPayouts();
  t.deepEqual(lentAmount3, amountMath.make(50n, runBrand));

  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runDebtLevel);

  const runLent3 = await loanProceeds3.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent3),
      amountMath.make(50n, runBrand),
    ),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization3 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization3.numerator,
    multiplyBy(collateralLevel, priceConversion),
  );
  t.deepEqual(aliceCollateralization3.denominator, runDebtLevel);

  // reduce collateral  ///////////////////////////////////// (want both)

  // Alice reduce collateral by 100, withdrawing 50 RUN
  const collateralDecrement = amountMath.make(100n, aethBrand);
  const withdrawRun2 = amountMath.make(50n, runBrand);
  const withdrawRun2WithFees = multiplyBy(withdrawRun2, rates.loanFee);
  runDebtLevel = amountMath.add(
    runDebtLevel,
    amountMath.add(withdrawRunAmount, withdrawRun2WithFees),
  );
  collateralLevel = amountMath.subtract(collateralLevel, collateralDecrement);
  const aliceReduceCollateralSeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      want: { RUN: withdrawRun2, Collateral: collateralDecrement },
    }),
    harden({}),
  );

  await E(aliceReduceCollateralSeat).getOfferResult();

  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runDebtLevel);

  const { RUN: lentAmount4 } = await E(
    aliceReduceCollateralSeat,
  ).getCurrentAllocation();
  const loanProceeds4 = await E(aliceReduceCollateralSeat).getPayouts();
  t.deepEqual(lentAmount4, amountMath.make(50n, runBrand));

  const runBorrowed = await loanProceeds4.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(runBorrowed),
      amountMath.make(50n, runBrand),
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
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization4 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization4.numerator,
    multiplyBy(collateralLevel, priceConversion),
  );
  t.deepEqual(aliceCollateralization4.denominator, runDebtLevel);

  // NSF  ///////////////////////////////////// (want too much of both)

  // Alice reduce collateral by 100, withdrawing 50 RUN
  const collateralDecr2 = amountMath.make(800n, aethBrand);
  const withdrawRun3 = amountMath.make(500n, runBrand);
  const withdrawRun3WithFees = multiplyBy(withdrawRun3, rates.loanFee);
  runDebtLevel = amountMath.add(
    runDebtLevel,
    amountMath.add(withdrawRunAmount, withdrawRun3WithFees),
  );
  collateralLevel = amountMath.subtract(collateralLevel, collateralDecr2);
  const aliceReduceCollateralSeat2 = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      want: { RUN: withdrawRun3, Collateral: collateralDecr2 },
    }),
    harden({}),
  );

  await t.throwsAsync(() => E(aliceReduceCollateralSeat2).getOfferResult(), {
    // Double-disclosure bug endojs/endo#640
    // wildcards were:
    // "brand":"[Alleged: RUN brand]","value":"[5829n]"
    // "value":"[3750n]","brand":"[Alleged: RUN brand]"
    message: /The requested debt {.*} is more than the collateralization ratio allows: {.*}/,
  });
});

// Alice will over repay her borrowed RUN. In order to make that possible,
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

  const { runIssuerRecord, govIssuerRecord } = testJig;
  const { issuer: runIssuer, brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = amountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
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

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = amountMath.make(1000n, aethBrand);
  const aliceLoanAmount = amountMath.make(5000n, runBrand);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: aliceLoanAmount },
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
  const runDebt = amountMath.add(aliceLoanAmount, fee);

  t.deepEqual(debtAmount, runDebt, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const aliceProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const borrowedRun = await aliceProceeds.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(borrowedRun),
      amountMath.make(5000n, runBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebt);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebt.value);

  // Bob's loan /////////////////////////////////////

  // Create a loan for Bob for 1000 RUN with 200 aeth collateral
  const bobCollateralAmount = amountMath.make(200n, aethBrand);
  const bobLoanAmount = amountMath.make(1000n, runBrand);
  const bobLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: bobCollateralAmount },
      want: { RUN: bobLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(bobCollateralAmount),
    }),
  );
  const bobProceeds = await E(bobLoanSeat).getPayouts();
  await E(bobLoanSeat).getOfferResult();
  const bobRun = await bobProceeds.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRun),
      amountMath.make(1000n, runBrand),
    ),
  );

  // overpay debt ///////////////////////////////////// (give RUN)

  const combinedRun = await E(runIssuer).combine([borrowedRun, bobRun]);
  const depositRun2 = amountMath.make(6000n, runBrand);

  const aliceOverpaySeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { RUN: depositRun2 },
    }),
    harden({ RUN: combinedRun }),
  );

  await E(aliceOverpaySeat).getOfferResult();
  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, amountMath.makeEmpty(runBrand));

  const { RUN: lentAmount5 } = await E(aliceOverpaySeat).getCurrentAllocation();
  const loanProceeds5 = await E(aliceOverpaySeat).getPayouts();
  t.deepEqual(lentAmount5, amountMath.make(750n, runBrand));

  const runReturned = await loanProceeds5.RUN;
  t.deepEqual(
    await E(runIssuer).getAmountOf(runReturned),
    amountMath.make(750n, runBrand),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, amountMath.makeEmpty(runBrand));
  const aliceCollateralization5 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization5.numerator,
    amountMath.make(1000n, runBrand),
  );
  t.deepEqual(
    aliceCollateralization5.denominator,
    amountMath.make(1n, runBrand),
  );
});

// We'll make two loans, and trigger one via price changes, and the other via
// interest charges. The interest rate is 20%. The liquidation margin is 105%.
// Both loans will initially be over collateralized 100%. Alice will withdraw
// enough of the overage that she'll get caught when prices drop. Bob will be
// charged interest (twice), which will trigger liquidation.
test('mutable liquidity triggers and interest', async t => {
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

  // charge interest on every tick
  const loanParams = {
    chargingPeriod: 1n,
    recordingPeriod: 1n,
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

  const { runIssuerRecord, govIssuerRecord } = testJig;
  const { issuer: runIssuer, brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [10n, 7n],
    null,
    manualTimer,
    quoteMint,
    amountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 10000 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = amountMath.make(10000n, aethBrand);
  const rates = harden({
    initialPrice: makeRatio(200n, runBrand, PERCENT, aethBrand),
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    // charge 20% interest
    interestRate: makeRatio(20n * SECONDS_PER_YEAR, runBrand, 100n),
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
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

  // initial loans /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const aliceCollateralAmount = amountMath.make(1000n, aethBrand);
  const aliceLoanAmount = amountMath.make(5000n, runBrand);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: aliceCollateralAmount },
      want: { RUN: aliceLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(aliceCollateralAmount),
    }),
  );
  const { vault: aliceVault, uiNotifier: aliceNotifier } = await E(
    aliceLoanSeat,
  ).getOfferResult();

  const aliceDebtAmount = await E(aliceVault).getDebtAmount();
  const fee = multiplyBy(aliceLoanAmount, rates.loanFee);
  const aliceRunDebtLevel = amountMath.add(aliceLoanAmount, fee);
  let aliceCollateralLevel = amountMath.make(1000n, aethBrand);

  t.deepEqual(aliceDebtAmount, aliceRunDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: aliceLentAmount } = await E(
    aliceLoanSeat,
  ).getCurrentAllocation();
  const aliceLoanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(aliceLentAmount, aliceLoanAmount, 'received 5000 RUN');

  const aliceRunLent = await aliceLoanProceeds.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(aliceRunLent),
      amountMath.make(5000n, runBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, aliceRunDebtLevel);

  // Create a loan for Bob for 500 RUN with 100 Aeth collateral
  const bobCollateralAmount = amountMath.make(100n, aethBrand);
  const bobLoanAmount = amountMath.make(500n, runBrand);
  const bobLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: bobCollateralAmount },
      want: { RUN: bobLoanAmount },
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
  const bobRunDebtLevel = amountMath.add(bobLoanAmount, bobFee);

  t.deepEqual(bobDebtAmount, bobRunDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 5000 RUN');

  const bobRunLent = await bobLoanProceeds.RUN;
  t.truthy(
    amountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRunLent),
      amountMath.make(500n, runBrand),
    ),
  );

  let bobUpdate = await bobNotifier.getUpdateSince();
  t.deepEqual(bobUpdate.value.debt, bobRunDebtLevel);

  // reduce collateral  /////////////////////////////////////

  // Alice reduce collateral by 300. That leaves her at 700 * 10 > 1.05 * 5000.
  // Prices will drop from 10 to 7, she'll be liquidated: 700 * 7 < 1.05 * 5000.
  const collateralDecrement = amountMath.make(300n, aethBrand);
  aliceCollateralLevel = amountMath.subtract(
    aliceCollateralLevel,
    collateralDecrement,
  );
  const aliceReduceCollateralSeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      want: { Collateral: collateralDecrement },
    }),
    undefined,
  );

  await E(aliceReduceCollateralSeat).getOfferResult();

  const { Collateral: aliceWithdrawnAeth } = await E(
    aliceReduceCollateralSeat,
  ).getCurrentAllocation();
  const loanProceeds4 = await E(aliceReduceCollateralSeat).getPayouts();
  t.deepEqual(aliceWithdrawnAeth, amountMath.make(300n, aethBrand));

  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    amountMath.isEqual(
      await E(aethIssuer).getAmountOf(collateralWithdrawn),
      collateralDecrement,
    ),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, aliceRunDebtLevel);
  const aliceCollateralization4 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization4.numerator,
    multiplyBy(aliceCollateralLevel, makeRatio(10n, runBrand, 1n, aethBrand)),
  );
  t.deepEqual(aliceCollateralization4.denominator, aliceRunDebtLevel);

  await manualTimer.tick();
  // price levels changed and interest was charged.

  // expect Alice to be liquidated because her collateral is too low.
  aliceUpdate = await aliceNotifier.getUpdateSince();

  // Bob's loan is now 600 RUN (including interest) on 100 Aeth, with the price
  // at 7. 100 * 7 > 1.05 * 600. When interest is charged again, Bob should get
  // liquidated.

  await manualTimer.tick();
  await waitForPromisesToSettle();
  aliceUpdate = await aliceNotifier.getUpdateSince(aliceUpdate.updateCount);
  bobUpdate = await bobNotifier.getUpdateSince();
  t.truthy(aliceUpdate.value.liquidated);

  await manualTimer.tick();
  await waitForPromisesToSettle();
  bobUpdate = await bobNotifier.getUpdateSince();
  t.truthy(bobUpdate.value.liquidated);
});

test('bad chargingPeriod', async t => {
  /* @type {TestContext} */
  const setJig = () => {};
  /* @type {TestContext} */
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);

  await t.throwsAsync(
    () =>
      E(zoe).startInstance(
        stablecoinInstall,
        {},
        {
          autoswapInstall,
          priceAuthority: priceAuthorityPromise,
          loanParams,
          timerService: manualTimer,
          liquidationInstall,
        },
      ),
    { message: 'chargingPeriod (2) must be a BigInt' },
  );
});
