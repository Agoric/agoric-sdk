import '@agoric/zoe/exported.js';

import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeTracer, objectMap } from '@agoric/internal';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import {
  ceilMultiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import { deeplyFulfilled } from '@endo/marshal';

import * as Collect from '../../src/collect.js';
import {
  setupAmm,
  setupReserve,
  startVaultFactory,
} from '../../src/proposals/econ-behaviors.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import '../../src/vaultFactory/types.js';
import {
  installPuppetGovernance,
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
 * dL: 1M, lM: 105%, lP: 10%, iR: 100, lF: 500, lP: 0%
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
    // NB: liquidationPadding defaults to zero in contract
  });

/**
 * @typedef {{
 * aeth: IssuerKit & import('../supports.js').AmountUtils,
 * aethInitialLiquidity: Amount<'nat'>,
 * puppetGovernors: { [contractName: string]: ERef<import('@agoric/governance/tools/puppetContractGovernor').PuppetContractGovernorKit<any>['creatorFacet']> },
 * electorateTerms: any,
 * feeMintAccess: FeeMintAccess,
 * installation: Record<string, any>,
 * loanTiming: any,
 * minInitialDebt: bigint,
 * reserveCreatorFacet: ERef<AssetReserveCreatorFacet>,
 * rates: any,
 * run: IssuerKit & import('../supports.js').AmountUtils,
 * runInitialLiquidity: Amount<'nat'>,
 * timer: import('@agoric/time/src/types').TimerService,
 * zoe: ZoeService,
 * }} DriverContext
 */

/**
 * @returns {Promise<DriverContext>}
 */
export const makeDriverContext = async () => {
  const { zoe, feeMintAccessP } = await setUpZoeForTest();
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

  const feeMintAccess = await feeMintAccessP;
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
  installPuppetGovernance(zoe, space.installation.produce);
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

  const governorCreatorFacet = E.get(consume.ammKit).governorCreatorFacet;
  const governorInstance = await instance.consume.ammGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const governedInstance = E(governorPublicFacet).getGovernedContract();

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

  t.context.puppetGovernors = {
    // @ts-expect-error cast regular governor to puppet
    vaultFactory: E.get(space.consume.vaultFactoryKit).governorCreatorFacet,
  };

  // TODO get the creator directly
  const newAmm = {
    ammCreatorFacet: await E.get(consume.ammKit).creatorFacet,
    ammPublicFacet,
    instance: governedInstance,
    ammLiquidity: E(ammLiquiditySeat).getPayout('Liquidity'),
  };

  return { amm: newAmm, space };
};

/**
 *
 * @param {import('ava').ExecutionContext<DriverContext>} t
 * @param {Amount<'nat'>} amt
 */
const getRunFromFaucet = async (t, amt) => {
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
      want: { RUN: amt },
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
 * @param {import('@agoric/time/src/types').TimerService} timer
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
  const { amm: ammKit, space } = await setupAmmAndElectorate(
    t,
    aethLiquidity,
    runLiquidity,
  );
  const { consume, produce } = space;
  trace(t, 'amm', { ammKit });

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
  t.context.reserveCreatorFacet = E.get(space.consume.reserveKit).creatorFacet;
  iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
  iProduce.liquidate.resolve(t.context.installation.liquidate);
  await startVaultFactory(space, { loanParams: loanTiming }, minInitialDebt);

  const governorCreatorFacet = E.get(
    consume.vaultFactoryKit,
  ).governorCreatorFacet;
  const vaultFactoryCreatorFacet = E(governorCreatorFacet).getCreatorFacet();

  // Add a vault that will lend on aeth collateral
  const aethVaultManagerP = E(vaultFactoryCreatorFacet).addVaultType(
    aeth.issuer,
    'AEth',
    rates,
  );

  /** @type {[any, VaultFactoryCreatorFacet, VFC['publicFacet'], VaultManager]} */
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
    ammKit,
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
    const notifier = makeNotifierFromSubscriber(
      publicSubscribers.vault.subscriber,
    );
    return {
      getVaultSubscriber: () => publicSubscribers.vault,
      vault: () => vault,
      vaultSeat: () => vaultSeat,
      notification: () => notification,
      /**
       *
       * @param {bigint} collValue
       * @param {import('../supports.js').AmountUtils} collUtils
       * @param {bigint} [mintedValue]
       */
      giveCollateral: async (collValue, collUtils, mintedValue = 0n) => {
        trace(t, 'giveCollateral', collValue);
        const invitation = await E(vault).makeAdjustBalancesInvitation();
        const amount = collUtils.make(collValue);
        const seat = await E(services.zoe).offer(
          invitation,
          harden({
            give: { Collateral: amount },
            want: mintedValue ? { Minted: run.make(mintedValue) } : undefined,
          }),
          harden({
            Collateral: collUtils.mint.mintPayment(amount),
          }),
        );
        return E(seat).getOfferResult();
      },
      /**
       *
       * @param {bigint} mintedValue
       * @param {import('../supports.js').AmountUtils} collUtils
       * @param {bigint} [collValue]
       */
      giveMinted: async (mintedValue, collUtils, collValue = 0n) => {
        trace(t, 'giveCollateral', mintedValue);
        const invitation = await E(vault).makeAdjustBalancesInvitation();
        const mintedAmount = run.make(mintedValue);
        const seat = await E(services.zoe).offer(
          invitation,
          harden({
            give: { Minted: mintedAmount },
            want: collValue
              ? { Collateral: collUtils.make(collValue) }
              : undefined,
          }),
          harden({
            Minted: getRunFromFaucet(t, mintedAmount),
          }),
        );
        return E(seat).getOfferResult();
      },
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
        services.ammKit.ammPublicFacet,
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
        const payouts = await E(currentSeat).getFinalAllocation();
        trace(t, 'AMM payouts', payouts);
        t.like(payouts, expected);
      }
    },
    /** @param {Amount<'nat'>} p */
    setPrice: p => priceAuthority.setPrice(makeRatioFromAmounts(p, priceBase)),
    /**
     *
     * @param {string} name
     * @param {*} newValue
     * @param {VaultFactoryParamPath} [paramPath] defaults to root path for the factory
     */
    setGovernedParam: (
      name,
      newValue,
      paramPath = { key: 'governedParams' },
    ) => {
      trace(t, 'setGovernedParam', name);
      const vfGov = t.context.puppetGovernors.vaultFactory;
      return E(vfGov).changeParams(
        harden({
          paramPath,
          changes: { [name]: newValue },
        }),
      );
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
        services.ammKit.ammPublicFacet,
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
