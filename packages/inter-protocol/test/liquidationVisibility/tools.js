import { E } from '@endo/eventual-send';
import { makeIssuerKit } from '@agoric/ertp';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { allValues, makeTracer, objectMap } from '@agoric/internal';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import {
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { TimeMath } from '@agoric/time';
import { subscribeEach } from '@agoric/notifier';
import '../../src/vaultFactory/types.js';
import { withAmountUtils } from '../supports.js';
import { getRunFromFaucet } from '../vaultFactory/vaultFactoryUtils.js';
import { subscriptionTracker, vaultManagerMetricsTracker } from '../metrics.js';
import { startVaultFactory } from '../../src/proposals/econ-behaviors.js';
import { setupElectorateReserveAndAuction } from './mock-setupChainStorage.js';

export const BASIS_POINTS = 10000n;

let contractRoots = {
  faucet: './test/vaultFactory/faucet.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  reserve: './src/reserve/assetReserve.js',
  auctioneer: './src/auction/auctioneer.js',
};

const trace = makeTracer('VisibilityTools', true);

export const setupBasics = async (zoe, contractsWrapper) => {
  const stableIssuer = await E(zoe).getFeeIssuer();
  const stableBrand = await E(stableIssuer).getBrand();

  // @ts-expect-error missing mint
  const run = withAmountUtils({ issuer: stableIssuer, brand: stableBrand });
  const aeth = withAmountUtils(
    makeIssuerKit('aEth', 'nat', { decimalPlaces: 6 }),
  );
  const abtc = withAmountUtils(
    makeIssuerKit('aBtc', 'nat', { decimalPlaces: 6 }),
  );

  if (contractsWrapper) {
    contractRoots = { ...contractRoots, ...contractsWrapper };
  }

  const bundleCache = await unsafeMakeBundleCache('./bundles/');
  const bundles = await allValues({
    faucet: bundleCache.load(contractRoots.faucet, 'faucet'),
    VaultFactory: bundleCache.load(contractRoots.VaultFactory, 'VaultFactory'),
    reserve: bundleCache.load(contractRoots.reserve, 'reserve'),
    auctioneer: bundleCache.load(contractRoots.auctioneer, 'auction'),
  });
  const installation = objectMap(bundles, bundle => E(zoe).install(bundle));

  return {
    run,
    aeth,
    abtc,
    bundleCache,
    bundles,
    installation,
  };
};

/**
 * @typedef {Record<string, any> & {
 *   aeth: IssuerKit & import('../supports.js').AmountUtils;
 *   run: IssuerKit & import('../supports.js').AmountUtils;
 *   bundleCache: Awaited<ReturnType<typeof unsafeMakeBundleCache>>;
 *   rates: VaultManagerParamValues;
 *   interestTiming: InterestTiming;
 *   zoe: ZoeService;
 * }} Context
 */

/**
 * NOTE: called separately by each test so zoe/priceAuthority don't interfere
 * This helper function will economicCommittee, reserve and auctioneer. It will
 * start the vaultFactory and open a new vault with the collateral provided in
 * the context. The collateral value will be set by the priceAuthority with the
 * ratio provided by priceOrList
 *
 * @param {import('ava').ExecutionContext<Context>} t
 * @param {NatValue[] | Ratio} priceOrList
 * @param {Amount | undefined} unitAmountIn
 * @param {import('@agoric/time').TimerService} timer
 * @param {RelativeTime} quoteInterval
 * @param {Partial<import('../../src/auction/params.js').AuctionParams>} [auctionParams]
 * @param setupExtraAsset
 */
export const setupServices = async (
  t,
  priceOrList,
  unitAmountIn,
  timer = buildManualTimer(),
  quoteInterval = 1n,
  auctionParams = {},
  setupExtraAsset = false,
) => {
  const {
    zoe,
    run,
    aeth,
    abtc,
    interestTiming,
    minInitialDebt,
    referencedUi,
    rates,
  } = t.context;

  t.context.timer = timer;

  const btcKit = setupExtraAsset
    ? {
        btc: abtc,
        btcPrice: makeRatio(50n, run.brand, 10n, abtc.brand),
        btcAmountIn: abtc.make(400n),
      }
    : undefined;

  const {
    space,
    priceAuthorityAdmin,
    aethTestPriceAuthority,
    abtcTestPriceAuthority,
  } = await setupElectorateReserveAndAuction(
    t,
    // @ts-expect-error inconsistent types with withAmountUtils
    run,
    aeth,
    priceOrList,
    quoteInterval,
    unitAmountIn,
    auctionParams,
    btcKit,
  );

  const {
    consume,
    installation: { produce: iProduce },
  } = space;

  iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
  iProduce.liquidate.resolve(t.context.installation.liquidate);

  await startVaultFactory(
    space,
    { interestTiming, options: { referencedUi } },
    minInitialDebt,
  );

  const governorCreatorFacet = E.get(
    consume.vaultFactoryKit,
  ).governorCreatorFacet;
  const vaultFactoryCreatorFacetP = E.get(consume.vaultFactoryKit).creatorFacet;

  const reserveCreatorFacet = E.get(consume.reserveKit).creatorFacet;
  const reservePublicFacet = E.get(consume.reserveKit).publicFacet;
  const reserveKit = { reserveCreatorFacet, reservePublicFacet };

  const aethVaultManagerP = E(vaultFactoryCreatorFacetP).addVaultType(
    aeth.issuer,
    'AEth',
    rates,
  );

  let abtcVaultManagerP;
  if (setupExtraAsset) {
    await eventLoopIteration();
    abtcVaultManagerP = E(vaultFactoryCreatorFacetP).addVaultType(
      abtc.issuer,
      'ABtc',
      rates,
    );
  }

  /** @typedef {import('../../src/proposals/econ-behaviors.js').AuctioneerKit} AuctioneerKit */
  /** @typedef {import('@agoric/zoe/tools/manualPriceAuthority.js').ManualPriceAuthority} ManualPriceAuthority */
  /** @typedef {import('../../src/vaultFactory/vaultFactory.js').VaultFactoryContract} VFC */
  /**
   * @type {[
   *   any,
   *   VaultFactoryCreatorFacet,
   *   VFC['publicFacet'],
   *   VaultManager,
   *   VaultManager | undefined,
   *   AuctioneerKit,
   *   ManualPriceAuthority,
   *   CollateralManager,
   *   CollateralManager | undefined,
   *   chainStorage,
   *   board,
   * ]}
   */
  const [
    governorInstance,
    vaultFactory, // creator
    vfPublic,
    aethVaultManager,
    abtcVaultManager,
    auctioneerKit,
    priceAuthority,
    aethCollateralManager,
    abtcCollateralManager,
    chainStorage,
    board,
  ] = await Promise.all([
    E(consume.agoricNames).lookup('instance', 'VaultFactoryGovernor'),
    vaultFactoryCreatorFacetP,
    E.get(consume.vaultFactoryKit).publicFacet,
    aethVaultManagerP,
    abtcVaultManagerP || Promise.resolve(undefined),
    consume.auctioneerKit,
    /** @type {Promise<ManualPriceAuthority>} */ (consume.priceAuthority),
    E(aethVaultManagerP).getPublicFacet(),
    abtcVaultManagerP
      ? E(abtcVaultManagerP).getPublicFacet()
      : Promise.resolve(undefined),
    consume.chainStorage,
    consume.board,
  ]);
  trace(t, 'pa', {
    governorInstance,
    vaultFactory,
    vfPublic,
    priceAuthority: !!priceAuthority,
  });

  const { g, v } = {
    g: {
      governorInstance,
      governorPublicFacet: E(zoe).getPublicFacet(governorInstance),
      governorCreatorFacet,
    },
    v: {
      vaultFactory,
      vfPublic,
      aethVaultManager,
      aethCollateralManager,
      abtcVaultManager,
      abtcCollateralManager,
    },
  };

  await E(auctioneerKit.creatorFacet).addBrand(aeth.issuer, 'Aeth');
  if (setupExtraAsset) {
    await E(auctioneerKit.creatorFacet).addBrand(abtc.issuer, 'ABtc');
  }

  return {
    zoe,
    timer,
    space,
    governor: g,
    vaultFactory: v,
    runKit: { issuer: run.issuer, brand: run.brand },
    priceAuthority,
    reserveKit,
    auctioneerKit,
    priceAuthorityAdmin,
    aethTestPriceAuthority,
    abtcTestPriceAuthority,
    chainStorage,
    board,
  };
};

export const setClockAndAdvanceNTimes = async (
  timer,
  times,
  start,
  incr = 1n,
) => {
  let currentTime = start;
  // first time through is at START, then n TIMES more plus INCR
  for (let i = 0; i <= times; i += 1) {
    await timer.advanceTo(TimeMath.absValue(currentTime));
    await eventLoopIteration();
    currentTime = TimeMath.addAbsRel(currentTime, TimeMath.relValue(incr));
  }
  return currentTime;
};

// Calculate the nominalStart time (when liquidations happen), and the priceLock
// time (when prices are locked). Advance the clock to the priceLock time, then
// to the nominal start time. return the nominal start time and the auction
// start time, so the caller can check on liquidations in process before
// advancing the clock.
export const startAuctionClock = async (auctioneerKit, manualTimer) => {
  const schedule = await E(auctioneerKit.creatorFacet).getSchedule();
  const priceDelay = await E(auctioneerKit.publicFacet).getPriceLockPeriod();
  const { startTime, startDelay, endTime } = schedule.nextAuctionSchedule;
  const nominalStart = TimeMath.subtractAbsRel(startTime, startDelay);
  const priceLockTime = TimeMath.subtractAbsRel(nominalStart, priceDelay);
  await manualTimer.advanceTo(TimeMath.absValue(priceLockTime));
  await eventLoopIteration();

  await manualTimer.advanceTo(TimeMath.absValue(nominalStart));
  await eventLoopIteration();
  return { startTime, time: nominalStart, endTime };
};

export const bid = async (t, zoe, auctioneerKit, aeth, bidAmount, desired) => {
  const bidderSeat = await E(zoe).offer(
    E(auctioneerKit.publicFacet).makeBidInvitation(aeth.brand),
    harden({ give: { Bid: bidAmount } }),
    harden({ Bid: getRunFromFaucet(t, bidAmount.value) }),
    { maxBuy: desired, offerPrice: makeRatioFromAmounts(bidAmount, desired) },
  );
  return bidderSeat;
};

/**
 * @typedef {object} OpenVaultParams
 * @property {any} t
 * @property {CollateralManager} cm
 * @property {Amount<'nat'>} collateralAmount
 * @property {string} colKeyword
 * @property {Amount<'nat'>} wantMintedAmount
 */

/**
 * @param {OpenVaultParams} params
 * @returns {Promise<UserSeat<VaultKit>>}
 */
export const openVault = async ({
  t,
  cm,
  collateralAmount,
  colKeyword,
  wantMintedAmount,
}) => {
  return E(t.context.zoe).offer(
    await E(cm).makeVaultInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Minted: wantMintedAmount },
    }),
    harden({
      Collateral: t.context[colKeyword].mint.mintPayment(collateralAmount),
    }),
  );
};

