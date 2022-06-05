/* eslint-disable no-await-in-loop */
// @ts-check

import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { E } from '@endo/eventual-send';
import { deeplyFulfilled } from '@endo/marshal';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import {
  makeRatio,
  makeRatioFromAmounts,
  ceilMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';

import { makeTracer } from '../../src/makeTracer.js';
import {
  startEconomicCommittee,
  startVaultFactory,
  setupAmm,
  setupReserve,
} from '../../src/proposals/econ-behaviors.js';
import '../../src/vaultFactory/types.js';
import * as Collect from '../../src/collect.js';

import {
  makeVoterTool,
  setUpZoeForTest,
  setupBootstrap,
  installGovernance,
  waitForPromisesToSettle,
} from '../supports.js';
import { unsafeMakeBundleCache } from '../bundleTool.js';

/** @typedef {Record<string, any> & {
 *   aethKit: IssuerKit,
 *   committee: import('../supports.js').VoterTool,
 *   reserveCreatorFacet: AssetReserveCreatorFacet,
 *   runKit: IssuerKit,
 * }} Context */
/** @type {import('ava').TestInterface<Context>} */
// @ts-expect-error cast
const test = unknownTest;

// #region Support

// TODO path resolve these so refactors detect
const contractRoots = {
  faucet: './test/vaultFactory/faucet.js',
  liquidate: './src/vaultFactory/liquidateIncrementally.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  amm: './src/vpool-xyk-amm/multipoolMarketMaker.js',
  reserve: './src/reserve/assetReserve.js',
};

/** @typedef {import('../../src/vaultFactory/vaultFactory').VaultFactoryContract} VFC */

const trace = makeTracer('TestST');

const BASIS_POINTS = 10000n;

// Define locally to test that vaultFactory uses these values
export const Phase = /** @type {const} */ ({
  ACTIVE: 'active',
  LIQUIDATING: 'liquidating',
  CLOSED: 'closed',
  LIQUIDATED: 'liquidated',
  TRANSFER: 'transfer',
});

/**
 * dL: 1M, lM: 105%, lP: 10%, iR: 100, lF: 500
 *
 * @param {Brand} debtBrand
 */
const defaultParamValues = debtBrand =>
  harden({
    debtLimit: AmountMath.make(debtBrand, 1_000_000n),
    // margin required to maintain a loan
    liquidationMargin: makeRatio(105n, debtBrand),
    // penalty upon liquidation as proportion of debt
    liquidationPenalty: makeRatio(10n, debtBrand),
    // periodic interest rate (per charging period)
    interestRate: makeRatio(100n, debtBrand, BASIS_POINTS),
    // charge to create or increase loan balance
    loanFee: makeRatio(500n, debtBrand, BASIS_POINTS),
  });

test.before(async t => {
  const { zoe, feeMintAccess } = setUpZoeForTest();
  const runIssuer = E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const aethKit = makeIssuerKit('aEth');
  const bundleCache = await unsafeMakeBundleCache('./bundles/'); // package-relative

  // note that the liquidation might be a different bundle name
  // Collect.mapValues(contractRoots, (root, k) => loader.load(root, k)),
  const bundles = await Collect.allValues({
    faucet: bundleCache.load(contractRoots.faucet, 'faucet'),
    liquidate: bundleCache.load(
      contractRoots.liquidate,
      'liquidateIncrementally',
    ),
    VaultFactory: bundleCache.load(contractRoots.VaultFactory, 'VaultFactory'),
    amm: bundleCache.load(contractRoots.amm, 'amm'),
    reserve: bundleCache.load(contractRoots.reserve, 'reserve'),
  });
  const installation = Collect.mapValues(bundles, bundle =>
    E(zoe).install(bundle),
  );
  const contextPs = {
    bundles,
    installation,
    zoe,
    feeMintAccess,
    aethKit,
    runKit: { issuer: runIssuer, brand: runBrand },
    loanTiming: {
      chargingPeriod: 2n,
      recordingPeriod: 6n,
    },
    minInitialDebt: 50n,
    rates: defaultParamValues(runBrand),
    runInitialLiquidity: AmountMath.make(runBrand, 1_500_000_000n),
    aethInitialLiquidity: AmountMath.make(aethKit.brand, 900_000_000n),
  };
  const frozenCtx = await deeplyFulfilled(harden(contextPs));
  t.context = { ...frozenCtx, bundleCache };
  trace(t, 'CONTEXT');
});

const setupAmmAndElectorate = async (t, aethLiquidity, runLiquidity) => {
  const {
    zoe,
    aethKit: { issuer: aethIssuer },
    electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
    timer,
  } = t.context;

  const space = setupBootstrap(t, timer);
  const { consume, instance } = space;
  installGovernance(zoe, space.installation.produce);
  // TODO consider using produceInstallations()
  space.installation.produce.amm.resolve(t.context.installation.amm);
  space.installation.produce.reserve.resolve(t.context.installation.reserve);
  await startEconomicCommittee(space, {
    options: { econCommitteeOptions: electorateTerms },
  });
  await setupAmm(space, {
    options: { minInitialPoolLiquidity: 1000n },
  });
  await setupReserve(space);

  const governorCreatorFacet = consume.ammGovernorCreatorFacet;
  const governorInstance = await instance.consume.ammGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  const counter = await space.installation.consume.binaryVoteCounter;
  t.context.committee = makeVoterTool(
    zoe,
    space.consume.economicCommitteeCreatorFacet,
    space.consume.vaultFactoryGovernorCreator,
    counter,
  );

  /** @type { GovernedPublicFacet<XYKAMMPublicFacet> } */
  // @ts-expect-error cast from unknown
  const ammPublicFacet = await E(governorCreatorFacet).getPublicFacet();

  const liquidityIssuer = await E(ammPublicFacet).addIssuer(aethIssuer, 'Aeth');
  const liquidityBrand = await E(liquidityIssuer).getBrand();

  const liqProposal = harden({
    give: {
      Secondary: aethLiquidity.proposal,
      Central: runLiquidity.proposal,
    },
    want: { Liquidity: AmountMath.makeEmpty(liquidityBrand) },
  });
  const liqInvitation = await E(ammPublicFacet).addPoolInvitation();

  const ammLiquiditySeat = await E(zoe).offer(
    liqInvitation,
    liqProposal,
    harden({
      Secondary: aethLiquidity.payment,
      Central: runLiquidity.payment,
    }),
  );

  // TODO get the creator directly
  const newAmm = {
    ammCreatorFacet: await consume.ammCreatorFacet,
    ammPublicFacet,
    instance: governedInstance,
    ammLiquidity: E(ammLiquiditySeat).getPayout('Liquidity'),
  };

  return { amm: newAmm, space };
};

/**
 *
 * @param {import('ava').ExecutionContext} t
 * @param {bigint} runInitialLiquidity
 */
const getRunFromFaucet = async (t, runInitialLiquidity) => {
  const {
    installation: { faucet: installation },
    zoe,
    feeMintAccess,
  } = t.context;
  /** @type {Promise<Installation<import('./faucet.js').start>>} */
  // @ts-expect-error cast
  // On-chain, there will be pre-existing RUN. The faucet replicates that
  const { creatorFacet: faucetCreator } = await E(zoe).startInstance(
    installation,
    {},
    {},
    harden({ feeMintAccess }),
  );
  const faucetSeat = E(zoe).offer(
    await E(faucetCreator).makeFaucetInvitation(),
    harden({
      give: {},
      want: { RUN: runInitialLiquidity },
    }),
  );

  const runPayment = await E(faucetSeat).getPayout('RUN');
  return runPayment;
};

/**
 * NOTE: called separately by each test so AMM/zoe/priceAuthority don't interfere
 *
 * @param {import('ava').ExecutionContext} t
 * @param {Amount<'nat'>} initialPrice
 * @param {Amount<'nat'>} priceBase
 * @param {TimerService} timer
 */
const setupServices = async (
  t,
  initialPrice,
  priceBase,
  timer = buildManualTimer(t.log),
) => {
  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
    aethKit: { brand: aethBrand, issuer: aethIssuer, mint: aethMint },
    loanTiming,
    minInitialDebt,
    rates,
    aethInitialLiquidity,
    runInitialLiquidity,
  } = t.context;
  t.context.timer = timer;

  const runPayment = await getRunFromFaucet(t, runInitialLiquidity);
  trace(t, 'faucet', { runInitialLiquidity, runPayment });
  const runLiquidity = {
    proposal: runInitialLiquidity,
    payment: runPayment,
  };
  const aethLiquidity = {
    proposal: aethInitialLiquidity,
    payment: aethMint.mintPayment(aethInitialLiquidity),
  };
  const { amm: ammFacets, space } = await setupAmmAndElectorate(
    t,
    aethLiquidity,
    runLiquidity,
  );
  const { consume, produce } = space;
  trace(t, 'amm', { ammFacets });

  const quoteMint = makeIssuerKit('quote', AssetKind.SET).mint;
  // Cheesy hack for easy use of manual price authority
  const priceAuthority = makeManualPriceAuthority({
    actualBrandIn: aethBrand,
    actualBrandOut: runBrand,
    initialPrice: makeRatioFromAmounts(initialPrice, priceBase),
    timer,
    quoteMint,
  });
  produce.priceAuthority.resolve(priceAuthority);

  const {
    installation: { produce: iProduce },
  } = space;
  t.context.reserveCreatorFacet = space.consume.reserveCreatorFacet;
  iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
  iProduce.liquidate.resolve(t.context.installation.liquidate);
  await startVaultFactory(space, { loanParams: loanTiming }, minInitialDebt);

  const governorCreatorFacet = consume.vaultFactoryGovernorCreator;
  /** @type {Promise<VaultFactory & LimitedCreatorFacet<any>>} */
  const vaultFactoryCreatorFacet = /** @type { any } */ (
    E(governorCreatorFacet).getCreatorFacet()
  );

  // Add a vault that will lend on aeth collateral
  const aethVaultManagerP = E(vaultFactoryCreatorFacet).addVaultType(
    aethIssuer,
    'AEth',
    rates,
  );

  /** @type {[any, VaultFactory, VFC['publicFacet']]} */
  // @ts-expect-error cast
  const [governorInstance, vaultFactory, lender, aethVaultManager] =
    await Promise.all([
      E(consume.agoricNames).lookup('instance', 'VaultFactoryGovernor'),
      vaultFactoryCreatorFacet,
      E(governorCreatorFacet).getPublicFacet(),
      aethVaultManagerP,
    ]);
  trace(t, 'pa', { governorInstance, vaultFactory, lender, priceAuthority });

  const { g, v } = {
    g: {
      governorInstance,
      governorPublicFacet: E(zoe).getPublicFacet(governorInstance),
      governorCreatorFacet,
    },
    v: {
      vaultFactory,
      lender,
      aethVaultManager,
    },
  };

  return {
    zoe,
    // installs,
    governor: g,
    vaultFactory: v,
    ammFacets,
    runKit: { issuer: runIssuer, brand: runBrand },
    priceAuthority,
  };
};
// #endregion

