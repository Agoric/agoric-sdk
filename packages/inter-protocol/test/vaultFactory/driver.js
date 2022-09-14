// @ts-check

import '@agoric/zoe/exported.js';

import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { objectMap } from '@agoric/internal';
import {
  ceilMultiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import { deeplyFulfilled } from '@endo/marshal';

import * as Collect from '../../src/collect.js';
import { makeTracer } from '../../src/makeTracer.js';
import {
  setupAmm,
  setupReserve,
  startVaultFactory,
} from '../../src/proposals/econ-behaviors.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import '../../src/vaultFactory/types.js';
import {
  installGovernance,
  makeVoterTool,
  setupBootstrap,
  setUpZoeForTest,
  withAmountUtils,
} from '../supports.js';

/** @typedef {import('../../src/vaultFactory/vaultFactory').VaultFactoryContract} VFC */

const trace = makeTracer('VFDriver');

export const AT_NEXT = Symbol('AT_NEXT');

export const BASIS_POINTS = 10000n;

// Define locally to test that vaultFactory uses these values
export const Phase = /** @type {const} */ ({
  ACTIVE: 'active',
  LIQUIDATING: 'liquidating',
  CLOSED: 'closed',
  LIQUIDATED: 'liquidated',
  TRANSFER: 'transfer',
});

const contractRoots = {
  faucet: './test/vaultFactory/faucet.js',
  liquidate: './src/vaultFactory/liquidateIncrementally.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  amm: './src/vpool-xyk-amm/multipoolMarketMaker.js',
  reserve: './src/reserve/assetReserve.js',
};

/**
 * dL: 1M, lM: 105%, lP: 10%, iR: 100, lF: 500
 *
 * @param {import('../supports.js').AmountUtils} debt
 */
const defaultParamValues = debt =>
  harden({
    debtLimit: debt.make(1_000_000n),
    // margin required to maintain a loan
    liquidationMargin: debt.makeRatio(105n),
    // penalty upon liquidation as proportion of debt
    liquidationPenalty: debt.makeRatio(10n),
    // periodic interest rate (per charging period)
    interestRate: debt.makeRatio(100n, BASIS_POINTS),
    // charge to create or increase loan balance
    loanFee: debt.makeRatio(500n, BASIS_POINTS),
  });

/**
 * @typedef {{
 * aeth: IssuerKit & import('../supports.js').AmountUtils,
 * aethInitialLiquidity: Amount<'nat'>,
 * committee: any,
 * electorateTerms: any,
 * feeMintAccess: FeeMintAccess,
 * installation: Record<string, any>,
 * loanTiming: any,
 * minInitialDebt: bigint,
 * reserveCreatorFacet: ERef<AssetReserveCreatorFacet>,
 * rates: any,
 * run: IssuerKit & import('../supports.js').AmountUtils,
 * runInitialLiquidity: Amount<'nat'>,
 * timer: TimerService,
 * zoe: ZoeService,
 * }} DriverContext
 */

/**
 * @returns {Promise<DriverContext>}
 */
export const makeDriverContext = async () => {
  const { zoe, feeMintAccess } = setUpZoeForTest();
  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  // @ts-expect-error missing mint
  const run = withAmountUtils({ issuer: runIssuer, brand: runBrand });
  const aeth = withAmountUtils(makeIssuerKit('aEth'));
  const bundleCache = await unsafeMakeBundleCache('./bundles/'); // package-relative

  // note that the liquidation might be a different bundle name
  // objectMap(contractRoots, (root, k) => loader.load(root, k)),
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
  const installation = objectMap(bundles, bundle => E(zoe).install(bundle));
  const contextPs = {
    bundles,
    installation,
    zoe,
    feeMintAccess,
    loanTiming: {
      chargingPeriod: 2n,
      recordingPeriod: 6n,
    },
    minInitialDebt: 50n,
    rates: defaultParamValues(run),
    runInitialLiquidity: run.make(1_500_000_000n),
    aethInitialLiquidity: AmountMath.make(aeth.brand, 900_000_000n),
  };
  const frozenCtx = await deeplyFulfilled(harden(contextPs));
  return { ...frozenCtx, bundleCache, run, aeth };
};

/**
 * @param {import('ava').ExecutionContext<DriverContext>} t
 * @param {any} aethLiquidity
 * @param {any} runLiquidity
 */
const setupAmmAndElectorate = async (t, aethLiquidity, runLiquidity) => {
  const {
    zoe,
    aeth,
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
  const ammPublicFacet = await E(governorCreatorFacet).getPublicFacet();

  const liquidityIssuer = await E(ammPublicFacet).addIssuer(
    aeth.issuer,
    'Aeth',
  );
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
 * @param {import('ava').ExecutionContext<DriverContext>} t
 * @param {Amount<'nat'>} runInitialLiquidity
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
 * @param {import('ava').ExecutionContext<DriverContext>} t
 * @param {Amount} initialPrice
 * @param {Amount} priceBase
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
    run,
    aeth,
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
    payment: aeth.mint.mintPayment(aethInitialLiquidity),
  };
  const { amm: ammFacets, space } = await setupAmmAndElectorate(
    t,
    aethLiquidity,
    runLiquidity,
  );
  const { consume, produce } = space;
  trace(t, 'amm', { ammFacets });

  // Cheesy hack for easy use of manual price authority
  const priceAuthority = makeManualPriceAuthority({
    actualBrandIn: aeth.brand,
    actualBrandOut: run.brand,
    initialPrice: makeRatioFromAmounts(initialPrice, priceBase),
    timer,
    quoteIssuerKit: makeIssuerKit('quote', AssetKind.SET),
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
  /** @type {Promise<VaultFactoryCreatorFacet & LimitedCreatorFacet<any>>} */
  const vaultFactoryCreatorFacet = /** @type { any } */ (
    E(governorCreatorFacet).getCreatorFacet()
  );

  // Add a vault that will lend on aeth collateral
  const aethVaultManagerP = E(vaultFactoryCreatorFacet).addVaultType(
    aeth.issuer,
    'AEth',
    rates,
  );

  /** @type {[any, VaultFactoryCreatorFacet, VFC['publicFacet'], VaultManager]} */
  // @ts-expect-error cast
  const [governorInstance, vaultFactory, lender, aethVaultManager] =
    await Promise.all([
      E(consume.agoricNames).lookup('instance', 'VaultFactoryGovernor'),
      vaultFactoryCreatorFacet,
      E(governorCreatorFacet).getPublicFacet(),
      aethVaultManagerP,
    ]);
  trace(t, 'pa', { governorInstance, vaultFactory, lender, priceAuthority });

  return {
    zoe,
    // installs,
    governor: {
      governorInstance,
      governorPublicFacet: E(zoe).getPublicFacet(governorInstance),
      governorCreatorFacet,
    },
    vaultFactory: {
      vaultFactory,
      lender,
      aethVaultManager,
    },
    ammFacets,
    priceAuthority,
  };
};

/**
 * @param {import('ava').ExecutionContext<DriverContext>} t
 * @param {Amount<'nat'>} [initialPrice]
 * @param {Amount<'nat'>} [priceBase]
 */
export const makeManagerDriver = async (
  t,
  initialPrice = t.context.run.make(500n),
  priceBase = t.context.aeth.make(100n),
) => {
  const timer = buildManualTimer(t.log);
  const services = await setupServices(t, initialPrice, priceBase, timer);

  const { zoe, aeth, run } = t.context;
  const {
    vaultFactory: { lender, vaultFactory },
    priceAuthority,
  } = services;
  const managerNotifier = await makeNotifierFromSubscriber(
    E(E(lender).getCollateralManager(aeth.brand)).getSubscriber(),
  );
  let managerNotification = await E(managerNotifier).getUpdateSince();

  /** @type {UserSeat} */
  let currentSeat;
  let notification = {};
  let currentOfferResult;
  /**
   *
   * @param {Amount<'nat'>} [collateral]
   * @param {Amount<'nat'>} [debt]
   */
  const makeVaultDriver = async (
    collateral = aeth.make(1000n),
    debt = run.make(50n),
  ) => {
    /** @type {UserSeat<VaultKit>} */
    const vaultSeat = await E(zoe).offer(
      await E(lender).makeVaultInvitation(),
      harden({
        give: { Collateral: collateral },
        want: { Minted: debt },
      }),
      harden({
        Collateral: aeth.mint.mintPayment(collateral),
      }),
    );
    const { vault, publicSubscribers } = await E(vaultSeat).getOfferResult();
    t.true(await E(vaultSeat).hasExited());
    const notifier = makeNotifierFromSubscriber(publicSubscribers.vault);
    return {
      getVaultSubscriber: () => publicSubscribers.vault,
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
       * @param {AT_NEXT|number} [optSince] AT_NEXT is an alias for updateCount of the last update, forcing to wait for another
       */
      notified: async (phase, likeExpected, optSince) => {
        notification = await E(notifier).getUpdateSince(
          optSince === AT_NEXT ? notification.updateCount : optSince,
        );
        t.is(notification.value.vaultState, phase);
        if (likeExpected) {
          t.like(notification.value, likeExpected);
        }
        return notification;
      },
      checkBorrowed: async (loanAmount, loanFee) => {
        const debtAmount = await E(vault).getCurrentDebt();
        const fee = ceilMultiplyBy(loanAmount, loanFee);
        t.deepEqual(
          debtAmount,
          AmountMath.add(loanAmount, fee),
          'borrower Minted amount does not match',
        );
        return debtAmount;
      },
      checkBalance: async (expectedDebt, expectedAEth) => {
        t.deepEqual(await E(vault).getCurrentDebt(), expectedDebt);
        t.deepEqual(await E(vault).getCollateralAmount(), expectedAEth);
      },
    };
  };

  const driver = {
    getVaultDirectorPublic: () => lender,
    managerNotification: () => managerNotification,
    // XXX should return another ManagerDriver and maybe there should be a Director driver above them
    addVaultType: async keyword => {
      /** @type {IssuerKit<'nat'>} */
      const kit = makeIssuerKit(keyword.toLowerCase());
      const manager = await E(vaultFactory).addVaultType(
        kit.issuer,
        keyword,
        defaultParamValues(withAmountUtils(kit)),
      );
      return /** @type {const} */ ([manager, withAmountUtils(kit)]);
    },
    currentSeat: () => currentSeat,
    lastOfferResult: () => currentOfferResult,
    timer: () => timer,
    tick: async (ticks = 1) => {
      await timer.tickN(ticks, 'test driver');
    },
    makeVaultDriver,
    checkPayouts: async (expectedRUN, expectedAEth) => {
      const payouts = await E(currentSeat).getPayouts();
      const collProceeds = await aeth.issuer.getAmountOf(payouts.Collateral);
      const runProceeds = await E(run.issuer).getAmountOf(payouts.Minted);
      t.deepEqual(runProceeds, expectedRUN);
      t.deepEqual(collProceeds, expectedAEth);
    },
    checkRewards: async expectedMinted => {
      t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
        Minted: expectedMinted,
      });
    },
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
        harden({ In: aeth.mint.mintPayment(give) }),
        offerArgs,
      );
      currentOfferResult = await E(currentSeat).getOfferResult();
      if (expected) {
        const payouts = await E(currentSeat).getCurrentAllocationJig();
        trace(t, 'AMM payouts', payouts);
        t.like(payouts, expected);
      }
    },
    setPrice: p => priceAuthority.setPrice(makeRatioFromAmounts(p, priceBase)),
    setGovernedParam: async (name, newValue) => {
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
    /**
     *
     * @param {object} [likeExpected]
     * @param {AT_NEXT|number} [optSince] AT_NEXT is an alias for updateCount of the last update, forcing to wait for another
     */
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
      ).getLiquidityIssuer(aeth.brand);
      const liquidityBrand = await E(liquidityIssuer).getBrand();

      t.deepEqual(reserveAllocations, {
        RaEthLiquidity: AmountMath.make(liquidityBrand, liquidityValue),
        Fee: run.make(stableValue),
      });
    },
  };
  return driver;
};
