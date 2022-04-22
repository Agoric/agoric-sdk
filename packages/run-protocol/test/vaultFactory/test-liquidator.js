// @ts-nocheck

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
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
} from '../../src/econ-behaviors.js';
import '../../src/vaultFactory/types.js';
import * as Collect from '../../src/collect.js';

import {
  setUpZoeForTest,
  setupBootstrap,
  installGovernance,
} from '../supports.js';
import { unsafeMakeBundleCache } from '../bundleTool.js';

// #region Support

// TODO path resolve these so refactors detect
const contractRoots = {
  faucet: './test/vaultFactory/faucet.js',
  liquidate: './src/vaultFactory/liquidateIncrementally.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  amm: './src/vpool-xyk-amm/multipoolMarketMaker.js',
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
function defaultParamValues(debtBrand) {
  return harden({
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
}

test.before(async t => {
  const { zoe, feeMintAccess } = setUpZoeForTest();
  const runIssuer = E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const aethKit = makeIssuerKit('aEth');
  const loader = await unsafeMakeBundleCache('./bundles/'); // package-relative

  // note that the liquidation might be a different bundle name
  // Collect.mapValues(contractRoots, (root, k) => loader.load(root, k)),
  const bundles = await Collect.allValues({
    faucet: loader.load(contractRoots.faucet, 'faucet'),
    liquidate: loader.load(contractRoots.liquidate, 'liquidateIncrementally'),
    VaultFactory: loader.load(contractRoots.VaultFactory, 'VaultFactory'),
    amm: loader.load(contractRoots.amm, 'amm'),
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
    rates: defaultParamValues(runBrand),
    aethInitialLiquidity: AmountMath.make(aethKit.brand, 900_000_000n),
    runInitialLiquidity: AmountMath.make(runBrand, 1_500_000_000n),
  };
  const frozenCtx = await deeplyFulfilled(harden(contextPs));
  t.context = { ...frozenCtx };
  trace(t, 'CONTEXT');
});

const setupAmmAndElectorate = async (t, aethLiquidity, runLiquidity) => {
  const {
    zoe,
    aethKit: { issuer: aethIssuer },
    electorateTerms,
    timer,
  } = t.context;

  const space = setupBootstrap(t, timer);
  const { consume, instance } = space;
  installGovernance(zoe, space.installation.produce);
  space.installation.produce.amm.resolve(t.context.installation.amm);
  startEconomicCommittee(space, electorateTerms);
  setupAmm(space);

  const governorCreatorFacet = consume.ammGovernorCreatorFacet;
  const governorInstance = await instance.consume.ammGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  /** @type { GovernedPublicFacet<XYKAMMPublicFacet> } */
  // @ts-expect-error cast from unknown
  const ammPublicFacet = await E(governorCreatorFacet).getPublicFacet();

  const liquidityIssuer = E(ammPublicFacet).addPool(aethIssuer, 'Aeth');
  const liquidityBrand = await E(liquidityIssuer).getBrand();

  const liqProposal = harden({
    give: {
      Secondary: aethLiquidity.proposal,
      Central: runLiquidity.proposal,
    },
    want: { Liquidity: AmountMath.makeEmpty(liquidityBrand) },
  });
  const liqInvitation = await E(ammPublicFacet).makeAddLiquidityInvitation();

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
 * @param {ExecutionContext} t
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
 * @param {ExecutionContext} t
 * @param {Amount} initialPrice
 * @param {Amount} priceBase
 * @param {TimerService} timer
 */
async function setupServices(
  t,
  initialPrice,
  priceBase,
  timer = buildManualTimer(t.log),
) {
  const {
    zoe,
    runKit: { issuer: runIssuer, brand: runBrand },
    aethKit: { brand: aethBrand, issuer: aethIssuer, mint: aethMint },
    loanTiming,
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
  iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
  iProduce.liquidate.resolve(t.context.installation.liquidate);
  await startVaultFactory(space, { loanParams: loanTiming });

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
}
// #endregion

// #region driver
const makeDriver = async (t, initialPrice, priceBase) => {
  const services = await setupServices(t, initialPrice, priceBase);
  const {
    zoe,
    aethKit: { mint: aethMint, issuer: aethIssuer },
    runKit: { issuer: runIssuer },
  } = t.context;
  const {
    vaultFactory: { lender, vaultFactory },
    priceAuthority,
  } = services;
  /** @type {UserSeat<VaultKit>} */
  let vaultSeat;
  /** @type {VaultKit} */
  let vault;
  /** @type {UserSeat<VaultKit>} */
  let lastSeat;
  let notifier;
  let notification = {};
  let lastOfferResult;
  const driver = {
    vault: () => vault,
    vaultSeat: () => vaultSeat,
    notification: () => notification,
    lastSeat: () => lastSeat,
    lastOfferResult: () => lastOfferResult,
    timer: () => t.context.timer,
    tick: (ticks = 1) => {
      for (let i = 0; i < ticks; i += 1) {
        t.context.timer.tick();
      }
    },

    makeVault: async (collateral, debt) => {
      vaultSeat = await E(zoe).offer(
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
        vault: v,
        publicNotifiers: { vault: vaultNotifier },
      } = await E(vaultSeat).getOfferResult();
      t.truthy(await E(vaultSeat).hasExited());
      vault = v;
      notifier = vaultNotifier;
      return vault;
    },
    close: async () => {
      lastSeat = await E(zoe).offer(E(vault).makeCloseInvitation());
      lastOfferResult = await E(lastSeat).getOfferResult();
      t.is(lastOfferResult, 'your loan is closed, thank you for your business');
      t.truthy(await E(vaultSeat).hasExited());
    },
    checkNotify: async (phase, expected) => {
      notification = await E(notifier).getUpdateSince();
      trace(t, 'notify', notification);
      t.is(notification.value.vaultState, phase);
      expected && t.like(notification.value, expected);
    },
    awaitNotify: async (phase, expected) => {
      notification = await E(notifier).getUpdateSince(notification.updateCount);
      trace(t, 'notify', notification);
      t.is(notification.value.vaultState, phase);
      expected && t.like(notification.value, expected);
    },
    checkPayouts: async (expectedRUN, expectedAEth) => {
      const payouts = await E(lastSeat).getPayouts();
      const collProceeds = await aethIssuer.getAmountOf(payouts.Collateral);
      const runProceeds = await E(runIssuer).getAmountOf(payouts.RUN);
      t.deepEqual(runProceeds, expectedRUN);
      t.deepEqual(collProceeds, expectedAEth);
    },
    checkVault: async (expectedDebt, expectedAEth) => {
      t.deepEqual(await E(vault).getCurrentDebt(), expectedDebt);
      t.deepEqual(await E(vault).getCollateralAmount(), expectedAEth);
    },
    checkRewards: async expectedRUN => {
      t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
        RUN: expectedRUN,
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
      lastSeat = await E(zoe).offer(
        await swapInvitation,
        harden({ give: { In: give }, want: { Out: want } }),
        harden({ In: aethMint.mintPayment(give) }),
        offerArgs,
      );
      lastOfferResult = await E(lastSeat).getOfferResult();
      if (expected) {
        const payouts = await E(lastSeat).getCurrentAllocation();
        trace(t, 'AMM payouts', payouts);
        t.like(payouts, expected);
      }
    },
    setPrice: p => priceAuthority.setPrice(makeRatioFromAmounts(p, priceBase)),
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
  /* * @type {UserSeat<VaultKit>} */
  const vault = await d.makeVault(collateralAmount, loanAmount);
  trace(t, 'loan made', loanAmount, vault);
  const debtAmount = await E(vault).getCurrentDebt();
  const fee = ceilMultiplyBy(loanAmount, rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'borrower RUN amount does not match',
  );

  await d.checkNotify(Phase.ACTIVE, {
    debtSnapshot: {
      debt: AmountMath.add(loanAmount, fee),
      interest: makeRatio(100n, runBrand),
    },
  });
  await d.checkVault(debtAmount, collateralAmount);

  // small change doesn't cause liquidation
  await d.setPrice(AmountMath.make(runBrand, 677n));
  trace(t, 'price dropped a little');
  await d.tick();
  await d.checkNotify(Phase.ACTIVE);

  await d.setPrice(AmountMath.make(runBrand, 636n));
  trace(t, 'price dropped enough to liquidate');
  await d.awaitNotify(Phase.LIQUIDATING);

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await d.checkVault(debtAmount, AmountMath.makeEmpty(aethBrand));
  const collateralExpected = AmountMath.make(aethBrand, 210n);
  const debtExpected = AmountMath.makeEmpty(runBrand);
  await d.awaitNotify(Phase.LIQUIDATED, { locked: collateralExpected });
  await d.checkVault(debtExpected, collateralExpected);

  await d.checkRewards(AmountMath.make(runBrand, 14n));

  await d.close();
  await d.checkNotify(Phase.CLOSED, {
    locked: AmountMath.makeEmpty(aethBrand),
    updateCount: undefined,
  });
  await d.checkPayouts(debtExpected, collateralExpected);
  await d.checkVault(debtExpected, AmountMath.makeEmpty(aethBrand));
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
  /** @type {UserSeat<VaultKit>} */
  const vault = await d.makeVault(collateralAmount, loanAmount);
  trace(t, 'loan made', loanAmount, vault);
  const debtAmount = await E(vault).getCurrentDebt();
  const fee = ceilMultiplyBy(loanAmount, rates.loanFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(loanAmount, fee),
    'borrower RUN amount does not match',
  );

  await d.checkNotify(Phase.ACTIVE, {
    debtSnapshot: {
      debt: AmountMath.add(loanAmount, fee),
      interest: makeRatio(100n, runBrand),
    },
  });
  await d.checkVault(debtAmount, collateralAmount);

  // Sell some aEth to drive the value down
  await d.sellOnAMM(
    AmountMath.make(aethBrand, 200n),
    AmountMath.makeEmpty(runBrand),
  );

  // [2200n, 19180n, 1650n, 150n],
  await d.setPrice(AmountMath.make(runBrand, 19180n));
  await d.checkVault(debtAmount, collateralAmount);
  await d.tick();
  await d.checkNotify(Phase.ACTIVE);

  await d.setPrice(AmountMath.make(runBrand, 1650n));
  await d.tick();
  await d.checkVault(debtAmount, collateralAmount);
  await d.checkNotify(Phase.ACTIVE);

  // Drop price a lot
  await d.setPrice(AmountMath.make(runBrand, 150n));
  await d.awaitNotify(Phase.LIQUIDATING);
  await d.checkVault(debtAmount, AmountMath.makeEmpty(aethBrand));
  // was AmountMath.make(runBrand, 103n)

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await d.checkVault(debtAmount, AmountMath.makeEmpty(aethBrand));
  const collateralExpected = AmountMath.make(aethBrand, 141n);
  const debtExpected = AmountMath.makeEmpty(runBrand);
  await d.awaitNotify(Phase.LIQUIDATED, { locked: collateralExpected });
  await d.checkVault(debtExpected, collateralExpected);

  await d.checkRewards(AmountMath.make(runBrand, 19n));

  await d.close();
  await d.checkNotify(Phase.CLOSED, {
    locked: AmountMath.makeEmpty(aethBrand),
    updateCount: undefined,
  });
  await d.checkPayouts(debtExpected, collateralExpected);
  await d.checkVault(debtExpected, AmountMath.makeEmpty(aethBrand));
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