// #region driver
const AT_NEXT = {};

/**
 * @param {import('ava').ExecutionContext<Context>} t
 * @param {Amount<'nat'>} initialPrice
 * @param {Amount<'nat'>} priceBase
 */
const makeDriver = async (t, initialPrice, priceBase) => {
  const timer = buildManualTimer(t.log);
  const services = await setupServices(t, initialPrice, priceBase, timer);

  const {
    zoe,
    aethKit: { mint: aethMint, issuer: aethIssuer, brand: aethBrand },
    runKit: { issuer: runIssuer, brand: runBrand },
  } = t.context;
  const {
    vaultFactory: { lender, vaultFactory },
    priceAuthority,
  } = services;
  const managerNotifier = await E(
    E(lender).getCollateralManager(aethBrand),
  ).getNotifier();
  let managerNotification = await E(managerNotifier).getUpdateSince();

  /** @type {UserSeat} */
  let currentSeat;
  let notification = {};
  let currentOfferResult;
  /**
   * @param {Amount<'nat'>} collateral
   * @param {Amount<'nat'>} debt
   */
  const makeVaultDriver = async (collateral, debt) => {
    /** @type {UserSeat<VaultKit>} */
    const vaultSeat = await E(zoe).offer(
      await E(lender).makeVaultInvitation(),
      harden({
        give: { Collateral: collateral },
        want: { RUN: debt },
      }),
      harden({
        Collateral: aethMint.mintPayment(collateral),
      }),
    );
    const {
      vault,
      publicNotifiers: { vault: notifier },
    } = await E(vaultSeat).getOfferResult();
    t.true(await E(vaultSeat).hasExited());
    return {
      vault: () => vault,
      vaultSeat: () => vaultSeat,
      notification: () => notification,
      close: async () => {
        currentSeat = await E(zoe).offer(E(vault).makeCloseInvitation());
        currentOfferResult = await E(currentSeat).getOfferResult();
        t.is(
          currentOfferResult,
          'your loan is closed, thank you for your business',
        );
        t.truthy(await E(vaultSeat).hasExited());
      },
      /**
       *
       * @param {import('../../src/vaultFactory/vault.js').VaultPhase} phase
       * @param {object} [likeExpected]
       * @param {AT_NEXT|number} [optSince]
       */
      notified: async (phase, likeExpected, optSince) => {
        // optSince can be AT_NEXT in order to wait for the
        // next update.
        notification = await E(notifier).getUpdateSince(
          optSince === AT_NEXT ? notification.updateCount : optSince,
        );
        t.is(notification.value.vaultState, phase);
        if (likeExpected) {
          t.like(notification.value, likeExpected);
        }
        return notification;
      },
      /**
       * @param {Amount<'nat'>} loanAmount
       * @param {Ratio} loanFee
       */
      checkBorrowed: async (loanAmount, loanFee) => {
        const debtAmount = await E(vault).getCurrentDebt();
        const fee = ceilMultiplyBy(loanAmount, loanFee);
        t.deepEqual(
          debtAmount,
          AmountMath.add(loanAmount, fee),
          'borrower RUN amount does not match',
        );
        return debtAmount;
      },
      /**
       * @param {Amount<'nat'>} expectedDebt
       * @param {Amount<'nat'>} expectedAEth
       */
      checkBalance: async (expectedDebt, expectedAEth) => {
        t.deepEqual(await E(vault).getCurrentDebt(), expectedDebt);
        t.deepEqual(await E(vault).getCollateralAmount(), expectedAEth);
      },
    };
  };

  const driver = {
    managerNotification: () => managerNotification,
    currentSeat: () => currentSeat,
    lastOfferResult: () => currentOfferResult,
    timer: () => timer,
    tick: async (ticks = 1) => {
      for (let i = 0; i < ticks; i += 1) {
        await timer.tick();
      }
    },
    makeVaultDriver,
    checkPayouts: async (expectedRUN, expectedAEth) => {
      const payouts = await E(currentSeat).getPayouts();
      const collProceeds = await aethIssuer.getAmountOf(payouts.Collateral);
      const runProceeds = await E(runIssuer).getAmountOf(payouts.RUN);
      t.deepEqual(runProceeds, expectedRUN);
      t.deepEqual(collProceeds, expectedAEth);
    },
    checkRewards: async expectedRUN => {
      t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
        RUN: expectedRUN,
      });
    },
    /**
     * @param {Amount<'nat'>} give
     * @param {Amount<'nat'>} want
     * @param {Amount<'nat'>} [optStopAfter]
     * @param {AmountKeywordRecord} [expected]
     */
    sellOnAMM: async (give, want, optStopAfter, expected) => {
      const swapInvitation = E(
        services.ammFacets.ammPublicFacet,
      ).makeSwapInvitation();
      trace(t, 'AMM sell', { give, want, optStopAfter });
      const offerArgs = optStopAfter
        ? harden({ stopAfter: optStopAfter })
        : undefined;
      currentSeat = await E(zoe).offer(
        await swapInvitation,
        harden({ give: { In: give }, want: { Out: want } }),
        harden({ In: aethMint.mintPayment(give) }),
        offerArgs,
      );
      currentOfferResult = await E(currentSeat).getOfferResult();
      if (expected) {
        const payouts = await E(currentSeat).getCurrentAllocation();
        trace(t, 'AMM payouts', payouts);
        t.like(payouts, expected);
      }
    },
    /**
     * New numerator over basePrice
     *
     * @param {Amount<'nat'>} p
     */
    setPrice: p => priceAuthority.setPrice(makeRatioFromAmounts(p, priceBase)),
    /**
     * e.g. setLiquidationTerms('MaxImpactBP', 80n)
     *
     * @param {Keyword} name
     * @param {Record<string, unknown>} newValue
     */
    setLiquidationTerms: async (name, newValue) => {
      const deadline = 3n;
      const { cast, outcome } = await E(t.context.committee).changeParam(
        harden({
          paramPath: { key: 'governedParams' },
          changes: { [name]: newValue },
        }),
        deadline,
      );
      await cast;
      await driver.tick(3);
      await outcome;
    },
    managerNotified: async (likeExpected, optSince) => {
      managerNotification = await E(managerNotifier).getUpdateSince(
        optSince === AT_NEXT ? managerNotification.updateCount : optSince,
      );
      trace(t, 'manager notifier', managerNotification);
      if (likeExpected) {
        t.like(managerNotification.value, likeExpected);
      }
      return managerNotification;
    },
    checkReserveAllocation: async (liquidityValue, stableValue) => {
      const { reserveCreatorFacet } = t.context;
      const reserveAllocations = await E(reserveCreatorFacet).getAllocations();

      const liquidityIssuer = await E(
        services.ammFacets.ammPublicFacet,
      ).getLiquidityIssuer(aethBrand);
      const liquidityBrand = await E(liquidityIssuer).getBrand();

      t.deepEqual(reserveAllocations, {
        RaEthLiquidity: AmountMath.make(liquidityBrand, liquidityValue),
        RUN: AmountMath.make(runBrand, stableValue),
      });
    },
  };
  return driver;
};
// #endregion

