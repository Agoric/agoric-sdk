// @ts-nocheck

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/eventual-send';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { deeplyFulfilled } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import {
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import { AmountMath } from '@agoric/ertp';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  defaultParamValues,
  legacyOfferResult,
} from '../vaultFactory/vaultFactoryUtils.js';
import {
  SECONDS_PER_HOUR as ONE_HOUR,
  SECONDS_PER_DAY as ONE_DAY,
  SECONDS_PER_WEEK as ONE_WEEK,
} from '../../src/proposals/econ-behaviors.js';
import { reserveInitialState } from '../metrics.js';
import {
  bid,
  setClockAndAdvanceNTimes,
  setupBasics,
  setupServices,
  startAuctionClock,
  openVault,
  getMetricTrackers,
  adjustVault,
  closeVault,
  getDataFromVstorage,
} from './tools.js';
import {
  assertBidderPayout,
  assertCollateralProceeds,
  assertMintedAmount,
  assertReserveState,
  assertVaultCollateral,
  assertVaultCurrentDebt,
  assertVaultDebtSnapshot,
  assertVaultFactoryRewardAllocation,
  assertVaultLocked,
  assertVaultSeatExited,
  assertVaultState,
  assertMintedProceeds,
  assertLiqNodeForAuctionCreated,
  assertStorageData,
  assertVaultNotification,
} from './assertions.js';
import { Phase } from '../vaultFactory/driver.js';
import { setBlockMakeChildNode } from './mock-setupChainStorage.js';

const trace = makeTracer('TestLiquidationVisibility', false);

// IST is set as RUN to be able to use ../supports.js methods
test.before(async t => {
  const { zoe, feeMintAccessP } = await setUpZoeForTest();
  const feeMintAccess = await feeMintAccessP;

  const contractsWrapper = {
    auctioneer: './test/liquidationVisibility/auctioneer-contract-wrapper.js',
  };

  const { run, aeth, abtc, bundleCache, bundles, installation } =
    await setupBasics(zoe, contractsWrapper);

  const contextPs = {
    zoe,
    feeMintAccess,
    bundles,
    installation,
    electorateTerms: undefined,
    interestTiming: {
      chargingPeriod: 2n,
      recordingPeriod: 10n,
    },
    minInitialDebt: 50n,
    referencedUi: undefined,
    rates: defaultParamValues(run.brand),
  };
  const frozenCtx = await deeplyFulfilled(harden(contextPs));

  t.context = {
    ...frozenCtx,
    bundleCache,
    aeth,
    abtc,
    run,
  };

  trace(t, 'CONTEXT');
});

/* Test liquidation flow 1:
 * Auction raises enough IST to cover debt */
test('liq-flow-1', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { vaultFactory, aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
    chainStorage,
  } = services;

  const { reserveTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  let expectedReserveState = reserveInitialState(run.makeEmpty());
  await assertReserveState(reserveTracker, 'initial', expectedReserveState);

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount,
    colKeyword: 'aeth',
    wantMintedAmount: wantMinted,
  });

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desired = aeth.make(400n);
  const bidderSeat = await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const {
    vault,
    publicNotifiers: { vault: vaultNotifier },
  } = await legacyOfferResult(vaultSeat);

  await assertVaultCurrentDebt(t, vault, wantMinted);
  await assertVaultState(t, vaultNotifier, 'active');
  await assertVaultDebtSnapshot(t, vaultNotifier, wantMinted);
  await assertMintedAmount(t, vaultSeat, wantMinted);
  await assertVaultCollateral(t, vault, 400n, aeth);

  // Check that no child node with auction start time's name created before the liquidation
  const vstorageBeforeLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.is(vstorageBeforeLiquidation.length, 0);

  // drop collateral price from 5:1 to 4:1 and liquidate vault
  aethTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, aeth.brand));

  await assertVaultState(t, vaultNotifier, 'active');

  const { startTime, time, endTime } = await startAuctionClock(
    auctioneerKit,
    manualTimer,
  );
  let currentTime = time;

  // Check that {timestamp}.vaults.preAuction values are correct before auction is completed
  const vstorageDuringLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.not(vstorageDuringLiquidation.length, 0);
  const debtDuringLiquidation = await E(vault).getCurrentDebt();
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.preAuction`,
    expected: [
      [
        'vault0',
        {
          collateralAmount,
          debtAmount: debtDuringLiquidation,
        },
      ],
    ],
  });

  await assertVaultState(t, vaultNotifier, 'liquidating');
  await assertVaultCollateral(t, vault, 0n, aeth);
  await assertVaultCurrentDebt(t, vault, wantMinted);

  currentTime = await setClockAndAdvanceNTimes(manualTimer, 2, startTime, 2n);
  trace(`advanced time to `, currentTime);

  await assertVaultState(t, vaultNotifier, 'liquidated');
  await assertVaultSeatExited(t, vaultSeat);
  await assertVaultLocked(t, vaultNotifier, 0n, aeth);
  await assertVaultCurrentDebt(t, vault, 0n);
  await assertVaultFactoryRewardAllocation(t, vaultFactory, 80n);

  const closeSeat = await closeVault({ t, vault });
  await E(closeSeat).getOfferResult();

  await assertCollateralProceeds(t, closeSeat, aeth.makeEmpty(), aeth.issuer);
  await assertVaultCollateral(t, vault, 0n, aeth);
  await assertBidderPayout(t, bidderSeat, run, 320n, aeth, 400n);

  expectedReserveState = {
    allocations: {
      Aeth: undefined,
      Fee: undefined,
    },
  };
  await assertReserveState(reserveTracker, 'like', expectedReserveState);

  // Check that {timestamp}.vaults.postAuction values are correct after auction is completed
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.postAuction`,
    expected: [],
  });

  // Check that {timestamp}.auctionResult values are correct after auction is completed
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.auctionResult`,
    expected: {
      collateralOffered: collateralAmount,
      istTarget: run.make(1680n),
      collateralForReserve: aeth.makeEmpty(),
      shortfallToReserve: run.makeEmpty(),
      mintedProceeds: run.make(1680n),
      collateralSold: aeth.make(400n),
      collateralRemaining: aeth.makeEmpty(),
      endTime,
    },
  });

  // Create snapshot of the storage node
  await documentStorageSchema(t, chainStorage, {
    note: 'Scenario 1 Liquidation Visibility Snapshot',
    node: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}`,
  });
});

