// @ts-check
/* global require, setImmediate */

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import '../src/types';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';

import { makeZoe } from '@agoric/zoe';
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeRatio, multiplyBy } from '@agoric/zoe/src/contractSupport/ratio';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority';
import { assertAmountsEqual } from '@agoric/zoe/test/zoeTestHelpers';
import { makeTracer } from '../src/makeTracer';
import { SECONDS_PER_YEAR } from '../src/interest';

const stablecoinRoot = '../src/stablecoinMachine.js';
const liquidationRoot = '../src/liquidateMinimum.js';
const autoswapRoot = '@agoric/zoe/src/contracts/newSwap/multipoolAutoswap';
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
  quoteInterval,
) => {
  const options = {
    actualBrandIn: brandIn,
    actualBrandOut: brandOut,
    priceList,
    tradeList,
    timer,
    quoteMint,
    unitAmountIn,
    quoteInterval,
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
    poolFee: 24n,
    protocolFee: 6n,
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

  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  // priceAuthority needs the RUN brand, which isn't available until the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [500n, 15n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(900n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  /** @type {VaultManager} */
  const aethVaultManager = await E(aethVaultSeat).getOfferResult();

  // Create a loan for 470 RUN with 1100 aeth collateral
  const collateralAmount = AmountMath.make(1100n, aethBrand);
  const loanAmount = AmountMath.make(470n, runBrand);
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
  const fee = multiplyBy(AmountMath.make(470n, runBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'vault lent 470 RUN',
  );
  trace('correct debt', debtAmount);

  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  const loanProceeds = await E(loanSeat).getPayouts();
  const runLent = await loanProceeds.RUN;
  t.deepEqual(lentAmount, loanAmount, 'received 47 RUN');
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(1100n, aethBrand),
    'vault holds 1100 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = AmountMath.make(100n, aethBrand);
  const paybackAmount = AmountMath.make(200n, runBrand);
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
    AmountMath.make(293n, runBrand),
    'debt reduced to 293 RUN',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(1000n, aethBrand),
    'vault holds 1000 Collateral',
  );
  t.deepEqual(
    returnedAmount,
    AmountMath.make(100n, aethBrand),
    'withdrew 100 collateral',
  );

  await E(aethVaultManager).liquidateAll();
  t.truthy(AmountMath.isEmpty(vault.getDebtAmount()), 'debt is paid off');
  t.truthy(AmountMath.isEmpty(vault.getCollateralAmount()), 'vault is cleared');

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    RUN: AmountMath.make(23n, runBrand),
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
  // When the price falls to 636, the loan will get liquidated. 636 for 900
  // Aeth is 1.4 each. The loan is 270 RUN. The margin is 1.05, so at 636, 400
  // Aeth collateral could support a loan of 268.

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
    poolFee: 24,
    protocolFee: 6,
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

  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [1000n, 677n, 636n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(900n, aethBrand),
  );
  // priceAuthority needs runDebt, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 RUN/aeth rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultSeat).getOfferResult();

  // Create a loan for 270 RUN with 400 aeth collateral
  const collateralAmount = AmountMath.make(400n, aethBrand);
  const loanAmount = AmountMath.make(270n, runBrand);
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
  const fee = multiplyBy(AmountMath.make(270n, runBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'borrower owes 283 RUN',
  );

  const notification1 = await uiNotifier.getUpdateSince();
  t.falsy(notification1.value.liquidated);
  t.deepEqual(
    await notification1.value.collateralizationRatio,
    makeRatio(444n, runBrand, 283n),
  );
  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.truthy(AmountMath.isEqual(lentAmount, loanAmount), 'received 470 RUN');
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(400n, aethBrand),
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

  const runPayout = await E.G(liquidationPayout).RUN;
  const runAmount = await E(runIssuer).getAmountOf(runPayout);
  t.deepEqual(runAmount, AmountMath.makeEmpty(runBrand));
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, AmountMath.make(232n, aethBrand));
  const debtAmountAfter = await E(vault).getDebtAmount();
  const finalNotification = await uiNotifier.getUpdateSince();
  t.truthy(finalNotification.value.liquidated);
  t.deepEqual(
    await finalNotification.value.collateralizationRatio,
    makeRatio(232n, runBrand, 1n),
  );
  t.truthy(AmountMath.isEmpty(debtAmountAfter));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    RUN: AmountMath.make(13n, runBrand),
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
    poolFee: 24n,
    protocolFee: 6n,
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

  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  // priceAuthority needs the RUN brand, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [2200n, 19180n, 1650n, 150n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(900n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 RUN/aeth rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  /** @type {VaultManager} */
  await E(aethVaultSeat).getOfferResult();

  // Create a loan for 370 RUN with 400 aeth collateral
  const collateralAmount = AmountMath.make(400n, aethBrand);
  const loanAmount = AmountMath.make(370n, runBrand);
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
  const fee = multiplyBy(AmountMath.make(370n, runBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'borrower owes 388 RUN',
  );
  trace('correct debt', debtAmount);

  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.deepEqual(lentAmount, loanAmount, 'received 470 RUN');
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(400n, aethBrand),
    'vault holds 400 Collateral',
  );

  // Sell some Eth to drive the value down
  const swapInvitation = E(autoswapAPI).makeSwapInvitation();
  const proposal = {
    give: { In: AmountMath.make(200n, aethBrand) },
    want: { Out: AmountMath.makeEmpty(runBrand) },
  };
  await E(zoe).offer(
    swapInvitation,
    proposal,
    harden({
      In: aethMint.mintPayment(AmountMath.make(200n, aethBrand)),
    }),
  );

  await manualTimer.tick();
  t.falsy(AmountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(AmountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(AmountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();

  const runPayout = await E.G(liquidationPayout).RUN;
  const runAmount = await E(runIssuer).getAmountOf(runPayout);

  t.deepEqual(runAmount, AmountMath.makeEmpty(runBrand));
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, AmountMath.make(8n, aethBrand));
  t.truthy(AmountMath.isEmpty(await E(vault).getDebtAmount()));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    RUN: AmountMath.make(18n, runBrand),
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
    poolFee: 24n,
    protocolFee: 6n,
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
  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(90n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
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
      want: { Governance: AmountMath.makeEmpty(govBrand) },
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

// charging period is 1 week. Clock ticks by days
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
  const secondsPerDay = SECONDS_PER_YEAR / 365n;
  const loanParams = {
    chargingPeriod: secondsPerDay * 7n,
    recordingPeriod: secondsPerDay * 7n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  // Clock ticks by days
  const manualTimer = buildManualTimer(console.log, 0n, secondsPerDay);
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
  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(90n, aethBrand),
    secondsPerDay,
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const interestRate = makeRatio(5n, runBrand);
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
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // Create a loan for Alice for 4700 RUN with 1100 aeth collateral
  const collateralAmount = AmountMath.make(1100n, aethBrand);
  const aliceLoanAmount = AmountMath.make(4700n, runBrand);
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
    AmountMath.add(aliceLoanAmount, fee),
    'vault lent 4700 RUN + fees',
  );

  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 4700 RUN');

  const runLent = await loanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent),
      AmountMath.make(4700n, runBrand),
    ),
  );

  // Create a loan for Bob for 3200 RUN with 800 aeth collateral
  const bobCollateralAmount = AmountMath.make(800n, aethBrand);
  const bobLoanAmount = AmountMath.make(3200n, runBrand);
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
    AmountMath.add(bobLoanAmount, bobFee),
    'vault lent 3200 RUN + fees',
  );

  const { RUN: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 4700 RUN');

  const bobRunLent = await bobLoanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRunLent),
      AmountMath.make(3200n, runBrand),
    ),
  );

  // { chargingPeriod: weekly, recordingPeriod: weekly }
  for (let i = 0; i < 8; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();

  const aliceUpdate = await aliceNotifier.getUpdateSince();
  const bobUpdate = await bobNotifier.getUpdateSince();
  // 160 is initial fee. interest is 3n/week. compounding is in the noise.
  const bobAddedDebt = 160n + 3n;
  t.deepEqual(
    bobUpdate.value.debt,
    AmountMath.make(3200n + bobAddedDebt, runBrand),
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

  // 235 is the initial fee. Interest is 4n/week
  const aliceAddedDebt = 235n + 4n;
  t.deepEqual(
    aliceUpdate.value.debt,
    AmountMath.make(4700n + aliceAddedDebt, runBrand),
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
    AmountMath.isEqual(
      stablecoinMachine.getRewardAllocation().RUN,
      AmountMath.make(aliceAddedDebt + bobAddedDebt, runBrand),
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
    poolFee: 24n,
    protocolFee: 6n,
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
  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  const priceConversion = makeRatio(15n, runBrand, 1n, aethBrand);
  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // initial loan /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = AmountMath.make(1000n, aethBrand);
  const aliceLoanAmount = AmountMath.make(5000n, runBrand);
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
  let runDebtLevel = AmountMath.add(aliceLoanAmount, fee);
  let collateralLevel = AmountMath.make(1000n, aethBrand);

  t.deepEqual(debtAmount, runDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const runLent = await loanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent),
      AmountMath.make(5000n, runBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebtLevel.value);

  // increase collateral 1 ///////////////////////////////////// (give both)

  // Alice increase collateral by 100, paying in 50 RUN against debt
  const collateralIncrement = AmountMath.make(100n, aethBrand);
  const depositRunAmount = AmountMath.make(50n, runBrand);
  runDebtLevel = AmountMath.subtract(runDebtLevel, depositRunAmount);
  collateralLevel = AmountMath.add(collateralLevel, collateralIncrement);

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
  t.deepEqual(lentAmount2, AmountMath.makeEmpty(runBrand), 'no payout');

  const runLent2 = await loanProceeds2.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent2),
      AmountMath.makeEmpty(runBrand),
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
  const collateralIncrement2 = AmountMath.make(100n, aethBrand);
  const withdrawRunAmount = AmountMath.make(50n, runBrand);
  const withdrawRunAmountWithFees = multiplyBy(
    withdrawRunAmount,
    rates.loanFee,
  );
  runDebtLevel = AmountMath.add(
    runDebtLevel,
    AmountMath.add(withdrawRunAmount, withdrawRunAmountWithFees),
  );
  collateralLevel = AmountMath.add(collateralLevel, collateralIncrement2);

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
  t.deepEqual(lentAmount3, AmountMath.make(50n, runBrand));

  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runDebtLevel);

  const runLent3 = await loanProceeds3.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent3),
      AmountMath.make(50n, runBrand),
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
  const collateralDecrement = AmountMath.make(100n, aethBrand);
  const withdrawRun2 = AmountMath.make(50n, runBrand);
  const withdrawRun2WithFees = multiplyBy(withdrawRun2, rates.loanFee);
  runDebtLevel = AmountMath.add(
    runDebtLevel,
    AmountMath.add(withdrawRunAmount, withdrawRun2WithFees),
  );
  collateralLevel = AmountMath.subtract(collateralLevel, collateralDecrement);
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
  t.deepEqual(lentAmount4, AmountMath.make(50n, runBrand));

  const runBorrowed = await loanProceeds4.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runBorrowed),
      AmountMath.make(50n, runBrand),
    ),
  );
  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    AmountMath.isEqual(
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
  const collateralDecr2 = AmountMath.make(800n, aethBrand);
  const withdrawRun3 = AmountMath.make(500n, runBrand);
  const withdrawRun3WithFees = multiplyBy(withdrawRun3, rates.loanFee);
  runDebtLevel = AmountMath.add(
    runDebtLevel,
    AmountMath.add(withdrawRunAmount, withdrawRun3WithFees),
  );
  collateralLevel = AmountMath.subtract(collateralLevel, collateralDecr2);
  const aliceReduceCollateralSeat2 = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      want: { RUN: withdrawRun3, Collateral: collateralDecr2 },
    }),
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
    poolFee: 24n,
    protocolFee: 6n,
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
  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // Alice's loan /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = AmountMath.make(1000n, aethBrand);
  const aliceLoanAmount = AmountMath.make(5000n, runBrand);
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
  const runDebt = AmountMath.add(aliceLoanAmount, fee);

  t.deepEqual(debtAmount, runDebt, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const aliceProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const borrowedRun = await aliceProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(borrowedRun),
      AmountMath.make(5000n, runBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebt);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebt.value);

  // Bob's loan /////////////////////////////////////

  // Create a loan for Bob for 1000 RUN with 200 aeth collateral
  const bobCollateralAmount = AmountMath.make(200n, aethBrand);
  const bobLoanAmount = AmountMath.make(1000n, runBrand);
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
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRun),
      AmountMath.make(1000n, runBrand),
    ),
  );

  // overpay debt ///////////////////////////////////// (give RUN)

  const combinedRun = await E(runIssuer).combine([borrowedRun, bobRun]);
  const depositRun2 = AmountMath.make(6000n, runBrand);

  const aliceOverpaySeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      give: { RUN: depositRun2 },
    }),
    harden({ RUN: combinedRun }),
  );

  await E(aliceOverpaySeat).getOfferResult();
  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, AmountMath.makeEmpty(runBrand));

  const { RUN: lentAmount5 } = await E(aliceOverpaySeat).getCurrentAllocation();
  const loanProceeds5 = await E(aliceOverpaySeat).getPayouts();
  t.deepEqual(lentAmount5, AmountMath.make(750n, runBrand));

  const runReturned = await loanProceeds5.RUN;
  t.deepEqual(
    await E(runIssuer).getAmountOf(runReturned),
    AmountMath.make(750n, runBrand),
  );

  aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, AmountMath.makeEmpty(runBrand));
  const aliceCollateralization5 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization5.numerator,
    AmountMath.make(1000n, runBrand),
  );
  t.deepEqual(
    aliceCollateralization5.denominator,
    AmountMath.make(1n, runBrand),
  );

  const collectFeesSeat = await E(zoe).offer(
    E(stablecoinMachine).makeCollectFeesInvitation(),
  );
  await E(collectFeesSeat).getOfferResult();
  assertAmountsEqual(
    t,
    await E.get(E(collectFeesSeat).getCurrentAllocation()).RUN,
    AmountMath.make(runBrand, 300n),
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

  const secondsPerDay = SECONDS_PER_YEAR / 365n;
  // charge interest on every tick
  const loanParams = {
    chargingPeriod: secondsPerDay * 7n,
    recordingPeriod: secondsPerDay * 7n,
    poolFee: 24n,
    protocolFee: 6n,
  };
  const manualTimer = buildManualTimer(console.log, 0n, secondsPerDay * 7n);
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
  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [10n, 7n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(1n, aethBrand),
    secondsPerDay * 7n,
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 10000 aeth collateral at a 200 aeth/RUN rate
  const capitalAmount = AmountMath.make(10000n, aethBrand);
  const rates = harden({
    initialPrice: makeRatio(200n, runBrand, PERCENT, aethBrand),
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    // charge 5% interest
    interestRate: makeRatio(5n, runBrand),
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
  });

  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // initial loans /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const aliceCollateralAmount = AmountMath.make(1000n, aethBrand);
  const aliceLoanAmount = AmountMath.make(5000n, runBrand);
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
  const aliceRunDebtLevel = AmountMath.add(aliceLoanAmount, fee);
  let aliceCollateralLevel = AmountMath.make(1000n, aethBrand);

  t.deepEqual(aliceDebtAmount, aliceRunDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: aliceLentAmount } = await E(
    aliceLoanSeat,
  ).getCurrentAllocation();
  const aliceLoanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(aliceLentAmount, aliceLoanAmount, 'received 5000 RUN');

  const aliceRunLent = await aliceLoanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(aliceRunLent),
      AmountMath.make(5000n, runBrand),
    ),
  );

  let aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, aliceRunDebtLevel);

  // Create a loan for Bob for 740 RUN with 100 Aeth collateral
  const bobCollateralAmount = AmountMath.make(100n, aethBrand);
  const bobLoanAmount = AmountMath.make(740n, runBrand);
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
  const bobRunDebtLevel = AmountMath.add(bobLoanAmount, bobFee);

  t.deepEqual(bobDebtAmount, bobRunDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 5000 RUN');

  const bobRunLent = await bobLoanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRunLent),
      AmountMath.make(740n, runBrand),
    ),
  );

  let bobUpdate = await bobNotifier.getUpdateSince();
  t.deepEqual(bobUpdate.value.debt, bobRunDebtLevel);

  // reduce collateral  /////////////////////////////////////

  // Alice reduce collateral by 300. That leaves her at 700 * 10 > 1.05 * 5000.
  // Prices will drop from 10 to 7, she'll be liquidated: 700 * 7 < 1.05 * 5000.
  const collateralDecrement = AmountMath.make(300n, aethBrand);
  aliceCollateralLevel = AmountMath.subtract(
    aliceCollateralLevel,
    collateralDecrement,
  );
  const aliceReduceCollateralSeat = await E(zoe).offer(
    E(aliceVault).makeAdjustBalancesInvitation(),
    harden({
      want: { Collateral: collateralDecrement },
    }),
  );

  await E(aliceReduceCollateralSeat).getOfferResult();

  const { Collateral: aliceWithdrawnAeth } = await E(
    aliceReduceCollateralSeat,
  ).getCurrentAllocation();
  const loanProceeds4 = await E(aliceReduceCollateralSeat).getPayouts();
  t.deepEqual(aliceWithdrawnAeth, AmountMath.make(300n, aethBrand));

  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    AmountMath.isEqual(
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

  // Bob's loan is now 777 RUN (including interest) on 100 Aeth, with the price
  // at 7. 100 * 7 > 1.05 * 777. When interest is charged again, Bob should get
  // liquidated.

  for (let i = 0; i < 8; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();
  aliceUpdate = await aliceNotifier.getUpdateSince(aliceUpdate.updateCount);
  bobUpdate = await bobNotifier.getUpdateSince();
  t.truthy(aliceUpdate.value.liquidated);

  for (let i = 0; i < 5; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();
  bobUpdate = await bobNotifier.getUpdateSince();

  t.truthy(bobUpdate.value.liquidated);
});

test('bad chargingPeriod', async t => {
  /* @type {TestContext} */
  const setJig = () => {};
  const zoe = setUpZoeForTest(setJig);

  const autoswapInstall = await makeInstall(autoswapRoot, zoe);
  const stablecoinInstall = await makeInstall(stablecoinRoot, zoe);
  const liquidationInstall = await makeInstall(liquidationRoot, zoe);

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2,
    recordingPeriod: 10n,
    poolFee: 24n,
    protocolFee: 6n,
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

test('coll fees from loan and AMM', async t => {
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
    poolFee: 24n,
    protocolFee: 6n,
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
  const { brand: runBrand } = runIssuerRecord;
  const { brand: govBrand } = govIssuerRecord;
  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  // priceAuthority needs the RUN brand, which isn't available until the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [500n, 15n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(900n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultSeat).getOfferResult();

  // Create a loan for 470 RUN with 1100 aeth collateral
  const collateralAmount = AmountMath.make(1100n, aethBrand);
  const loanAmount = AmountMath.make(470n, runBrand);
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
  const fee = multiplyBy(AmountMath.make(470n, runBrand), rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'vault lent 470 RUN',
  );
  trace('correct debt', debtAmount);

  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  const loanProceeds = await E(loanSeat).getPayouts();
  await loanProceeds.RUN;
  t.deepEqual(lentAmount, loanAmount, 'received 47 RUN');
  t.deepEqual(
    vault.getCollateralAmount(),
    AmountMath.make(1100n, aethBrand),
    'vault holds 1100 Collateral',
  );

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    RUN: AmountMath.make(23n, runBrand),
  });

  const amm = E(zoe).getPublicFacet(await E(stablecoinMachine).getAMM());
  const swapAmount = AmountMath.make(aethBrand, 60000n);
  const swapSeat = await E(zoe).offer(
    E(amm).makeSwapInInvitation(),
    harden({
      give: { In: swapAmount },
      want: { Out: AmountMath.makeEmpty(runBrand) },
    }),
    harden({
      In: aethMint.mintPayment(swapAmount),
    }),
  );

  await E(swapSeat).getPayouts();

  const feePoolBalance = await E(amm).getProtocolPoolBalance();

  const collectFeesSeat = await E(zoe).offer(
    E(stablecoinMachine).makeCollectFeesInvitation(),
  );
  await E(collectFeesSeat).getOfferResult();
  const feePayoutAmount = await E.get(E(collectFeesSeat).getCurrentAllocation())
    .RUN;
  t.truthy(AmountMath.isGTE(feePayoutAmount, feePoolBalance.RUN));
});

test('close loan', async t => {
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
    poolFee: 24n,
    protocolFee: 6n,
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
  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    [15n],
    null,
    manualTimer,
    quoteMint,
    AmountMath.make(1n, aethBrand),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/RUN rate
  const capitalAmount = AmountMath.make(900n, aethBrand);
  const rates = makeRates(runBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // initial loan /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = AmountMath.make(1000n, aethBrand);
  const aliceLoanAmount = AmountMath.make(5000n, runBrand);
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
  const {
    vault: aliceVault,
    uiNotifier: aliceNotifier,
    liquidationPayout,
  } = await E(aliceLoanSeat).getOfferResult();

  const debtAmount = await E(aliceVault).getDebtAmount();
  const fee = multiplyBy(aliceLoanAmount, rates.loanFee);
  const runDebtLevel = AmountMath.add(aliceLoanAmount, fee);

  t.deepEqual(debtAmount, runDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const runLent = await loanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent),
      AmountMath.make(5000n, runBrand),
    ),
  );

  const aliceUpdate = await aliceNotifier.getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebtLevel.value);

  // Create a loan for Bob for 1000 RUN with 200 aeth collateral
  const bobCollateralAmount = AmountMath.make(200n, aethBrand);
  const bobLoanAmount = AmountMath.make(1000n, runBrand);
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
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRun),
      AmountMath.make(1000n, runBrand),
    ),
  );

  // close loan, using Bob's RUN /////////////////////////////////////

  const runRepayment = await E(runIssuer).combine([bobRun, runLent]);

  const aliceCloseSeat = await E(zoe).offer(
    E(aliceVault).makeCloseInvitation(),
    harden({
      give: { RUN: AmountMath.make(6000n, runBrand) },
      want: { Collateral: AmountMath.makeEmpty(aethBrand) },
    }),
    harden({ RUN: runRepayment }),
  );

  const closeOfferResult = await E(aliceCloseSeat).getOfferResult();
  t.is(closeOfferResult, 'your loan is closed, thank you for your business');

  const closeAlloc = await E(aliceCloseSeat).getCurrentAllocation();
  t.deepEqual(closeAlloc, {
    RUN: AmountMath.make(750n, runBrand),
    Collateral: AmountMath.make(1000n, aethBrand),
  });
  const closeProceeds = await E(aliceCloseSeat).getPayouts();
  const collProceeds = await aethIssuer.getAmountOf(closeProceeds.Collateral);
  const runProceeds = await E(runIssuer).getAmountOf(closeProceeds.RUN);

  t.deepEqual(runProceeds, AmountMath.make(750n, runBrand));
  t.deepEqual(collProceeds, AmountMath.make(1000n, aethBrand));
  t.deepEqual(
    await E(aliceVault).getCollateralAmount(),
    AmountMath.makeEmpty(aethBrand),
  );

  const liquidation = await liquidationPayout;
  t.deepEqual(
    await E(runIssuer).getAmountOf(liquidation.RUN),
    AmountMath.makeEmpty(runBrand),
  );
  t.deepEqual(
    await aethIssuer.getAmountOf(liquidation.Collateral),
    AmountMath.makeEmpty(aethBrand),
  );
});