test('price drop', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: runBrand },
    rates,
  } = t.context;
  // When the price falls to 636, the loan will get liquidated. 636 for 900
  // Aeth is 1.4 each. The loan is 270 RUN. The margin is 1.05, so at 636, 400
  // Aeth collateral could support a loan of 268.
  t.context.loanTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const d = await makeDriver(
    t,
    AmountMath.make(runBrand, 1000n),
    AmountMath.make(aethBrand, 900n),
  );
  // Create a loan for 270 RUN with 400 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 400n);
  const loanAmount = AmountMath.make(runBrand, 270n);
  const dv = await d.makeVaultDriver(collateralAmount, loanAmount);
  trace(t, 'loan made', loanAmount, dv);
  const debtAmount = await dv.checkBorrowed(loanAmount, rates.loanFee);

  await dv.notified(Phase.ACTIVE, {
    debtSnapshot: {
      debt: debtAmount,
      interest: makeRatio(100n, runBrand),
    },
  });
  await dv.checkBalance(debtAmount, collateralAmount);

  // small change doesn't cause liquidation
  await d.setPrice(AmountMath.make(runBrand, 677n));
  trace(t, 'price dropped a little');
  await d.tick();
  await dv.notified(Phase.ACTIVE);

  await d.setPrice(AmountMath.make(runBrand, 636n));
  trace(t, 'price dropped enough to liquidate');
  await dv.notified(Phase.LIQUIDATING, undefined, AT_NEXT);

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await dv.checkBalance(debtAmount, AmountMath.makeEmpty(aethBrand));
  const collateralExpected = AmountMath.make(aethBrand, 210n);
  const debtExpected = AmountMath.makeEmpty(runBrand);
  await dv.notified(Phase.LIQUIDATED, { locked: collateralExpected }, AT_NEXT);
  await dv.checkBalance(debtExpected, collateralExpected);

  await d.checkRewards(AmountMath.make(runBrand, 14n));

  await dv.close();
  await dv.notified(Phase.CLOSED, {
    locked: AmountMath.makeEmpty(aethBrand),
    updateCount: undefined,
  });
  await d.checkPayouts(debtExpected, collateralExpected);
  await dv.checkBalance(debtExpected, AmountMath.makeEmpty(aethBrand));
});