/**
 * @typedef {object} AdjustVaultParams
 * @property {object} t
 * @property {Vault} vault
 * @property {{
 *   want: [
 *     {
 *       Collateral: Amount<'nat'>;
 *       Minted: Amount<'nat'>;
 *     },
 *   ];
 *   give: [
 *     {
 *       Collateral: Amount<'nat'>;
 *       Minted: Amount<'nat'>;
 *     },
 *   ];
 * }} proposal
 * @property {{
 *   want: [
 *     {
 *       Collateral: Payment;
 *       Minted: Payment;
 *     },
 *   ];
 *   give: [
 *     {
 *       Collateral: Payment;
 *       Minted: Payment;
 *     },
 *   ];
 * }} [payment]
 */

/**
 * @param {AdjustVaultParams} adjustVaultParams
 * @returns {Promise<UserSeat>}
 */
export const adjustVault = async ({ t, vault, proposal, payment }) => {
  return E(t.context.zoe).offer(
    E(vault).makeAdjustBalancesInvitation(),
    harden(proposal),
    payment,
  );
};

/**
 * @typedef {object} CloseVaultParams
 * @property {Vault} vault
 * @property {object} t
 */

/**
 * @param {CloseVaultParams} closeVaultParams
 * @returns {Promise<UserSeat>}
 */