// assert that vaultId being recorded under liquidations correspond to the correct vaultId under vaults
// test flow with more than one vaultManager
test('liq-flow-1.1', async t => {
  const { zoe, run, aeth, abtc } = t.context;
  const manualTimer = buildManualTimer();

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
    true,
  );

  const {
    vaultFactory: {
      vaultFactory,
      aethCollateralManager,
      abtcCollateralManager,
    },
    aethTestPriceAuthority,
    abtcTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
    chainStorage,
  } = services;

  const { reserveTracker: reserveTrackerAeth } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  let expectedReserveStateAeth = reserveInitialState(run.makeEmpty());
  await assertReserveState(
    reserveTrackerAeth,
    'initial',
    expectedReserveStateAeth,
  );

  const { reserveTracker: reserveTrackerAbtc } = await getMetricTrackers({
    t,
    collateralManager: abtcCollateralManager,
    reservePublicFacet,
  });

  let expectedReserveStateAbtc = reserveInitialState(run.makeEmpty());
  await assertReserveState(
    reserveTrackerAbtc,
    'initial',
    expectedReserveStateAbtc,
  );

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');
  await E(reserveCreatorFacet).addIssuer(abtc.issuer, 'Abtc');

  const collateralAmountAeth = aeth.make(400n);
  const collateralAmountAbtc = abtc.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeatAeth = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount: collateralAmountAeth,
    colKeyword: 'aeth',
    wantMintedAmount: wantMinted,
  });
  const vaultSeatAbtc = await openVault({
    t,
    cm: abtcCollateralManager,
    collateralAmount: collateralAmountAbtc,
    colKeyword: 'abtc',
    wantMintedAmount: wantMinted,
  });

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desiredAeth = aeth.make(400n);
  const desiredAbtc = abtc.make(400n);
  const bidderSeatAeth = await bid(
    t,
    zoe,
    auctioneerKit,
    aeth,
    bidAmount,
    desiredAeth,
  );
  const bidderSeatAbtc = await bid(
    t,
    zoe,
    auctioneerKit,
    abtc,
    bidAmount,
    desiredAbtc,
  );

  const {
    vault: vaultAeth,
    publicNotifiers: { vault: vaultNotifierAeth },
  } = await legacyOfferResult(vaultSeatAeth);
  const {
    vault: vaultAbtc,
    publicNotifiers: { vault: vaultNotifierAbtc },
  } = await legacyOfferResult(vaultSeatAbtc);

  // aeth assertions
  await assertVaultCurrentDebt(t, vaultAeth, wantMinted);
  await assertVaultState(t, vaultNotifierAeth, 'active');
  await assertVaultDebtSnapshot(t, vaultNotifierAeth, wantMinted);
  await assertMintedAmount(t, vaultSeatAeth, wantMinted);
  await assertVaultCollateral(t, vaultAeth, 400n, aeth);

  // abtc assertions
  await assertVaultCurrentDebt(t, vaultAbtc, wantMinted);
  await assertVaultState(t, vaultNotifierAbtc, 'active');
  await assertVaultDebtSnapshot(t, vaultNotifierAbtc, wantMinted);
  await assertMintedAmount(t, vaultSeatAbtc, wantMinted);
  await assertVaultCollateral(t, vaultAbtc, 400n, abtc);

  // Check that no child node with auction start time's name created before the liquidation
  const vstorageBeforeLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.is(vstorageBeforeLiquidation.length, 0);

  // drop collateral price from 5:1 to 4:1 and liquidate vault
  aethTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, aeth.brand));
  abtcTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, abtc.brand));

  await assertVaultState(t, vaultNotifierAeth, 'active');
  await assertVaultState(t, vaultNotifierAbtc, 'active');

  const { startTime, time, endTime } = await startAuctionClock(
    auctioneerKit,
    manualTimer,
  );
  let currentTime = time;

  // Check that {timestamp}.vaults.preAuction values are correct before auction is completed
  // aeth
  const vstorageDuringLiquidationAeth = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.not(vstorageDuringLiquidationAeth.length, 0);
  const debtDuringLiquidationAeth = await E(vaultAeth).getCurrentDebt();
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.preAuction`,
    expected: [
      [
        'vault0',
        {
          collateralAmount: collateralAmountAeth,
          debtAmount: debtDuringLiquidationAeth,
        },
      ],
    ],
  });

  // abtc
  const vstorageDuringLiquidationAbtc = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager1.liquidations`,
  );
  t.not(vstorageDuringLiquidationAbtc.length, 0);
  const debtDuringLiquidationAbtc = await E(vaultAbtc).getCurrentDebt();
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager1.liquidations.${time.absValue.toString()}.vaults.preAuction`,
    expected: [
      [
        'vault0',
        {
          collateralAmount: collateralAmountAbtc,
          debtAmount: debtDuringLiquidationAbtc,
        },
      ],
    ],
  });

  // aeth
  await assertVaultState(t, vaultNotifierAeth, 'liquidating');
  await assertVaultCollateral(t, vaultAeth, 0n, aeth);
  await assertVaultCurrentDebt(t, vaultAeth, wantMinted);

  // abtc
  await assertVaultState(t, vaultNotifierAbtc, 'liquidating');
  await assertVaultCollateral(t, vaultAbtc, 0n, abtc);
  await assertVaultCurrentDebt(t, vaultAbtc, wantMinted);

  currentTime = await setClockAndAdvanceNTimes(manualTimer, 2, startTime, 2n);
  trace(`advanced time to `, currentTime);

  // aeth
  await assertVaultState(t, vaultNotifierAeth, 'liquidated');
  await assertVaultSeatExited(t, vaultSeatAeth);
  await assertVaultLocked(t, vaultNotifierAeth, 0n, aeth);
  await assertVaultCurrentDebt(t, vaultAeth, 0n);
  await assertVaultFactoryRewardAllocation(t, vaultFactory, 160n);

  // abtc
  await assertVaultState(t, vaultNotifierAbtc, 'liquidated');
  await assertVaultSeatExited(t, vaultSeatAbtc);
  await assertVaultLocked(t, vaultNotifierAbtc, 0n, abtc);
  await assertVaultCurrentDebt(t, vaultAbtc, 0n);

  const closeSeatAeth = await closeVault({ t, vault: vaultAeth });
  await E(closeSeatAeth).getOfferResult();

  const closeSeatAbtc = await closeVault({ t, vault: vaultAbtc });
  await E(closeSeatAbtc).getOfferResult();

  // aeth
  await assertCollateralProceeds(
    t,
    closeSeatAeth,
    aeth.makeEmpty(),
    aeth.issuer,
  );
  await assertVaultCollateral(t, vaultAeth, 0n, aeth);
  await assertBidderPayout(t, bidderSeatAeth, run, 320n, aeth, 400n);

  // abtc
  await assertCollateralProceeds(
    t,
    closeSeatAbtc,
    abtc.makeEmpty(),
    abtc.issuer,
  );
  await assertVaultCollateral(t, vaultAbtc, 0n, abtc);
  await assertBidderPayout(t, bidderSeatAbtc, run, 320n, abtc, 400n);

  expectedReserveStateAeth = {
    allocations: {
      Aeth: undefined,
      Fee: undefined,
    },
  };
  await assertReserveState(
    reserveTrackerAeth,
    'like',
    expectedReserveStateAeth,
  );

  expectedReserveStateAbtc = {
    allocations: {
      Abtc: undefined,
      Fee: undefined,
    },
  };
  await assertReserveState(
    reserveTrackerAbtc,
    'like',
    expectedReserveStateAbtc,
  );

  // Check that {timestamp}.vaults.postAuction values are correct after auction is completed
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.preAuction`,
    expected: [
      [
        'vault0',
        {
          collateralAmount: collateralAmountAeth,
          debtAmount: debtDuringLiquidationAeth,
        },
      ],
    ],
  });

  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager1.liquidations.${time.absValue.toString()}.vaults.preAuction`,
    expected: [
      [
        'vault0',
        {
          collateralAmount: collateralAmountAbtc,
          debtAmount: debtDuringLiquidationAbtc,
        },
      ],
    ],
  });

  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.postAuction`,
    expected: [],
  });

  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager1.liquidations.${time.absValue.toString()}.vaults.postAuction`,
    expected: [],
  });

  // Check that {timestamp}.auctionResult values are correct after auction is completed
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.auctionResult`,
    expected: {
      collateralOffered: collateralAmountAeth,
      istTarget: run.make(1680n),
      collateralForReserve: aeth.makeEmpty(),
      shortfallToReserve: run.makeEmpty(),
      mintedProceeds: run.make(1680n),
      collateralSold: aeth.make(400n),
      collateralRemaining: aeth.makeEmpty(),
      endTime,
    },
  });

  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager1.liquidations.${time.absValue.toString()}.auctionResult`,
    expected: {
      collateralOffered: collateralAmountAbtc,
      istTarget: run.make(1680n),
      collateralForReserve: abtc.makeEmpty(),
      shortfallToReserve: run.makeEmpty(),
      mintedProceeds: run.make(1680n),
      collateralSold: abtc.make(400n),
      collateralRemaining: abtc.makeEmpty(),
      endTime,
    },
  });

  // Create snapshot of the storage node
  await documentStorageSchema(t, chainStorage, {
    note: 'Scenario 1.1 Liquidation Visibility Snapshot [Aeth]',
    node: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}`,
  });
  await documentStorageSchema(t, chainStorage, {
    note: 'Scenario 1.1 Liquidation Visibility Snapshot [Abtc]',
    node: `vaultFactory.managers.manager1.liquidations.${time.absValue.toString()}`,
  });
});