test('price falls precipitously', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: runBrand },
    rates,
  } = t.context;
  t.context.loanTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const d = await makeDriver(
    t,
    AmountMath.make(runBrand, 2200n),
    AmountMath.make(aethBrand, 900n),
  );
  // Create a loan for 370 RUN with 400 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 400n);
  const loanAmount = AmountMath.make(runBrand, 370n);
  const dv = await d.makeVaultDriver(collateralAmount, loanAmount);
  trace(t, 'loan made', loanAmount, dv);
  const debtAmount = await dv.checkBorrowed(loanAmount, rates.loanFee);

  await dv.notified(Phase.ACTIVE, {
    debtSnapshot: {
      debt: debtAmount,
      interest: makeRatio(100n, runBrand),
    },
  });
  await dv.checkBalance(debtAmount, collateralAmount);

  // Sell some aEth to drive the value down
  await d.sellOnAMM(
    AmountMath.make(aethBrand, 200n),
    AmountMath.makeEmpty(runBrand),
  );

  // [2200n, 19180n, 1650n, 150n],
  await d.setPrice(AmountMath.make(runBrand, 19180n));
  await dv.checkBalance(debtAmount, collateralAmount);
  await d.tick();
  await dv.notified(Phase.ACTIVE);

  await d.setPrice(AmountMath.make(runBrand, 1650n));
  await d.tick();
  await dv.checkBalance(debtAmount, collateralAmount);
  await dv.notified(Phase.ACTIVE);

  // Drop price a lot
  await d.setPrice(AmountMath.make(runBrand, 150n));
  await dv.notified(Phase.LIQUIDATING, undefined, AT_NEXT);
  await dv.checkBalance(debtAmount, AmountMath.makeEmpty(aethBrand));
  // was AmountMath.make(runBrand, 103n)

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await dv.checkBalance(debtAmount, AmountMath.makeEmpty(aethBrand));
  const collateralExpected = AmountMath.make(aethBrand, 141n);
  const debtExpected = AmountMath.makeEmpty(runBrand);
  await dv.notified(Phase.LIQUIDATED, { locked: collateralExpected }, AT_NEXT);
  await dv.checkBalance(debtExpected, collateralExpected);

  await d.checkRewards(AmountMath.make(runBrand, 19n));

  await dv.close();
  await dv.notified(Phase.CLOSED, {
    locked: AmountMath.makeEmpty(aethBrand),
    updateCount: undefined,
  });
  await d.checkPayouts(debtExpected, collateralExpected);
  await dv.checkBalance(debtExpected, AmountMath.makeEmpty(aethBrand));
});

