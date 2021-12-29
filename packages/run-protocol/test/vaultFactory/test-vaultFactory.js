// @ts-check
/* global setImmediate */

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';
import '../../src/vaultFactory/types.js';

import { resolve as importMetaResolve } from 'import-meta-resolve';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import {
  makeRatio,
  ceilMultiplyBy,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority.js';
import { assertAmountsEqual } from '@agoric/zoe/test/zoeTestHelpers.js';
import { makeParamManagerBuilder } from '@agoric/governance';
import {
  setUpZoeForTest,
  setupAmmServices,
} from '../amm/vpool-xyk-amm/setup.js';

import { makeTracer } from '../../src/makeTracer.js';
import { SECONDS_PER_YEAR } from '../../src/vaultFactory/interest.js';
import { VaultState } from '../../src/vaultFactory/vault.js';
import {
  makeGovernedTerms,
  CHARGING_PERIOD_KEY,
  RECORDING_PERIOD_KEY,
} from '../../src/vaultFactory/params.js';

const ammRoot = '../../src/vpool-xyk-amm/multipoolMarketMaker.js';
const vaultFactoryRoot = '../../src/vaultFactory/vaultFactory.js';
const liquidationRoot = '../../src/vaultFactory/liquidateMinimum.js';

const faucetRoot = './faucet.js';

const contractGovernorRoot = '@agoric/governance/src/contractGovernor.js';
const committeeRoot = '@agoric/governance/src/committee.js';
const voteCounterRoot = '@agoric/governance/src/binaryVoteCounter.js';

const trace = makeTracer('TestST');

const BASIS_POINTS = 10000n;

async function makeBundle(sourceRoot) {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const path = new URL(url).pathname;
  const contractBundle = await bundleSource(path);
  trace('makeBundle', sourceRoot);
  return contractBundle;
}

// makeBundle is a slow step, so we do it once for all the tests.
const vaultFactoryBundleP = makeBundle(vaultFactoryRoot);
const liquidationBundleP = makeBundle(liquidationRoot);
const contractGovernorBundleP = makeBundle(contractGovernorRoot);
const committeeBundleP = makeBundle(committeeRoot);
const voteCounterBundleP = makeBundle(voteCounterRoot);
const ammBundleP = makeBundle(ammRoot);
const faucetBundleP = makeBundle(faucetRoot);

function installBundle(zoe, contractBundle) {
  return E(zoe).install(contractBundle);
}

function setupAssets() {
  // setup collateral assets
  const aethKit = makeIssuerKit('aEth');

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
  timer,
  quoteMint,
  unitAmountIn,
  quoteInterval,
) => {
  const options = {
    actualBrandIn: brandIn,
    actualBrandOut: brandOut,
    priceList,
    timer,
    quoteMint,
    unitAmountIn,
    quoteInterval,
  };
  return makeScriptedPriceAuthority(options);
};

function makeRates(runBrand) {
  return harden({
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

async function setupAmmAndElectorate(
  timer,
  installs,
  zoe,
  aethLiquidity,
  runLiquidity,
  runIssuer,
  aethIssuer,
  electorateTerms,
) {
  const centralR = { issuer: runIssuer };

  const {
    amm,
    committeeCreator,
    governor,
    invitationAmount,
    electorateInstance,
  } = await setupAmmServices(electorateTerms, centralR, timer, zoe);

  const liquidityIssuer = E(amm.ammPublicFacet).addPool(aethIssuer, 'Aeth');
  const liquidityBrand = await E(liquidityIssuer).getBrand();

  const liqProposal = harden({
    give: {
      Secondary: aethLiquidity.proposal,
      Central: runLiquidity.proposal,
    },
    want: { Liquidity: AmountMath.makeEmpty(liquidityBrand) },
  });
  const liqInvitation = await E(
    amm.ammPublicFacet,
  ).makeAddLiquidityInvitation();

  const ammLiquiditySeat = await E(zoe).offer(
    liqInvitation,
    liqProposal,
    harden({
      Secondary: aethLiquidity.payment,
      Central: runLiquidity.payment,
    }),
  );

  const newAmm = {
    ammCreatorFacet: amm.ammCreatorFacet,
    ammPublicFacet: amm.ammPublicFacet,
    instance: amm.governedInstance,
    ammLiquidity: E(ammLiquiditySeat).getPayout('Liquidity'),
  };

  return {
    governor,
    amm: newAmm,
    committeeCreator,
    electorateInstance,
    invitationAmount,
  };
}

async function setupVaultFactory(
  governorTerms,
  installs,
  zoe,
  committeeCreator,
) {
  const {
    instance: governorInstance,
    publicFacet: governorPublicFacet,
    creatorFacet: governorCreatorFacet,
  } = await E(zoe).startInstance(installs.governor, {}, governorTerms, {
    electorateCreatorFacet: committeeCreator,
  });

  const vaultFactoryP = E(governorCreatorFacet).getCreatorFacet();
  const lenderP = E(governorCreatorFacet).getPublicFacet();

  const [vaultFactory, lender] = await Promise.all([vaultFactoryP, lenderP]);

  const g = { governorInstance, governorPublicFacet, governorCreatorFacet };

  const v = { vaultFactory, lender };
  return { g, v };
}

async function bundleInstalls(zoe) {
  const [
    vaultFactoryBundle,
    liquidationBundle,
    contractGovernorBundle,
    committeeBundle,
    voteCounterBundle,
    ammBundle,
    faucetBundle,
  ] = await Promise.all([
    vaultFactoryBundleP,
    liquidationBundleP,
    contractGovernorBundleP,
    committeeBundleP,
    voteCounterBundleP,
    ammBundleP,
    faucetBundleP,
  ]);

  const [
    vaultFactory,
    liquidation,
    governor,
    electorate,
    counter,
    amm,
    faucet,
  ] = await Promise.all([
    installBundle(zoe, vaultFactoryBundle),
    installBundle(zoe, liquidationBundle),
    installBundle(zoe, contractGovernorBundle),
    installBundle(zoe, committeeBundle),
    installBundle(zoe, voteCounterBundle),
    installBundle(zoe, ammBundle),
    installBundle(zoe, faucetBundle),
  ]);

  const installs = {
    vaultFactory,
    liquidation,
    governor,
    electorate,
    counter,
    amm,
    faucet,
  };
  return installs;
}

async function getRunFromFaucet(
  zoe,
  installs,
  feeMintAccess,
  runBrand,
  runInitialLiquidity,
) {
  // On-chain, there will be pre-existing RUN. The faucet replicates that
  const { creatorFacet: faucetCreator } = await E(zoe).startInstance(
    installs.faucet,
    {},
    {},
    harden({ feeMintAccess }),
  );
  const faucetSeat = E(zoe).offer(
    await E(faucetCreator).makeFaucetInvitation(),
    harden({
      give: {},
      want: { RUN: AmountMath.make(runBrand, runInitialLiquidity) },
    }),
    harden({}),
    { feeMintAccess },
  );

  const runPayment = await E(faucetSeat).getPayout('RUN');
  return runPayment;
}

// called separately by each test so AMM/zoe/priceAuthority don't interfere
async function setupServices(
  loanParams,
  priceList,
  unitAmountIn,
  aethBrand,
  electorateTerms,
  timer = buildManualTimer(console.log),
  quoteInterval,
  aethLiquidity,
  runInitialLiquidity,
  aethIssuer,
) {
  const { zoe, feeMintAccess } = await setUpZoeForTest();
  const installs = await bundleInstalls(zoe);
  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const runPayment = await getRunFromFaucet(
    zoe,
    installs,
    feeMintAccess,
    runBrand,
    runInitialLiquidity,
  );

  const runLiquidity = {
    proposal: harden(AmountMath.make(runBrand, runInitialLiquidity)),
    payment: runPayment,
  };

  const {
    amm: ammFacets,
    committeeCreator,
    electorateInstance,
  } = await setupAmmAndElectorate(
    timer,
    installs,
    zoe,
    aethLiquidity,
    runLiquidity,
    runIssuer,
    aethIssuer,
    electorateTerms,
  );

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;

  const rates = makeRates(runBrand);

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [initialPoserInvitation, invitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  const vaultFactoryTerms = makeGovernedTerms(
    priceAuthorityPromise,
    loanParams,
    installs.liquidation,
    timer,
    invitationAmount,
    rates,
    ammFacets.ammPublicFacet,
  );

  const governorTerms = harden({
    timer,
    electorateInstance,
    governedContractInstallation: installs.vaultFactory,
    governed: {
      terms: vaultFactoryTerms,
      issuerKeywordRecord: {},
      privateArgs: { feeMintAccess, initialPoserInvitation },
    },
  });

  const { g, v } = await setupVaultFactory(
    governorTerms,
    installs,
    zoe,
    committeeCreator,
  );

  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;

  // priceAuthority needs the RUN brand, which isn't available until the
  // vaultFactory has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethBrand,
    runBrand,
    priceList,
    timer,
    quoteMint,
    unitAmountIn,
    quoteInterval,
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  return {
    zoe,
    installs,
    governor: g,
    vaultFactory: v,
    ammFacets,
    runKit: { issuer: runIssuer, brand: runBrand },
    priceAuthority,
  };
}

test('first', async t => {
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const services = await setupServices(
    loanParams,
    [500n, 15n],
    AmountMath.make(aethBrand, 900n),
    aethBrand,
    { committeeName: 'TheCabal', committeeSize: 5 },
    buildManualTimer(console.log),
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  // Add a vault that will lend on aeth collateral
  const rates = makeRates(runBrand);
  /** @type {VaultManager} */
  const aethVaultManager = await E(vaultFactory).addVaultType(
    aethIssuer,
    'AEth',
    rates,
  );

  // Create a loan for 470 RUN with 1100 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 1100n);
  const loanAmount = AmountMath.make(runBrand, 470n);
  const loanSeat = await E(zoe).offer(
    await E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = ceilMultiplyBy(AmountMath.make(runBrand, 470n), rates.loanFee);
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
    await E(vault).getCollateralAmount(),
    AmountMath.make(aethBrand, 1100n),
    'vault holds 1100 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = AmountMath.make(aethBrand, 100n);
  const paybackAmount = AmountMath.make(runBrand, 200n);
  const [paybackPayment, _remainingPayment] = await E(runIssuer).split(
    runLent,
    paybackAmount,
  );

  const seat = await E(zoe).offer(
    await E(vault).makeAdjustBalancesInvitation(),
    harden({
      give: { RUN: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({
      RUN: paybackPayment,
    }),
  );

  const payouts = E(seat).getPayouts();
  const { Collateral: returnedCollateral, RUN: returnedRun } = await payouts;
  t.deepEqual(
    await E(vault).getDebtAmount(),
    AmountMath.make(runBrand, 294n),
    'debt reduced to 294 RUN',
  );
  t.deepEqual(
    await E(vault).getCollateralAmount(),
    AmountMath.make(aethBrand, 1000n),
    'vault holds 1000 Collateral',
  );
  t.deepEqual(
    await aethIssuer.getAmountOf(returnedCollateral),
    AmountMath.make(aethBrand, 100n),
    'withdrew 100 collateral',
  );
  t.deepEqual(
    await E(runIssuer).getAmountOf(returnedRun),
    AmountMath.makeEmpty(runBrand),
    'received no run',
  );

  await E(aethVaultManager).liquidateAll();
  t.truthy(
    AmountMath.isEmpty(await E(vault).getDebtAmount()),
    'debt is paid off',
  );
  t.truthy(
    AmountMath.isEmpty(await E(vault).getCollateralAmount()),
    'vault is cleared',
  );

  t.is(await E(vault).getLiquidationPromise(), 'Liquidated');
  const liquidations = await E(
    E(vault).getLiquidationSeat(),
  ).getCurrentAllocation();
  t.deepEqual(liquidations.Collateral, AmountMath.make(aethBrand, 566n));
  t.deepEqual(liquidations.RUN, AmountMath.makeEmpty(runBrand));

  t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
    RUN: AmountMath.make(runBrand, 24n),
  });
});

test('price drop', async t => {
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();

  const manualTimer = buildManualTimer(console.log);
  // When the price falls to 636, the loan will get liquidated. 636 for 900
  // Aeth is 1.4 each. The loan is 270 RUN. The margin is 1.05, so at 636, 400
  // Aeth collateral could support a loan of 268.
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const services = await setupServices(
    loanParams,
    [1000n, 677n, 636n],
    AmountMath.make(aethBrand, 900n),
    aethBrand,
    { committeeName: 'TheCabal', committeeSize: 5 },
    manualTimer,
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );

  const {
    zoe,
    runKit: { brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  // Add a vault that will lend on aeth collateral
  const rates = makeRates(runBrand);
  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // Create a loan for 270 RUN with 400 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 400n);
  const loanAmount = AmountMath.make(runBrand, 270n);
  const loanSeat = await E(zoe).offer(
    await E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { RUN: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, uiNotifier } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = ceilMultiplyBy(AmountMath.make(runBrand, 270n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'borrower RUN amount does not match',
  );

  const notification1 = await E(uiNotifier).getUpdateSince();
  t.falsy(notification1.value.liquidated);
  t.deepEqual(
    await notification1.value.collateralizationRatio,
    makeRatio(444n, runBrand, 284n),
  );
  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.truthy(AmountMath.isEqual(lentAmount, loanAmount), 'received 470 RUN');
  t.deepEqual(
    await E(vault).getCollateralAmount(),
    AmountMath.make(aethBrand, 400n),
    'vault holds 11 Collateral',
  );

  await manualTimer.tick();
  const notification2 = await E(uiNotifier).getUpdateSince();
  t.is(notification2.updateCount, 2);
  t.falsy(notification2.value.liquidated);

  await manualTimer.tick();
  const notification3 = await E(uiNotifier).getUpdateSince();
  t.is(notification3.updateCount, 2);
  t.falsy(notification3.value.liquidated);

  await manualTimer.tick();
  const notification4 = await E(uiNotifier).getUpdateSince(2);
  t.falsy(notification4.value.liquidated);
  t.is(notification4.value.vaultState, VaultState.LIQUIDATING);

  await manualTimer.tick();
  const notification5 = await E(uiNotifier).getUpdateSince(3);

  t.falsy(notification5.updateCount);
  t.truthy(notification5.value.liquidated);

  const debtAmountAfter = await E(vault).getDebtAmount();
  const finalNotification = await E(uiNotifier).getUpdateSince();
  t.truthy(finalNotification.value.liquidated);
  t.deepEqual(
    await finalNotification.value.collateralizationRatio,
    makeRatio(0n, runBrand, 1n),
  );
  t.truthy(AmountMath.isEmpty(debtAmountAfter));

  t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
    RUN: AmountMath.make(runBrand, 14n),
  });

  t.is(await E(vault).getLiquidationPromise(), 'Liquidated');
  const liquidations = await E(
    E(vault).getLiquidationSeat(),
  ).getCurrentAllocation();
  t.deepEqual(liquidations.Collateral, AmountMath.make(aethBrand, 1n));
  t.deepEqual(liquidations.RUN, AmountMath.makeEmpty(runBrand));
});

test('price falls precipitously', async t => {
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  // The borrower will deposit 4 Aeth, and ask to borrow 470 RUN. The
  // PriceAuthority's initial quote is 180. The max loan on 4 Aeth would be 600
  // (to make the margin 20%).
  // When the price falls to 123, the loan will get liquidated. At that point, 4
  // Aeth is worth 492, with a 5% margin, 493 is required.
  // The Autowap provides 534 RUN for the 4 Aeth collateral, so the borrower
  // gets 41 back

  const manualTimer = buildManualTimer(console.log);
  const aethInitialLiquidity = AmountMath.make(aethBrand, 900n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };
  const services = await setupServices(
    loanParams,
    [2200n, 19180n, 1650n, 150n],
    AmountMath.make(aethBrand, 900n),
    aethBrand,
    { committeeName: 'TheCabal', committeeSize: 5 },
    manualTimer,
    undefined,
    aethLiquidity,
    1500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  // Add a vault that will lend on aeth collateral
  const rates = makeRates(runBrand);
  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // Create a loan for 370 RUN with 400 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 400n);
  const loanAmount = AmountMath.make(runBrand, 370n);
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

  const { vault } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = ceilMultiplyBy(AmountMath.make(runBrand, 370n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'borrower owes 388 RUN',
  );
  trace('correct debt', debtAmount);

  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.deepEqual(lentAmount, loanAmount, 'received 470 RUN');
  t.deepEqual(
    await E(vault).getCollateralAmount(),
    AmountMath.make(aethBrand, 400n),
    'vault holds 400 Collateral',
  );

  // Sell some Eth to drive the value down
  const swapInvitation = E(
    services.ammFacets.ammPublicFacet,
  ).makeSwapInvitation();
  const proposal = harden({
    give: { In: AmountMath.make(aethBrand, 200n) },
    want: { Out: AmountMath.makeEmpty(runBrand) },
  });
  await E(zoe).offer(
    await swapInvitation,
    proposal,
    harden({
      In: aethMint.mintPayment(AmountMath.make(aethBrand, 200n)),
    }),
  );

  await manualTimer.tick();
  t.falsy(AmountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(AmountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(AmountMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();

  t.is(await E(vault).getLiquidationPromise(), 'Liquidated');

  // An emergency liquidation got less than full value
  const newDebtAmount = await E(vault).getDebtAmount();

  t.truthy(AmountMath.isGTE(AmountMath.make(runBrand, 70n), newDebtAmount));

  t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
    RUN: AmountMath.make(runBrand, 19n),
  });

  const liquidations = await E(
    E(vault).getLiquidationSeat(),
  ).getCurrentAllocation();
  t.deepEqual(liquidations.Collateral, AmountMath.make(aethBrand, 1n));
  t.deepEqual(liquidations.RUN, AmountMath.makeEmpty(runBrand));
});

test('vaultFactory display collateral', async t => {
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const aethInitialLiquidity = AmountMath.make(aethBrand, 900n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const services = await setupServices(
    loanParams,
    [500n, 1500n],
    AmountMath.make(aethBrand, 90n),
    aethBrand,
    { committeeName: 'TheCabal', committeeSize: 5 },
    buildManualTimer(console.log),
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );

  const {
    runKit: { brand: runBrand },
  } = services;
  const { vaultFactory } = services.vaultFactory;

  const rates = harden({
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    interestRate: makeRatio(100n, runBrand, BASIS_POINTS),
    loanFee: makeRatio(530n, runBrand, BASIS_POINTS),
  });

  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  const collaterals = await E(vaultFactory).getCollaterals();

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
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const secondsPerDay = SECONDS_PER_YEAR / 365n;
  const loanParams = {
    chargingPeriod: secondsPerDay * 7n,
    recordingPeriod: secondsPerDay * 7n,
  };
  // Clock ticks by days
  const manualTimer = buildManualTimer(console.log, 0n, secondsPerDay);

  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const services = await setupServices(
    loanParams,
    [500n, 1500n],
    AmountMath.make(aethBrand, 90n),
    aethBrand,
    { committeeName: 'TheCabal', committeeSize: 5 },
    manualTimer,
    secondsPerDay,
    aethLiquidity,
    500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  const interestRate = makeRatio(5n, runBrand);
  const rates = harden({
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    interestRate,
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
  });
  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // Create a loan for Alice for 4700 RUN with 1100 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 1100n);
  const aliceLoanAmount = AmountMath.make(runBrand, 4700n);
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
  const fee = ceilMultiplyBy(aliceLoanAmount, rates.loanFee);
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
      AmountMath.make(runBrand, 4700n),
    ),
  );

  // Create a loan for Bob for 3200 RUN with 800 aeth collateral
  const bobCollateralAmount = AmountMath.make(aethBrand, 800n);
  const bobLoanAmount = AmountMath.make(runBrand, 3200n);
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
  const bobFee = ceilMultiplyBy(bobLoanAmount, rates.loanFee);
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
      AmountMath.make(runBrand, 3200n),
    ),
  );

  // { chargingPeriod: weekly, recordingPeriod: weekly }
  for (let i = 0; i < 8; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();

  const aliceUpdate = await E(aliceNotifier).getUpdateSince();
  const bobUpdate = await E(bobNotifier).getUpdateSince();
  // 160 is initial fee. interest is 3n/week. compounding is in the noise.
  const bobAddedDebt = 160n + 4n;
  t.deepEqual(
    bobUpdate.value.debt,
    AmountMath.make(runBrand, 3200n + bobAddedDebt),
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

  // 236 is the initial fee. Interest is 4n/week
  const aliceAddedDebt = 236n + 4n;
  t.deepEqual(
    aliceUpdate.value.debt,
    AmountMath.make(runBrand, 4700n + aliceAddedDebt),
    `should have collected ${aliceAddedDebt}`,
  );
  t.deepEqual(aliceUpdate.value.interestRate, interestRate);
  t.deepEqual(aliceUpdate.value.liquidationRatio, makeRatio(105n, runBrand));
  const aliceCollateralization = aliceUpdate.value.collateralizationRatio;
  t.truthy(
    aliceCollateralization.numerator.value >
      aliceCollateralization.denominator.value,
  );

  const rewardAllocation = await E(vaultFactory).getRewardAllocation();
  t.truthy(
    AmountMath.isEqual(
      rewardAllocation.RUN,
      AmountMath.make(runBrand, aliceAddedDebt + bobAddedDebt),
    ),
    // reward includes 5% fees on two loans plus 1% interest three times on each
    `Should be ${aliceAddedDebt + bobAddedDebt}, was ${rewardAllocation.RUN}`,
  );
});

test('adjust balances', async t => {
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const services = await setupServices(
    loanParams,
    [15n],
    AmountMath.make(aethBrand, 1n),
    aethBrand,
    { committeeName: 'TheCabal', committeeSize: 5 },
    buildManualTimer(console.log),
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  const priceConversion = makeRatio(15n, runBrand, 1n, aethBrand);
  const rates = makeRates(runBrand);
  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // initial loan /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 1000n);
  const aliceLoanAmount = AmountMath.make(runBrand, 5000n);
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
  const fee = ceilMultiplyBy(aliceLoanAmount, rates.loanFee);
  let runDebtLevel = AmountMath.add(aliceLoanAmount, fee);
  let collateralLevel = AmountMath.make(aethBrand, 1000n);

  t.deepEqual(debtAmount, runDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const runLent = await loanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent),
      AmountMath.make(runBrand, 5000n),
    ),
  );

  let aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebtLevel.value);

  // increase collateral 1 ///////////////////////////////////// (give both)

  // Alice increase collateral by 100, paying in 50 RUN against debt
  const collateralIncrement = AmountMath.make(aethBrand, 100n);
  const depositRunAmount = AmountMath.make(runBrand, 50n);
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

  aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization2 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization2.numerator,
    ceilMultiplyBy(collateralLevel, priceConversion),
  );
  t.deepEqual(aliceCollateralization2.denominator, runDebtLevel);

  // increase collateral 2 ////////////////////////////////// (want:s, give:c)

  // Alice increase collateral by 100, withdrawing 50 RUN
  const collateralIncrement2 = AmountMath.make(aethBrand, 100n);
  const withdrawRunAmount = AmountMath.make(runBrand, 50n);
  const withdrawRunAmountWithFees = ceilMultiplyBy(
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
  t.deepEqual(lentAmount3, AmountMath.make(runBrand, 50n));

  debtAmount = await E(aliceVault).getDebtAmount();
  t.deepEqual(debtAmount, runDebtLevel);

  const runLent3 = await loanProceeds3.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent3),
      AmountMath.make(runBrand, 50n),
    ),
  );

  aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization3 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization3.numerator,
    ceilMultiplyBy(collateralLevel, priceConversion),
  );
  t.deepEqual(aliceCollateralization3.denominator, runDebtLevel);

  // reduce collateral  ///////////////////////////////////// (want both)

  // Alice reduce collateral by 100, withdrawing 50 RUN
  const collateralDecrement = AmountMath.make(aethBrand, 100n);
  const withdrawRun2 = AmountMath.make(runBrand, 50n);
  const withdrawRun2WithFees = ceilMultiplyBy(withdrawRun2, rates.loanFee);
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
  t.deepEqual(lentAmount4, AmountMath.make(runBrand, 50n));

  const runBorrowed = await loanProceeds4.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runBorrowed),
      AmountMath.make(runBrand, 50n),
    ),
  );
  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    AmountMath.isEqual(
      await E(aethIssuer).getAmountOf(collateralWithdrawn),
      collateralDecrement,
    ),
  );

  aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization4 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization4.numerator,
    ceilMultiplyBy(collateralLevel, priceConversion),
  );
  t.deepEqual(aliceCollateralization4.denominator, runDebtLevel);

  // NSF  ///////////////////////////////////// (want too much of both)

  // Alice reduce collateral by 100, withdrawing 50 RUN
  const collateralDecr2 = AmountMath.make(aethBrand, 800n);
  const withdrawRun3 = AmountMath.make(runBrand, 500n);
  const withdrawRun3WithFees = ceilMultiplyBy(withdrawRun3, rates.loanFee);
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
    message: / is more than the collateralization ratio allows:/,
    // message: /The requested debt {.*} is more than the collateralization ratio allows: {.*}/,
  });
});