/* Test liquidation flow 2a:
 * Auction does not raise enough to cover IST debt;
 * All collateral sold and debt is not covered. */
test('liq-flow-2a', async t => {
  const { zoe, aeth, run, rates: defaultRates } = t.context;

  // Add a vaultManager with 10000 aeth collateral at a 200 aeth/Minted rate
  const rates = harden({
    ...defaultRates,
    // charge 40% interest / year
    interestRate: run.makeRatio(40n),
    liquidationMargin: run.makeRatio(130n),
  });
  t.context.rates = rates;

  // Interest is charged daily, and auctions are every week
  t.context.interestTiming = {
    chargingPeriod: ONE_DAY,
    recordingPeriod: ONE_DAY,
  };

  const manualTimer = buildManualTimer();
  const services = await setupServices(
    t,
    makeRatio(100n, run.brand, 10n, aeth.brand),
    aeth.make(1n),
    manualTimer,
    ONE_WEEK,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
    chainStorage,
  } = services;
  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const { reserveTracker, collateralManagerTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  await assertReserveState(
    reserveTracker,
    'initial',
    reserveInitialState(run.makeEmpty()),
  );
  let shortfallBalance = 0n;

  await collateralManagerTracker.assertInitial({
    // present
    numActiveVaults: 0,
    numLiquidatingVaults: 0,
    totalCollateral: aeth.make(0n),
    totalDebt: run.make(0n),
    retainedCollateral: aeth.make(0n),

    // running
    numLiquidationsCompleted: 0,
    numLiquidationsAborted: 0,
    totalOverageReceived: run.make(0n),
    totalProceedsReceived: run.make(0n),
    totalCollateralSold: aeth.make(0n),
    liquidatingCollateral: aeth.make(0n),
    liquidatingDebt: run.make(0n),
    totalShortfallReceived: run.make(0n),
    lockedQuote: null,
  });

  // Create a loan for Alice for 5000 Minted with 1000 aeth collateral
  // ratio is 4:1
  const aliceCollateralAmount = aeth.make(1000n);
  const aliceWantMinted = run.make(5000n);
  /** @type {UserSeat<VaultKit>} */
  const aliceVaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount: aliceCollateralAmount,
    wantMintedAmount: aliceWantMinted,
    colKeyword: 'aeth',
  });
  const {
    vault: aliceVault,
    publicNotifiers: { vault: aliceNotifier },
  } = await legacyOfferResult(aliceVaultSeat);

  await assertVaultCurrentDebt(t, aliceVault, aliceWantMinted);
  await assertMintedProceeds(t, aliceVaultSeat, aliceWantMinted);
  await assertVaultDebtSnapshot(t, aliceNotifier, aliceWantMinted);

  await collateralManagerTracker.assertChange({
    numActiveVaults: 1,
    totalCollateral: { value: 1000n },
    totalDebt: { value: 5250n },
  });

  // reduce collateral
  trace(t, 'alice reduce collateral');

  // Alice reduce collateral by 300. That leaves her at 700 * 10 > 1.05 * 5000.
  // Prices will drop from 10 to 7, she'll be liquidated: 700 * 7 < 1.05 * 5000.
  const collateralDecrement = aeth.make(300n);
  const aliceReduceCollateralSeat = await adjustVault({
    t,
    vault: aliceVault,
    proposal: {
      want: { Collateral: collateralDecrement },
    },
  });
  await E(aliceReduceCollateralSeat).getOfferResult();

  trace('alice ');
  await assertCollateralProceeds(
    t,
    aliceReduceCollateralSeat,
    aeth.make(300n),
    aeth.issuer,
  );

  await assertVaultDebtSnapshot(t, aliceNotifier, aliceWantMinted);
  trace(t, 'alice reduce collateral');
  await collateralManagerTracker.assertChange({
    totalCollateral: { value: 700n },
  });

  await assertLiqNodeForAuctionCreated({
    t,
    rootNode: chainStorage,
    auctioneerPF: auctioneerKit.publicFacet,
  });

  await E(aethTestPriceAuthority).setPrice(
    makeRatio(70n, run.brand, 10n, aeth.brand),
  );
  trace(t, 'changed price to 7 RUN/Aeth');

  // A bidder places a bid
  const bidAmount = run.make(3300n);
  const desired = aeth.make(700n);
  const bidderSeat = await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const {
    startTime: start1,
    time: now1,
    endTime,
  } = await startAuctionClock(auctioneerKit, manualTimer);

  let currentTime = now1;

  await collateralManagerTracker.assertChange({
    lockedQuote: makeRatioFromAmounts(
      aeth.make(1_000_000n),
      run.make(7_000_000n),
    ),
  });

  // expect Alice to be liquidated because her collateral is too low.
  await assertVaultState(t, aliceNotifier, Phase.LIQUIDATING);

  // Check vaults.preAuction here
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${now1.absValue.toString()}.vaults.preAuction`, // now1 is the nominal start time
    expected: [
      [
        'vault0',
        {
          collateralAmount: aeth.make(700n),
          debtAmount: await E(aliceVault).getCurrentDebt(),
        },
      ],
    ],
  });

  currentTime = await setClockAndAdvanceNTimes(manualTimer, 2, start1, 2n);

  await assertVaultState(t, aliceNotifier, Phase.LIQUIDATED);
  trace(t, 'alice liquidated', currentTime);
  await collateralManagerTracker.assertChange({
    numActiveVaults: 0,
    numLiquidatingVaults: 1,
    liquidatingCollateral: { value: 700n },
    liquidatingDebt: { value: 5250n },
    lockedQuote: null,
  });

  shortfallBalance += 2065n;
  await reserveTracker.assertChange({
    shortfallBalance: { value: shortfallBalance },
  });

  await collateralManagerTracker.assertChange({
    liquidatingDebt: { value: 0n },
    liquidatingCollateral: { value: 0n },
    totalCollateral: { value: 0n },
    totalDebt: { value: 0n },
    numLiquidatingVaults: 0,
    numLiquidationsCompleted: 1,
    totalCollateralSold: { value: 700n },
    totalProceedsReceived: { value: 3185n },
    totalShortfallReceived: { value: shortfallBalance },
  });

  //  Bidder bought 800 Aeth
  await assertBidderPayout(t, bidderSeat, run, 115n, aeth, 700n);

  // Check vaults.postAuction and auctionResults here
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${now1.absValue.toString()}.vaults.postAuction`, // now1 is the nominal start time
    expected: [],
  });

  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${now1.absValue.toString()}.auctionResult`, // now1 is the nominal start time
    expected: {
      collateralOffered: aeth.make(700n),
      istTarget: run.make(5250n),
      collateralForReserve: aeth.makeEmpty(),
      shortfallToReserve: run.make(2065n),
      mintedProceeds: run.make(3185n),
      collateralSold: aeth.make(700n),
      collateralRemaining: aeth.makeEmpty(),
      endTime,
    },
  });

  await documentStorageSchema(t, chainStorage, {
    note: 'Scenario 2 Liquidation Visibility Snapshot',
    node: `vaultFactory.managers.manager0.liquidations.${now1.absValue.toString()}`,
  });
});

/* Test liquidation flow 2b:
 * Auction does not raise enough to cover IST debt;
 * Collateral remains but debt is still not covered by IST raised by auction end */
test('liq-flow-2b', async t => {
  const { zoe, aeth, run, rates: defaultRates } = t.context;

  const rates = harden({
    ...defaultRates,
    interestRate: run.makeRatio(0n),
    liquidationMargin: run.makeRatio(150n),
  });
  t.context.rates = rates;

  const manualTimer = buildManualTimer();
  const services = await setupServices(
    t,
    makeRatio(1500n, run.brand, 100n, aeth.brand),
    aeth.make(1n),
    manualTimer,
    ONE_WEEK,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { aethCollateralManager },
    auctioneerKit,
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    chainStorage,
  } = services;
  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const { reserveTracker, collateralManagerTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  await collateralManagerTracker.assertInitial({
    // present
    numActiveVaults: 0,
    numLiquidatingVaults: 0,
    totalCollateral: aeth.make(0n),
    totalDebt: run.make(0n),
    retainedCollateral: aeth.make(0n),

    // running
    numLiquidationsCompleted: 0,
    numLiquidationsAborted: 0,
    totalOverageReceived: run.make(0n),
    totalProceedsReceived: run.make(0n),
    totalCollateralSold: aeth.make(0n),
    liquidatingCollateral: aeth.make(0n),
    liquidatingDebt: run.make(0n),
    totalShortfallReceived: run.make(0n),
    lockedQuote: null,
  });

  // Create a loan for Alice of 95 with 5% fee produces a debt of 100.
  const aliceCollateralAmount = aeth.make(15n);
  const aliceWantMinted = run.make(95n);
  /** @type {UserSeat<VaultKit>} */
  const aliceVaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount: aliceCollateralAmount,
    colKeyword: 'aeth',
    wantMintedAmount: aliceWantMinted,
  });
  const {
    vault: aliceVault,
    publicNotifiers: { vault: aliceNotifier },
  } = await legacyOfferResult(aliceVaultSeat);

  await assertVaultCurrentDebt(t, aliceVault, aliceWantMinted);
  await assertMintedProceeds(t, aliceVaultSeat, aliceWantMinted);

  await assertVaultDebtSnapshot(t, aliceNotifier, aliceWantMinted);
  await assertVaultState(t, aliceNotifier, Phase.ACTIVE);

  await collateralManagerTracker.assertChange({
    numActiveVaults: 1,
    totalDebt: { value: 100n },
    totalCollateral: { value: 15n },
  });

  // BOB takes out a loan
  const bobCollateralAmount = aeth.make(48n);
  const bobWantMinted = run.make(150n);
  /** @type {UserSeat<VaultKit>} */
  const bobVaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount: bobCollateralAmount,
    colKeyword: 'aeth',
    wantMintedAmount: bobWantMinted,
  });
  const {
    vault: bobVault,
    publicNotifiers: { vault: bobNotifier },
  } = await legacyOfferResult(bobVaultSeat);

  await assertVaultCurrentDebt(t, bobVault, bobWantMinted);
  await assertMintedProceeds(t, bobVaultSeat, bobWantMinted);

  await assertVaultDebtSnapshot(t, bobNotifier, bobWantMinted);
  await assertVaultState(t, bobNotifier, Phase.ACTIVE);

  await collateralManagerTracker.assertChange({
    numActiveVaults: 2,
    totalDebt: { value: 258n },
    totalCollateral: { value: 63n },
  });

  // A bidder places a bid
  const bidAmount = run.make(100n);
  const desired = aeth.make(8n);
  const bidderSeat = await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  // price falls
  await aethTestPriceAuthority.setPrice(
    makeRatio(400n, run.brand, 100n, aeth.brand),
  );
  await eventLoopIteration();

  // Assert node not created
  await assertLiqNodeForAuctionCreated({
    t,
    rootNode: chainStorage,
    auctioneerPF: auctioneerKit.publicFacet,
  });

  const { startTime, time, endTime } = await startAuctionClock(
    auctioneerKit,
    manualTimer,
  );

  await assertVaultState(t, aliceNotifier, Phase.LIQUIDATING);
  await assertVaultState(t, bobNotifier, Phase.LIQUIDATING);

  // Check vaults.preAuction here
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.preAuction`, // time is the nominal start time
    expected: [
      [
        'vault0', // Alice's vault
        {
          collateralAmount: aliceCollateralAmount,
          debtAmount: await E(aliceVault).getCurrentDebt(),
        },
      ],
      [
        'vault1', // Bob's vault
        {
          collateralAmount: bobCollateralAmount,
          debtAmount: await E(bobVault).getCurrentDebt(),
        },
      ],
    ],
  });

  await collateralManagerTracker.assertChange({
    lockedQuote: makeRatioFromAmounts(
      aeth.make(1_000_000n),
      run.make(4_000_000n),
    ),
  });

  await collateralManagerTracker.assertChange({
    numActiveVaults: 0,
    liquidatingDebt: { value: 258n },
    liquidatingCollateral: { value: 63n },
    numLiquidatingVaults: 2,
    lockedQuote: null,
  });

  await setClockAndAdvanceNTimes(manualTimer, 2n, startTime, 2n);

  await collateralManagerTracker.assertChange({
    numActiveVaults: 1,
    liquidatingDebt: { value: 0n },
    liquidatingCollateral: { value: 0n },
    totalDebt: { value: 158n },
    totalCollateral: { value: 44n },
    totalProceedsReceived: { value: 34n },
    totalShortfallReceived: { value: 66n },
    totalCollateralSold: { value: 8n },
    numLiquidatingVaults: 0,
    numLiquidationsCompleted: 1,
    numLiquidationsAborted: 1,
  });

  await assertVaultNotification({
    t,
    notifier: aliceNotifier,
    expected: {
      vaultState: Phase.LIQUIDATED,
      locked: aeth.makeEmpty(),
    },
  });

  // Reduce Bob's collateral by liquidation penalty
  // bob's share is 7 * 158/258, which rounds up to 5
  const recoveredBobCollateral = AmountMath.subtract(
    bobCollateralAmount,
    aeth.make(5n),
  );

  await assertVaultNotification({
    t,
    notifier: bobNotifier,
    expected: {
      vaultState: Phase.ACTIVE,
      locked: recoveredBobCollateral,
      debtSnapshot: { debt: run.make(158n) },
    },
  });

  await assertBidderPayout(t, bidderSeat, run, 66n, aeth, 8n);

  await assertReserveState(reserveTracker, 'like', {
    allocations: {
      Aeth: aeth.make(12n),
      Fee: undefined,
    },
  });

  // Check vaults.postAuction and auctionResults here
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.postAuction`, // time is the nominal start time
    expected: [
      [
        'vault1', // Bob got reinstated
        {
          Collateral: recoveredBobCollateral,
          phase: Phase.ACTIVE,
        },
      ],
    ],
  });

  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.auctionResult`, // now1 is the nominal start time
    expected: {
      collateralOffered: aeth.make(63n),
      istTarget: run.make(258n),
      collateralForReserve: aeth.make(12n),
      shortfallToReserve: run.make(66n),
      mintedProceeds: run.make(34n),
      collateralSold: aeth.make(8n),
      collateralRemaining: aeth.make(5n),
      endTime,
    },
  });

  await documentStorageSchema(t, chainStorage, {
    note: 'Scenario 3 Liquidation Visibility Snapshot',
    node: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}`,
  });
});

/* Auction starts with no liquidatable vaults
 * In this scenario, no child node of liquidation should be created */
test('liq-no-vaults', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { aethCollateralManager },
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
    chainStorage,
  } = services;

  const { reserveTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  const expectedReserveState = reserveInitialState(run.makeEmpty());
  await assertReserveState(reserveTracker, 'initial', expectedReserveState);

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount,
    colKeyword: 'aeth',
    wantMintedAmount: wantMinted,
  });

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desired = aeth.make(400n);
  await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const {
    vault,
    publicNotifiers: { vault: vaultNotifier },
  } = await legacyOfferResult(vaultSeat);

  await assertVaultCurrentDebt(t, vault, wantMinted);
  await assertVaultState(t, vaultNotifier, 'active');
  await assertVaultDebtSnapshot(t, vaultNotifier, wantMinted);
  await assertMintedAmount(t, vaultSeat, wantMinted);
  await assertVaultCollateral(t, vault, 400n, aeth);

  // Check that no child node with auction start time's name created before the liquidation
  const vstorageBeforeLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.is(vstorageBeforeLiquidation.length, 0);

  // the auction will start but no vault will be liquidated
  await startAuctionClock(auctioneerKit, manualTimer);
  await assertVaultState(t, vaultNotifier, 'active');

  // Check that no child node with auction start time's name created after the auction started
  const vstorageDuringLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.is(vstorageDuringLiquidation.length, 0);
});

/* The auctionSchedule returned schedulesP will be a rejected promise
 * In this scenario, the state of auctionResult node should have endTime as undefined */
test('liq-rejected-schedule', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { vaultFactory, aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
    chainStorage,
  } = services;

  const { reserveTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  let expectedReserveState = reserveInitialState(run.makeEmpty());
  await assertReserveState(reserveTracker, 'initial', expectedReserveState);

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount,
    colKeyword: 'aeth',
    wantMintedAmount: wantMinted,
  });

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desired = aeth.make(400n);
  const bidderSeat = await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const {
    vault,
    publicNotifiers: { vault: vaultNotifier },
  } = await legacyOfferResult(vaultSeat);

  await assertVaultCurrentDebt(t, vault, wantMinted);
  await assertVaultState(t, vaultNotifier, 'active');
  await assertVaultDebtSnapshot(t, vaultNotifier, wantMinted);
  await assertMintedAmount(t, vaultSeat, wantMinted);
  await assertVaultCollateral(t, vault, 400n, aeth);

  // Check that no child node with auction start time's name created before the liquidation
  const vstorageBeforeLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.is(vstorageBeforeLiquidation.length, 0);

  // drop collateral price from 5:1 to 4:1 and liquidate vault
  aethTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, aeth.brand));

  await assertVaultState(t, vaultNotifier, 'active');

  await E(auctioneerKit.publicFacet).setRejectGetSchedules(true);

  const { startTime, time } = await startAuctionClock(
    auctioneerKit,
    manualTimer,
  );
  let currentTime = time;

  // Check that {timestamp}.vaults.preAuction values are correct before auction is completed
  const vstorageDuringLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.not(vstorageDuringLiquidation.length, 0);
  const debtDuringLiquidation = await E(vault).getCurrentDebt();
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.preAuction`,
    expected: [
      [
        'vault0',
        {
          collateralAmount,
          debtAmount: debtDuringLiquidation,
        },
      ],
    ],
  });

  await assertVaultState(t, vaultNotifier, 'liquidating');
  await assertVaultCollateral(t, vault, 0n, aeth);
  await assertVaultCurrentDebt(t, vault, wantMinted);

  await E(auctioneerKit.publicFacet).setRejectGetSchedules(false);

  currentTime = await setClockAndAdvanceNTimes(manualTimer, 2, startTime, 2n);
  trace(`advanced time to `, currentTime);

  await assertVaultState(t, vaultNotifier, 'liquidated');
  await assertVaultSeatExited(t, vaultSeat);
  await assertVaultLocked(t, vaultNotifier, 0n, aeth);
  await assertVaultCurrentDebt(t, vault, 0n);
  await assertVaultFactoryRewardAllocation(t, vaultFactory, 80n);

  const closeSeat = await closeVault({ t, vault });
  await E(closeSeat).getOfferResult();

  await assertCollateralProceeds(t, closeSeat, aeth.makeEmpty(), aeth.issuer);
  await assertVaultCollateral(t, vault, 0n, aeth);
  await assertBidderPayout(t, bidderSeat, run, 320n, aeth, 400n);

  expectedReserveState = {
    allocations: {
      Aeth: undefined,
      Fee: undefined,
    },
  };
  await assertReserveState(reserveTracker, 'like', expectedReserveState);

  // Check that {timestamp}.vaults.postAuction values are correct after auction is completed
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.preAuction`,
    expected: [
      [
        'vault0',
        {
          collateralAmount,
          debtAmount: debtDuringLiquidation,
        },
      ],
    ],
  });

  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.vaults.postAuction`,
    expected: [],
  });

  // Check that {timestamp}.auctionResult values are correct after auction is completed
  await assertStorageData({
    t,
    storageRoot: chainStorage,
    path: `vaultFactory.managers.manager0.liquidations.${time.absValue.toString()}.auctionResult`,
    expected: {
      collateralOffered: collateralAmount,
      istTarget: run.make(1680n),
      collateralForReserve: aeth.makeEmpty(),
      shortfallToReserve: run.makeEmpty(),
      mintedProceeds: run.make(1680n),
      collateralSold: aeth.make(400n),
      collateralRemaining: aeth.makeEmpty(),
      endTime: undefined,
    },
  });
});