test('update liquidator', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: debtBrand },
  } = t.context;
  t.context.runInitialLiquidity = AmountMath.make(debtBrand, 500_000_000n);
  t.context.aethInitialLiquidity = AmountMath.make(aethBrand, 100_000_000n);

  const d = await makeDriver(
    t,
    AmountMath.make(debtBrand, 500n),
    AmountMath.make(aethBrand, 100n),
  );
  const loanAmount = AmountMath.make(debtBrand, 300n);
  const collateralAmount = AmountMath.make(aethBrand, 100n);
  /* * @type {UserSeat<VaultKit>} */
  const dv = await d.makeVaultDriver(collateralAmount, loanAmount);
  const debtAmount = await E(dv.vault()).getCurrentDebt();
  await dv.checkBalance(debtAmount, collateralAmount);

  let govNotify = await d.managerNotified();
  const oldLiquidator = govNotify.value.liquidatorInstance;
  trace(t, 'gov start', oldLiquidator, govNotify);
  await d.setLiquidationTerms(
    'LiquidationTerms',
    harden({
      MaxImpactBP: 80n,
      OracleTolerance: makeRatio(30n, debtBrand),
      AMMMaxSlippage: makeRatio(30n, debtBrand),
    }),
  );
  await waitForPromisesToSettle();
  govNotify = await d.managerNotified();
  const newLiquidator = govNotify.value.liquidatorInstance;
  t.not(oldLiquidator, newLiquidator);

  // trigger liquidation
  await d.setPrice(AmountMath.make(debtBrand, 300n));
  await waitForPromisesToSettle();
  await dv.notified(Phase.LIQUIDATED);
});