// Alice will over repay her borrowed RUN. In order to make that possible,
// Bob will also take out a loan and will give her the proceeds.
test('overdeposit', async t => {
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const services = await setupServices(
    loanParams,
    [15n],
    AmountMath.make(aethBrand, 1n),
    aethBrand,
    { committeeName: 'TheCabal', committeeSize: 5 },
    buildManualTimer(console.log),
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  const rates = makeRates(runBrand);
  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // Alice's loan /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 1000n);
  const aliceLoanAmount = AmountMath.make(runBrand, 5000n);
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
  const fee = ceilMultiplyBy(aliceLoanAmount, rates.loanFee);
  const runDebt = AmountMath.add(aliceLoanAmount, fee);

  t.deepEqual(debtAmount, runDebt, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const aliceProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const borrowedRun = await aliceProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(borrowedRun),
      AmountMath.make(runBrand, 5000n),
    ),
  );

  let aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebt);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebt.value);

  // Bob's loan /////////////////////////////////////

  // Create a loan for Bob for 1000 RUN with 200 aeth collateral
  const bobCollateralAmount = AmountMath.make(aethBrand, 200n);
  const bobLoanAmount = AmountMath.make(runBrand, 1000n);
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
      AmountMath.make(runBrand, 1000n),
    ),
  );

  // overpay debt ///////////////////////////////////// (give RUN)

  const combinedRun = await E(runIssuer).combine(harden([borrowedRun, bobRun]));
  const depositRun2 = AmountMath.make(runBrand, 6000n);

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
  t.deepEqual(lentAmount5, AmountMath.make(runBrand, 750n));

  const runReturned = await loanProceeds5.RUN;
  t.deepEqual(
    await E(runIssuer).getAmountOf(runReturned),
    AmountMath.make(runBrand, 750n),
  );

  aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, AmountMath.makeEmpty(runBrand));
  const aliceCollateralization5 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization5.numerator,
    AmountMath.make(runBrand, 1000n),
  );
  t.deepEqual(
    aliceCollateralization5.denominator,
    AmountMath.make(runBrand, 1n),
  );

  const collectFeesSeat = await E(zoe).offer(
    E(vaultFactory).makeCollectFeesInvitation(),
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
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const secondsPerDay = SECONDS_PER_YEAR / 365n;
  const loanParams = {
    chargingPeriod: secondsPerDay * 7n,
    recordingPeriod: secondsPerDay * 7n,
  };
  // charge interest on every tick
  const manualTimer = buildManualTimer(console.log, 0n, secondsPerDay * 7n);
  const services = await setupServices(
    loanParams,
    [10n, 7n],
    AmountMath.make(aethBrand, 1n),
    aethBrand,
    {
      committeeName: 'TheCabal',
      committeeSize: 5,
    },
    manualTimer,
    secondsPerDay * 7n,
    aethLiquidity,
    500n,
    aethIssuer,
  );

  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  // Add a vaultManager with 10000 aeth collateral at a 200 aeth/RUN rate
  const rates = harden({
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    // charge 5% interest
    interestRate: makeRatio(5n, runBrand),
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
  });

  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // initial loans /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const aliceCollateralAmount = AmountMath.make(aethBrand, 1000n);
  const aliceLoanAmount = AmountMath.make(runBrand, 5000n);
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
  const fee = ceilMultiplyBy(aliceLoanAmount, rates.loanFee);
  const aliceRunDebtLevel = AmountMath.add(aliceLoanAmount, fee);
  let aliceCollateralLevel = AmountMath.make(aethBrand, 1000n);

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
      AmountMath.make(runBrand, 5000n),
    ),
  );

  let aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, aliceRunDebtLevel);

  // Create a loan for Bob for 740 RUN with 100 Aeth collateral
  const bobCollateralAmount = AmountMath.make(aethBrand, 100n);
  const bobLoanAmount = AmountMath.make(runBrand, 740n);
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
  const bobFee = ceilMultiplyBy(bobLoanAmount, rates.loanFee);
  const bobRunDebtLevel = AmountMath.add(bobLoanAmount, bobFee);

  t.deepEqual(bobDebtAmount, bobRunDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 5000 RUN');

  const bobRunLent = await bobLoanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRunLent),
      AmountMath.make(runBrand, 740n),
    ),
  );

  let bobUpdate = await E(bobNotifier).getUpdateSince();
  t.deepEqual(bobUpdate.value.debt, bobRunDebtLevel);

  // reduce collateral  /////////////////////////////////////

  // Alice reduce collateral by 300. That leaves her at 700 * 10 > 1.05 * 5000.
  // Prices will drop from 10 to 7, she'll be liquidated: 700 * 7 < 1.05 * 5000.
  const collateralDecrement = AmountMath.make(aethBrand, 300n);
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
  t.deepEqual(aliceWithdrawnAeth, AmountMath.make(aethBrand, 300n));

  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    AmountMath.isEqual(
      await E(aethIssuer).getAmountOf(collateralWithdrawn),
      collateralDecrement,
    ),
  );

  aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, aliceRunDebtLevel);
  const aliceCollateralization4 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization4.numerator,
    ceilMultiplyBy(
      aliceCollateralLevel,
      makeRatio(10n, runBrand, 1n, aethBrand),
    ),
  );
  t.deepEqual(aliceCollateralization4.denominator, aliceRunDebtLevel);

  await manualTimer.tick();
  // price levels changed and interest was charged.

  // expect Alice to be liquidated because her collateral is too low.
  aliceUpdate = await E(aliceNotifier).getUpdateSince();

  // Bob's loan is now 777 RUN (including interest) on 100 Aeth, with the price
  // at 7. 100 * 7 > 1.05 * 777. When interest is charged again, Bob should get
  // liquidated.

  for (let i = 0; i < 8; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();
  aliceUpdate = await E(aliceNotifier).getUpdateSince(aliceUpdate.updateCount);
  bobUpdate = await E(bobNotifier).getUpdateSince();
  t.truthy(aliceUpdate.value.liquidated);

  for (let i = 0; i < 5; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();
  bobUpdate = await E(bobNotifier).getUpdateSince();

  t.truthy(bobUpdate.value.liquidated);
});