/* The timestampStorageNode returned makeChildNode will be a rejected promise
 * In this scenario, the error should be handled and printed its message */
test('liq-rejected-timestampStorageNode', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { vaultFactory, aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
    chainStorage,
  } = services;

  const { reserveTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount,
    colKeyword: 'aeth',
    wantMintedAmount: wantMinted,
  });

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desired = aeth.make(400n);
  const bidderSeat = await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const {
    vault,
    publicNotifiers: { vault: vaultNotifier },
  } = await legacyOfferResult(vaultSeat);

  // Check that no child node with auction start time's name created before the liquidation
  const vstorageBeforeLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.is(vstorageBeforeLiquidation.length, 0);

  setBlockMakeChildNode('3600');

  // drop collateral price from 5:1 to 4:1 and liquidate vault
  aethTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, aeth.brand));

  const { startTime } = await startAuctionClock(auctioneerKit, manualTimer);

  // Check that no child node with auction start time's name created after the liquidation
  const vstorageDuringLiquidation = await getDataFromVstorage(
    chainStorage,
    `vaultFactory.managers.manager0.liquidations`,
  );
  t.is(vstorageDuringLiquidation.length, 0);

  await assertVaultState(t, vaultNotifier, 'liquidating');
  await assertVaultCollateral(t, vault, 0n, aeth);
  await assertVaultCurrentDebt(t, vault, wantMinted);

  const currentTime = await setClockAndAdvanceNTimes(
    manualTimer,
    2,
    startTime,
    2n,
  );
  trace(`advanced time to `, currentTime);

  await assertVaultState(t, vaultNotifier, 'liquidated');
  await assertVaultSeatExited(t, vaultSeat);
  await assertVaultLocked(t, vaultNotifier, 0n, aeth);
  await assertVaultCurrentDebt(t, vault, 0n);
  await assertVaultFactoryRewardAllocation(t, vaultFactory, 80n);

  const closeSeat = await closeVault({ t, vault });
  await E(closeSeat).getOfferResult();

  await assertCollateralProceeds(t, closeSeat, aeth.makeEmpty(), aeth.issuer);
  await assertVaultCollateral(t, vault, 0n, aeth);
  await assertBidderPayout(t, bidderSeat, run, 320n, aeth, 400n);

  await assertReserveState(reserveTracker, 'like', {
    allocations: {
      Aeth: undefined,
      Fee: undefined,
    },
  });
});