test('liquidate many', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: runBrand },
    rates,
  } = t.context;
  // When the price falls to 636, the loan will get liquidated. 636 for 900
  // Aeth is 1.4 each. The loan is 270 RUN. The margin is 1.05, so at 636, 400
  // Aeth collateral could support a loan of 268.

  const overThreshold = async v => {
    const debt = await E(v.vault()).getCurrentDebt();
    return ceilMultiplyBy(
      ceilMultiplyBy(debt, rates.liquidationMargin),
      makeRatio(300n, runBrand),
    );
  };
  const d = await makeDriver(
    t,
    AmountMath.make(runBrand, 1500n),
    AmountMath.make(aethBrand, 900n),
  );
  const collateral = AmountMath.make(aethBrand, 300n);
  const run = amt => AmountMath.make(runBrand, amt);
  const dv0 = await d.makeVaultDriver(collateral, run(390n));
  const dv1 = await d.makeVaultDriver(collateral, run(380n));
  const dv2 = await d.makeVaultDriver(collateral, run(370n));
  const dv3 = await d.makeVaultDriver(collateral, run(360n));
  const dv4 = await d.makeVaultDriver(collateral, run(350n));
  const dv5 = await d.makeVaultDriver(collateral, run(340n));
  const dv6 = await d.makeVaultDriver(collateral, run(330n));
  const dv7 = await d.makeVaultDriver(collateral, run(320n));
  const dv8 = await d.makeVaultDriver(collateral, run(310n));
  const dv9 = await d.makeVaultDriver(collateral, run(300n));

  await d.setPrice(await overThreshold(dv1));
  await waitForPromisesToSettle();
  await dv0.notified(Phase.LIQUIDATED);
  await dv1.notified(Phase.ACTIVE);
  await dv2.notified(Phase.ACTIVE);
  await dv3.notified(Phase.ACTIVE);
  await dv4.notified(Phase.ACTIVE);
  await dv5.notified(Phase.ACTIVE);
  await dv6.notified(Phase.ACTIVE);
  await dv7.notified(Phase.ACTIVE);
  await dv8.notified(Phase.ACTIVE);
  await dv9.notified(Phase.ACTIVE);

  await d.setPrice(await overThreshold(dv5));
  await waitForPromisesToSettle();
  await dv1.notified(Phase.LIQUIDATED);
  await dv2.notified(Phase.LIQUIDATED);
  await dv3.notified(Phase.LIQUIDATED);
  await dv4.notified(Phase.LIQUIDATED);
  await dv5.notified(Phase.ACTIVE);
  await dv6.notified(Phase.ACTIVE);
  await dv7.notified(Phase.ACTIVE);
  await dv8.notified(Phase.ACTIVE);
  await dv9.notified(Phase.ACTIVE);

  await d.setPrice(run(300n));
  await waitForPromisesToSettle();
  await dv5.notified(Phase.LIQUIDATED);
  await dv6.notified(Phase.LIQUIDATED);
  await dv7.notified(Phase.LIQUIDATED);
  await dv8.notified(Phase.LIQUIDATED);
  await dv9.notified(Phase.LIQUIDATED);
});