test('bad chargingPeriod', async t => {
  const loanParams = {
    chargingPeriod: 2,
    recordingPeriod: 10n,
  };

  t.throws(
    () =>
      makeParamManagerBuilder()
        // @ts-ignore It's not a bigint.
        .addNat(CHARGING_PERIOD_KEY, loanParams.chargingPeriod)
        .addNat(RECORDING_PERIOD_KEY, loanParams.recordingPeriod)
        .build(),
    { message: '2 must be a bigint' },
  );
});

test('collect fees from loan and AMM', async t => {
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const priceList = [500n, 15n];
  const unitAmountIn = AmountMath.make(aethBrand, 900n);
  const electorateTerms = { committeeName: 'TheCabal', committeeSize: 5 };
  const manualTimer = buildManualTimer(console.log);
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const services = await setupServices(
    loanParams,
    priceList,
    unitAmountIn,
    aethBrand,
    electorateTerms,
    manualTimer,
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  // Add a pool with 900 aeth collateral at a 201 aeth/RUN rate
  const rates = makeRates(runBrand);

  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // Create a loan for 470 RUN with 1100 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 1100n);
  const loanAmount = AmountMath.make(runBrand, 470n);
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

  const { vault } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = ceilMultiplyBy(AmountMath.make(runBrand, 470n), rates.loanFee);
  t.deepEqual(debtAmount, AmountMath.add(loanAmount, fee), 'vault loaned RUN');
  trace('correct debt', debtAmount);

  const { RUN: lentAmount } = await E(loanSeat).getCurrentAllocation();
  const loanProceeds = await E(loanSeat).getPayouts();
  await loanProceeds.RUN;
  t.deepEqual(lentAmount, loanAmount, 'received 47 RUN');
  t.deepEqual(
    await E(vault).getCollateralAmount(),
    AmountMath.make(aethBrand, 1100n),
    'vault holds 1100 Collateral',
  );

  t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
    RUN: AmountMath.make(runBrand, 24n),
  });

  const amm = services.ammFacets.ammPublicFacet;
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
    E(vaultFactory).makeCollectFeesInvitation(),
  );
  await E(collectFeesSeat).getOfferResult();
  const feePayoutAmount = await E.get(E(collectFeesSeat).getCurrentAllocation())
    .RUN;
  t.truthy(AmountMath.isGTE(feePayoutAmount, feePoolBalance.RUN));
});

