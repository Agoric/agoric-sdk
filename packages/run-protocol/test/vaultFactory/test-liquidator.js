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

import { makeBundle, setUpZoeForTest, setupBootstrap } from '../supports.js';

// #region Support

// TODO path resolve these so refactors detect
const contractRoots = {
  faucet: '../test/vaultFactory/faucet.js',
  liquidate: '../src/vaultFactory/liquidateIncrementally.js',
  VaultFactory: '../src/vaultFactory/vaultFactory.js',
  amm: '../src/vpool-xyk-amm/multipoolMarketMaker.js',
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

// makeBundle is a slow step, so we do it once for all the tests.
test.before(async t => {
  const { zoe, feeMintAccess } = setUpZoeForTest();
  const runIssuer = E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const aethKit = makeIssuerKit('aEth');
  const contextPs = {
    bundles: {
      faucet: makeBundle(contractRoots.faucet),
      liquidate: makeBundle(contractRoots.liquidate),
      VaultFactory: makeBundle(contractRoots.VaultFactory),
      amm: makeBundle(contractRoots.amm),
    },
    zoe,
    feeMintAccess,
    aethKit,
    runKit: { issuer: runIssuer, brand: runBrand },
    loanTiming: {
      chargingPeriod: 2n,
      recordingPeriod: 6n,
    },
    rates: defaultParamValues(runBrand),
    aethInitialLiquidity: AmountMath.make(aethKit.brand, 300_000_000n),
    runInitialLiquidity: AmountMath.make(runBrand, 500_000_000n),
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
    bundles: { amm },
    timer,
  } = t.context;

  const space = setupBootstrap(t, timer);
  const { produce, consume, instance } = space;
  produce.ammBundle.resolve(amm);
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
    bundles: { faucet: bundle },
    zoe,
    feeMintAccess,
  } = t.context;
  /** @type {Promise<Installation<import('./faucet.js').start>>} */
  // @ts-expect-error cast
  const installation = E(zoe).install(bundle);
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
    bundles: { VaultFactory, liquidate },
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
  const pa = makeManualPriceAuthority({
    actualBrandIn: aethBrand,
    actualBrandOut: runBrand,
    initialPrice: makeRatioFromAmounts(initialPrice, priceBase),
    timer,
    quoteMint,
  });
  produce.priceAuthority.resolve(pa);

  produce.vaultBundles.resolve({ VaultFactory, liquidate });
  await startVaultFactory(space, { loanParams: loanTiming });

  const agoricNames = consume.agoricNames;
  const installs = await Collect.allValues({
    vaultFactory: E(agoricNames).lookup('installation', 'VaultFactory'),
    liquidate: E(agoricNames).lookup('installation', 'liquidate'),
  });

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
  const [
    governorInstance,
    vaultFactory,
    lender,
    aethVaultManager,
    priceAuthority,
  ] = await Promise.all([
    E(agoricNames).lookup('instance', 'VaultFactoryGovernor'),
    vaultFactoryCreatorFacet,
    E(governorCreatorFacet).getPublicFacet(),
    aethVaultManagerP,
    pa,
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
    installs,
    governor: g,
    vaultFactory: v,
    ammFacets,
    runKit: { issuer: runIssuer, brand: runBrand },
    priceAuthority,
    setPrice: p => pa.setPrice(makeRatioFromAmounts(p, priceBase)),
  };
}
// #endregion

// sell in a single tranche
//   - no shortfall
//   - with shortfall
// sell in multiple tranches
// stall then oracle correct
// stall then trade the amm back to the price

// #region driver
const makeDriver = (t, services) => {
  const {
    zoe,
    aethKit: { mint: aethMint, issuer: aethIssuer },
    runKit: { issuer: runIssuer },
  } = t.context;
  const {
    vaultFactory: { lender },
  } = services;
  /** @type {UserSeat<VaultKit>} */
  let vaultSeat;
  /** @type {VaultKit} */
  let vault;
  /** @type {UserSeat<VaultKit>} */
  let lastSeat;
  let notifier;
  let notification = {};
  const driver = {
    vault: () => vault,
    vaultSeat: () => vaultSeat,
    notification: () => notification,
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
      const res = await E(lastSeat).getOfferResult();
      t.is(res, 'your loan is closed, thank you for your business');
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
    sellOnAMM: async (give, want) => {
      const swapInvitation = E(
        services.ammFacets.ammPublicFacet,
      ).makeSwapInvitation();
      const proposal = harden({ give: { In: give }, want: { Out: want } });
      await E(zoe).offer(
        await swapInvitation,
        proposal,
        harden({ In: aethMint.mintPayment(give) }),
      );
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

  const manualTimer = buildManualTimer(t.log);
  const services = await setupServices(
    t,
    AmountMath.make(runBrand, 1000n),
    AmountMath.make(aethBrand, 900n),
    manualTimer,
  );
  trace(t, 'setup');
  const {
    vaultFactory: { vaultFactory },
    setPrice,
  } = services;
  const d = makeDriver(t, services);

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
  await setPrice(AmountMath.make(runBrand, 677n));
  trace(t, 'price dropped a little');
  await manualTimer.tick();
  await d.checkNotify(Phase.ACTIVE);

  await setPrice(AmountMath.make(runBrand, 636n));
  trace(t, 'price dropped enough to liquidate');
  await manualTimer.tick();
  await d.checkNotify(Phase.LIQUIDATING);

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await d.checkVault(debtAmount, AmountMath.makeEmpty(aethBrand));
  const collateralExpected = AmountMath.make(aethBrand, 210n);
  const debtExpected = AmountMath.makeEmpty(runBrand);
  await d.awaitNotify(Phase.LIQUIDATED, { locked: collateralExpected });
  await d.checkVault(debtExpected, collateralExpected);

  t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
    RUN: AmountMath.make(runBrand, 14n),
  });

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
  t.context.aethInitialLiquidity = AmountMath.make(aethBrand, 900_000_000n);
  t.context.runInitialLiquidity = AmountMath.make(runBrand, 1_500_000_000n);

  // The borrower will deposit 4 Aeth, and ask to borrow 470 RUN. The
  // PriceAuthority's initial quote is 180. The max loan on 4 Aeth would be 600
  // (to make the margin 20%).
  // When the price falls to 123, the loan will get liquidated. At that point, 4
  // Aeth is worth 492, with a 5% margin, 493 is required.
  // The Autowap provides 534 RUN for the 4 Aeth collateral, so the borrower
  // gets 41 back

  const manualTimer = buildManualTimer(t.log);
  const services = await setupServices(
    t,
    AmountMath.make(runBrand, 2200n),
    AmountMath.make(aethBrand, 900n),
    manualTimer,
  );
  const {
    vaultFactory: { vaultFactory },
    setPrice,
  } = services;
  const d = makeDriver(t, services);

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
  await setPrice(AmountMath.make(runBrand, 19180n));
  await d.checkVault(debtAmount, collateralAmount);
  await manualTimer.tick();
  await d.checkNotify(Phase.ACTIVE);

  await setPrice(AmountMath.make(runBrand, 1650n));
  await manualTimer.tick();
  await d.checkVault(debtAmount, collateralAmount);
  await d.checkNotify(Phase.ACTIVE);

  // Drop price a lot
  await setPrice(AmountMath.make(runBrand, 150n));
  await manualTimer.tick();
  await manualTimer.tick();
  await d.checkNotify(Phase.LIQUIDATING);
  await d.checkVault(debtAmount, AmountMath.makeEmpty(aethBrand));
  // was AmountMath.make(runBrand, 103n)

  // Collateral consumed while liquidating
  // Debt remains while liquidating
  await d.checkVault(debtAmount, AmountMath.makeEmpty(aethBrand));
  const collateralExpected = AmountMath.make(aethBrand, 141n);
  const debtExpected = AmountMath.makeEmpty(runBrand);
  await d.awaitNotify(Phase.LIQUIDATED, { locked: collateralExpected });
  await d.checkVault(debtExpected, collateralExpected);

  t.deepEqual(await E(vaultFactory).getRewardAllocation(), {
    RUN: AmountMath.make(runBrand, 19n),
  });

  await d.close();
  await d.checkNotify(Phase.CLOSED, {
    locked: AmountMath.makeEmpty(aethBrand),
    updateCount: undefined,
  });
  await d.checkPayouts(debtExpected, collateralExpected);
  await d.checkVault(debtExpected, AmountMath.makeEmpty(aethBrand));
});