// 1) `give` sells for more than `stopAfter`, and got some of the input back
test('amm stopAfter - input back', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: runBrand },
  } = t.context;
  const d = await makeDriver(
    t,
    AmountMath.make(runBrand, 2_199n),
    AmountMath.make(aethBrand, 999n),
  );
  const give = AmountMath.make(aethBrand, 100n);
  const want = AmountMath.make(runBrand, 80n);
  const stopAfter = AmountMath.make(runBrand, 100n);
  const expectedAeth = AmountMath.make(aethBrand, 38n);
  const expectedRUN = stopAfter;
  await d.sellOnAMM(give, want, stopAfter, {
    In: expectedAeth,
    Out: expectedRUN,
  });
});

// 2) `give` wouldn't have sold for `stopAfter`, so sell it all
test('amm stopAfter - shortfall', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: runBrand },
  } = t.context;
  // uses off-by-one amounts to force rounding errors
  const d = await makeDriver(
    t,
    AmountMath.make(runBrand, 2_199n),
    AmountMath.make(aethBrand, 999n),
  );
  const give = AmountMath.make(aethBrand, 100n);
  const want = AmountMath.make(runBrand, 80n);
  // 164 is the most I could get
  const stopAfter = AmountMath.make(runBrand, 180n);
  const expectedAeth = AmountMath.makeEmpty(aethBrand);
  const expectedRUN = AmountMath.make(runBrand, 164n);
  await d.sellOnAMM(give, want, stopAfter, {
    In: expectedAeth,
    Out: expectedRUN,
  });
});