export const closeVault = async ({ t, vault }) => {
  return E(t.context.zoe).offer(E(vault).makeCloseInvitation());
};

/**
 * @typedef {object} GetTrackerParams
 * @property {any} t
 * @property {CollateralManager} collateralManager
 * @property {AssetReservePublicFacet} reservePublicFacet
 */

/**
 * @typedef {object} Trackers
 * @property {object} [reserveTracker]
 * @property {object} [collateralManagerTracker]
 */

/**
 * @param {GetTrackerParams} getTrackerParams
 * @returns {Promise<Trackers>}
 */
export const getMetricTrackers = async ({
  t,
  collateralManager,
  reservePublicFacet,
}) => {
  /** @type {Trackers} */
  const trackers = {};
  if (reservePublicFacet) {
    const metricsTopic = await E.get(E(reservePublicFacet).getPublicTopics())
      .metrics;
    trackers.reserveTracker = await subscriptionTracker(t, metricsTopic);
  }

  if (collateralManager) {
    trackers.collateralManagerTracker = await vaultManagerMetricsTracker(
      t,
      collateralManager,
    );
  }

  return harden(trackers);
};

export const getBookDataTracker = async (t, auctioneerPublicFacet, brand) => {
  const tracker = E.when(
    E(auctioneerPublicFacet).getBookDataUpdates(brand),
    subscription => subscriptionTracker(t, subscribeEach(subscription)),
  );

  return tracker;
};

export const getSchedulerTracker = async (t, auctioneerPublicFacet) => {
  const tracker = E.when(
    E(auctioneerPublicFacet).getPublicTopics(),
    subscription =>
      subscriptionTracker(t, subscribeEach(subscription.schedule.subscriber)),
  );

  return tracker;
};

export const getDataFromVstorage = async (storage, node) => {
  const illustration = [...storage.keys()].sort().map(
    /** @type {(k: string) => [string, unknown]} */
    key => [
      key.replace('mockChainStorageRoot.', 'published.'),
      storage.getBody(key),
    ],
  );

  const pruned = illustration.filter(
    node ? ([key, _]) => key.startsWith(`published.${node}`) : _entry => true,
  );

  return pruned;
};