test('close loan', async t => {
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const services = await setupServices(
    loanParams,
    [15n],
    AmountMath.make(aethBrand, 1n),
    aethBrand,
    {
      committeeName: 'Star Chamber',
      committeeSize: 5,
    },
    buildManualTimer(console.log),
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  const rates = makeRates(runBrand);
  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // initial loan /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 1000n);
  const aliceLoanAmount = AmountMath.make(runBrand, 5000n);
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
  const fee = ceilMultiplyBy(aliceLoanAmount, rates.loanFee);
  const runDebtLevel = AmountMath.add(aliceLoanAmount, fee);

  t.deepEqual(debtAmount, runDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 5000 RUN');

  const runLent = await loanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(runLent),
      AmountMath.make(runBrand, 5000n),
    ),
  );

  const aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, runDebtLevel);
  const aliceCollateralization1 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(aliceCollateralization1.numerator.value, 15000n);
  t.deepEqual(aliceCollateralization1.denominator.value, runDebtLevel.value);

  // Create a loan for Bob for 1000 RUN with 200 aeth collateral
  const bobCollateralAmount = AmountMath.make(aethBrand, 200n);
  const bobLoanAmount = AmountMath.make(runBrand, 1000n);
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
      AmountMath.make(runBrand, 1000n),
    ),
  );

  // close loan, using Bob's RUN /////////////////////////////////////

  const runRepayment = await E(runIssuer).combine(harden([bobRun, runLent]));

  const aliceCloseSeat = await E(zoe).offer(
    E(aliceVault).makeCloseInvitation(),
    harden({
      give: { RUN: AmountMath.make(runBrand, 6000n) },
      want: { Collateral: AmountMath.makeEmpty(aethBrand) },
    }),
    harden({ RUN: runRepayment }),
  );

  const closeOfferResult = await E(aliceCloseSeat).getOfferResult();
  t.is(closeOfferResult, 'your loan is closed, thank you for your business');

  const closeAlloc = await E(aliceCloseSeat).getCurrentAllocation();
  t.deepEqual(closeAlloc, {
    RUN: AmountMath.make(runBrand, 750n),
    Collateral: AmountMath.make(aethBrand, 1000n),
  });
  const closeProceeds = await E(aliceCloseSeat).getPayouts();
  const collProceeds = await aethIssuer.getAmountOf(closeProceeds.Collateral);
  const runProceeds = await E(runIssuer).getAmountOf(closeProceeds.RUN);

  t.deepEqual(runProceeds, AmountMath.make(runBrand, 750n));
  t.deepEqual(collProceeds, AmountMath.make(aethBrand, 1000n));
  t.deepEqual(
    await E(aliceVault).getCollateralAmount(),
    AmountMath.makeEmpty(aethBrand),
  );

  t.is(await E(aliceVault).getLiquidationPromise(), 'Closed');
  t.deepEqual(
    await E(E(aliceVault).getLiquidationSeat()).getCurrentAllocation(),
    {},
  );
});