// 3) wouldn't have sold for enough, so sold everything,
//    and that still wasn't enough for `want.Out`
test('amm stopAfter - want too much', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: runBrand },
  } = t.context;
  // uses off-by-one amounts to force rounding errors
  const d = await makeDriver(
    t,
    AmountMath.make(runBrand, 2_199n),
    AmountMath.make(aethBrand, 999n),
  );
  const give = AmountMath.make(aethBrand, 100n);
  const want = AmountMath.make(runBrand, 170n);
  const stopAfter = AmountMath.make(runBrand, 180n);
  const expectedAeth = give;
  const expectedRUN = AmountMath.makeEmpty(runBrand);
  await d.sellOnAMM(give, want, stopAfter, {
    In: expectedAeth,
    Out: expectedRUN,
  });
});

test('penalties to reserve', async t => {
  const {
    aethKit: { brand: aethBrand },
    runKit: { brand: runBrand },
  } = t.context;

  const d = await makeDriver(
    t,
    AmountMath.make(runBrand, 1000n),
    AmountMath.make(aethBrand, 900n),
  );
  // Create a loan for 270 RUN with 400 aeth collateral
  const collateralAmount = AmountMath.make(aethBrand, 400n);
  const loanAmount = AmountMath.make(runBrand, 270n);
  await d.makeVaultDriver(collateralAmount, loanAmount);

  // liquidate
  d.setPrice(AmountMath.make(runBrand, 636n));
  await waitForPromisesToSettle();

  await d.checkReserveAllocation(1000n, 29n);
});

test.only('case 5513', async t => {
  // 1. set up
  // diff: report had IbcATOM
  const { aethKit: aeth, runKit: run } = t.context;
  const d = await makeDriver(
    t,
    // report had price 0.2
    AmountMath.make(run.brand, 200n * BASIS_POINTS),
    AmountMath.make(aeth.brand, 1_000n * BASIS_POINTS), // denominator for prices
  );

  // 2. set the Oracle price to 12.34 using the manual oracle
  d.setPrice(AmountMath.make(run.brand, 1234n * BASIS_POINTS));

  // 3. raise LiquidationMargin to 200% using another governance vote

  // 4. borrow n=??? RUN against 3 ATOM at 225% collateralization ratio
  const dv = await d.makeVaultDriver(
    AmountMath.make(aeth.brand, 3n * BASIS_POINTS),
    AmountMath.make(run.brand, 1n * BASIS_POINTS),
  );
  await dv.notified(Phase.ACTIVE, {
    debtSnapshot: {
      debt: AmountMath.make(run.brand, 1n * BASIS_POINTS + 500n),
      interest: makeRatio(100n, run.brand),
    },
  });

  // 5. set Oracle price to 40
  d.setPrice(AmountMath.make(run.brand, 4000n * BASIS_POINTS));

  // 6. make a big AMM trade to set the price to 20 (I think...)
  await d.sellOnAMM(
    AmountMath.make(aeth.brand, 200n),
    AmountMath.makeEmpty(run.brand),
    undefined,
    {
      In: AmountMath.make(aeth.brand, 0n),
      Out: AmountMath.make(run.brand, 331n),
    },
  );
  // TODO confirm the new price
  await dv.notified(Phase.ACTIVE);
  await dv.checkBalance(
    AmountMath.make(run.brand, 1n * BASIS_POINTS + 500n),
    AmountMath.make(aeth.brand, 30_000n),
  );

  // 7. do the big AMM trade again (cuz it wasn't clear that it worked); price becomes 40 (I think)
  await d.sellOnAMM(
    AmountMath.make(aeth.brand, 200n),
    AmountMath.makeEmpty(run.brand),
    undefined,
    {
      In: AmountMath.make(aeth.brand, 0n),
      Out: AmountMath.make(run.brand, 331n),
    },
  );
  // TODO confirm the new price

  // 8. set the Oracle price to 12 in an attempt to force liquidation
  d.setPrice(AmountMath.make(run.brand, 1200n));

  // 9. fail to observe liquidation
  // in this test currently, it does fail as in the ticket if we don't want for promises to settle
  await waitForPromisesToSettle();
  await dv.notified(Phase.LIQUIDATED);
});