test('excessive loan', async t => {
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const services = await setupServices(
    loanParams,
    [15n],
    AmountMath.make(aethBrand, 1n),
    aethBrand,
    {
      committeeName: 'Star Chamber',
      committeeSize: 5,
    },
    buildManualTimer(console.log),
    undefined,
    aethLiquidity,
    500n,
    aethIssuer,
  );
  const {
    zoe,
    runKit: { brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  const rates = makeRates(runBrand);
  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // Try to Create a loan for Alice for 5000 RUN with 100 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 100n);
  const aliceLoanAmount = AmountMath.make(runBrand, 5000n);
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
  await t.throwsAsync(() => E(aliceLoanSeat).getOfferResult(), {
    message: /exceeds max/,
  });
});

// We'll make two loans, and trigger one via interest charges, and not trigger
// liquidation of the other. The interest rate is 20%. The liquidation margin is
// 105%. Both loans will initially be over collateralized 100%. Alice will
// withdraw enough of the overage that she's on the cusp of getting caught when
// prices drop. Bob will be charged interest (twice), which will trigger
// liquidation. Alice's withdrawal is precisely gauged so the difference between
// a floorDivideBy and a ceilingDivideBy will leave her unliquidated.
test('mutable liquidity triggers and interest sensitivity', async t => {
  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
  } = setupAssets();
  const aethInitialLiquidity = AmountMath.make(aethBrand, 300n);
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };

  const secondsPerDay = SECONDS_PER_YEAR / 365n;
  const loanParams = {
    chargingPeriod: secondsPerDay * 7n,
    recordingPeriod: secondsPerDay * 7n,
  };
  // charge interest on every tick
  const manualTimer = buildManualTimer(console.log, 0n, secondsPerDay * 7n);
  const services = await setupServices(
    loanParams,
    [10n, 7n],
    AmountMath.make(aethBrand, 1n),
    aethBrand,
    {
      committeeName: 'TheCabal',
      committeeSize: 5,
    },
    manualTimer,
    secondsPerDay * 7n,
    aethLiquidity,
    500n,
    aethIssuer,
  );

  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
  } = services;
  const { vaultFactory, lender } = services.vaultFactory;

  // Add a vaultManager with 10000 aeth collateral at a 200 aeth/RUN rate
  const rates = harden({
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    // charge 5% interest
    interestRate: makeRatio(5n, runBrand),
    loanFee: makeRatio(500n, runBrand, BASIS_POINTS),
  });

  await E(vaultFactory).addVaultType(aethIssuer, 'AEth', rates);

  // initial loans /////////////////////////////////////

  // Create a loan for Alice for 5000 RUN with 1000 aeth collateral
  const aliceCollateralAmount = AmountMath.make(aethBrand, 1000n);
  const aliceLoanAmount = AmountMath.make(runBrand, 5000n);
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
  const fee = ceilMultiplyBy(aliceLoanAmount, rates.loanFee);
  const aliceRunDebtLevel = AmountMath.add(aliceLoanAmount, fee);
  let aliceCollateralLevel = AmountMath.make(aethBrand, 1000n);

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
      AmountMath.make(runBrand, 5000n),
    ),
  );

  let aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, aliceRunDebtLevel);

  // Create a loan for Bob for 740 RUN with 100 Aeth collateral
  const bobCollateralAmount = AmountMath.make(aethBrand, 100n);
  const bobLoanAmount = AmountMath.make(runBrand, 740n);
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
  const bobFee = ceilMultiplyBy(bobLoanAmount, rates.loanFee);
  const bobRunDebtLevel = AmountMath.add(bobLoanAmount, bobFee);

  t.deepEqual(bobDebtAmount, bobRunDebtLevel, 'vault lent 5000 RUN + fees');
  const { RUN: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 5000 RUN');

  const bobRunLent = await bobLoanProceeds.RUN;
  t.truthy(
    AmountMath.isEqual(
      await E(runIssuer).getAmountOf(bobRunLent),
      AmountMath.make(runBrand, 740n),
    ),
  );

  let bobUpdate = await E(bobNotifier).getUpdateSince();
  t.deepEqual(bobUpdate.value.debt, bobRunDebtLevel);

  // reduce collateral  /////////////////////////////////////

  // Alice reduce collateral by 300. That leaves her at 700 * 10 > 1.05 * 5000.
  // Prices will drop from 10 to 7, she'll be liquidated: 700 * 7 < 1.05 * 5000.
  const collateralDecrement = AmountMath.make(aethBrand, 211n);
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

  await E(aliceReduceCollateralSeat).getCurrentAllocation();
  const loanProceeds4 = await E(aliceReduceCollateralSeat).getPayouts();
  // t.deepEqual(aliceWithdrawnAeth, AmountMath.make(aethBrand, 210n));

  const collateralWithdrawn = await loanProceeds4.Collateral;
  t.truthy(
    AmountMath.isEqual(
      await E(aethIssuer).getAmountOf(collateralWithdrawn),
      collateralDecrement,
    ),
  );

  aliceUpdate = await E(aliceNotifier).getUpdateSince();
  t.deepEqual(aliceUpdate.value.debt, aliceRunDebtLevel);
  const aliceCollateralization4 = aliceUpdate.value.collateralizationRatio;
  t.deepEqual(
    aliceCollateralization4.numerator,
    ceilMultiplyBy(
      aliceCollateralLevel,
      makeRatio(10n, runBrand, 1n, aethBrand),
    ),
  );
  t.deepEqual(aliceCollateralization4.denominator, aliceRunDebtLevel);

  await manualTimer.tick();
  // price levels changed and interest was charged.

  // expect Alice to be liquidated because her collateral is too low.
  aliceUpdate = await E(aliceNotifier).getUpdateSince();

  // Bob's loan is now 777 RUN (including interest) on 100 Aeth, with the price
  // at 7. 100 * 7 > 1.05 * 777. When interest is charged again, Bob should get
  // liquidated.

  for (let i = 0; i < 8; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();
  aliceUpdate = await E(aliceNotifier).getUpdateSince(aliceUpdate.updateCount);
  bobUpdate = await E(bobNotifier).getUpdateSince();
  t.falsy(aliceUpdate.value.liquidated);

  for (let i = 0; i < 5; i += 1) {
    manualTimer.tick();
  }
  await waitForPromisesToSettle();
  bobUpdate = await E(bobNotifier).getUpdateSince();

  t.truthy(bobUpdate.value.liquidated);
});
