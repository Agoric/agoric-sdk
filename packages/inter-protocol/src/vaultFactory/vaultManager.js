/* eslint-disable consistent-return */
/**
 * @file Vault Manager object manages vault-based debts for a collateral type.
 *
 * The responsibilities include:
 * - opening a new vault backed by the collateral
 * - publishing metrics on the vault economy for that collateral
 * - charging interest on all active vaults
 * - liquidating active vaults that have exceeded the debt ratio
 *
 * Once a vault is settled (liquidated or closed) it can still be used, traded,
 * etc. but is no longer the concern of the manager. It can't be liquidated,
 * have interest charged, or be counted in the metrics.
 *
 * Undercollateralized vaults can have their assets sent to the auctioneer to be
 * liquidated. If the auction is unsuccessful, the liquidation may be reverted.
 */
import '@agoric/zoe/exported.js';

import {
  AmountMath,
  AmountShape,
  BrandShape,
  NotifierShape,
  RatioShape,
} from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { makeStoredNotifier, observeNotifier } from '@agoric/notifier';
import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import {
  M,
  makeScalarBigMapStore,
  makeScalarBigSetStore,
  prepareExoClassKit,
  provide,
} from '@agoric/vat-data';
import { TransferPartShape } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import {
  atomicRearrange,
  ceilDivideBy,
  ceilMultiplyBy,
  floorDivideBy,
  floorMultiplyBy,
  getAmountIn,
  getAmountOut,
  makeEphemeraProvider,
  makeRatio,
  makeRatioFromAmounts,
  makeRecorderTopic,
  multiplyRatios,
  offerTo,
  SubscriberShape,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/index.js';
import { PriceQuoteShape, SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/eventual-send';
import { AuctionPFShape } from '../auction/auctioneer.js';
import { checkDebtLimit, makeNatAmountShape } from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { getLiquidatableVaults, liquidationResults } from './liquidation.js';
import { calculateMinimumCollateralization, minimumPrice } from './math.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { Phase, prepareVault } from './vault.js';

const { details: X, Fail } = assert;

const trace = makeTracer('VM');

/** @typedef {import('./storeUtils.js').NormalizedDebt} NormalizedDebt */
/** @typedef {import('@agoric/time/src/types').RelativeTime} RelativeTime */

// Metrics naming scheme: nouns are present values; past-participles are accumulative.
/**
 * @typedef {object} MetricsNotification
 *
 * @property {number}         numActiveVaults          present count of vaults
 * @property {number}         numLiquidatingVaults  present count of liquidating vaults
 * @property {Amount<'nat'>}  totalCollateral    present sum of collateral across all vaults
 * @property {Amount<'nat'>}  totalDebt          present sum of debt across all vaults
 * @property {Amount<'nat'>}  retainedCollateral collateral held as a result of not returning excess refunds
 *                                                to owners of vaults liquidated with shortfalls
 * @property {Amount<'nat'>}  liquidatingCollateral  present sum of collateral in vaults sent for liquidation
 * @property {Amount<'nat'>}  liquidatingDebt        present sum of debt in vaults sent for liquidation
 *
 * @property {Amount<'nat'>}  totalCollateralSold       running sum of collateral sold in liquidation
 * @property {Amount<'nat'>}  totalOverageReceived      running sum of overages, central received greater than debt
 * @property {Amount<'nat'>}  totalProceedsReceived     running sum of minted received from liquidation
 * @property {Amount<'nat'>}  totalShortfallReceived    running sum of shortfalls, minted received less than debt
 * @property {number}         numLiquidationsCompleted  running count of liquidated vaults
 * @property {number}         numLiquidationsAborted    running count of vault liquidations that were reverted.
 */

/**
 * @typedef {{
 *  compoundedInterest: Ratio,
 *  interestRate: Ratio,
 *  latestInterestUpdate: Timestamp,
 * }} AssetState
 *
 * @typedef {{
 *  getChargingPeriod: () => RelativeTime,
 *  getRecordingPeriod: () => RelativeTime,
 *  getDebtLimit: () => Amount<'nat'>,
 *  getInterestRate: () => Ratio,
 *  getLiquidationPadding: () => Ratio,
 *  getLiquidationMargin: () => Ratio,
 *  getLiquidationPenalty: () => Ratio,
 *  getMintFee: () => Ratio,
 *  getMinInitialDebt: () => Amount<'nat'>,
 * }} GovernedParamGetters
 */

/**
 * @typedef {Readonly<{
 *   debtMint: ZCFMint<'nat'>,
 *   collateralBrand: Brand<'nat'>,
 *   collateralUnit: Amount<'nat'>,
 *   descriptionScope: string,
 *   startTimeStamp: Timestamp,
 *   storageNode: StorageNode,
 * }>} HeldParams
 */

/**
 * @typedef {{
 *   assetTopicKit: import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<AssetState>,
 *   debtBrand: Brand<'nat'>,
 *   liquidatingVaults: SetStore<Vault>,
 *   metricsTopicKit: import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<MetricsNotification>,
 *   poolIncrementSeat: ZCFSeat,
 *   retainedCollateralSeat: ZCFSeat,
 *   unsettledVaults: MapStore<string, Vault>,
 * }} ImmutableState
 */

/**
 * @typedef {{
 *   compoundedInterest: Ratio,
 *   latestInterestUpdate: Timestamp,
 *   numLiquidationsCompleted: number,
 *   numLiquidationsAborted: number,
 *   totalCollateral: Amount<'nat'>,
 *   totalCollateralSold: Amount<'nat'>,
 *   totalDebt: Amount<'nat'>,
 *   liquidatingCollateral: Amount<'nat'>,
 *   liquidatingDebt: Amount<'nat'>,
 *   totalOverageReceived: Amount<'nat'>,
 *   totalProceedsReceived: Amount<'nat'>,
 *   totalShortfallReceived: Amount<'nat'>,
 *   vaultCounter: number,
 *   lockedQuote: PriceQuote | undefined,
 * }} MutableState
 */

/** @param {Pick<PriceDescription, 'amountIn' | 'amountOut'>} quoteAmount */
const quoteAsRatio = quoteAmount =>
  makeRatioFromAmounts(quoteAmount.amountIn, quoteAmount.amountOut);

/**
 * @type {(brand: Brand) => {
 * prioritizedVaults: ReturnType<typeof makePrioritizedVaults>,
 * storedQuotesNotifier: import('@agoric/notifier').StoredNotifier<PriceQuote>,
 * storedCollateralQuote: PriceQuote,
 * }}
 */
// any b/c will be filled after start()
const collateralEphemera = makeEphemeraProvider(() => /** @type {any} */ ({}));

/**
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {{
 *   zcf: import('./vaultFactory.js').VaultFactoryZCF,
 *   marshaller: ERef<Marshaller>,
 *   makeRecorderKit: import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit,
 *   makeERecorderKit: import('@agoric/zoe/src/contractSupport/recorder.js').MakeERecorderKit,
 *   factoryPowers: import('./vaultDirector.js').FactoryPowersFacet,
 * }} powers
 */
export const prepareVaultManagerKit = (
  baggage,
  { zcf, marshaller, makeRecorderKit, factoryPowers },
) => {
  const { priceAuthority, timerService, reservePublicFacet } = zcf.getTerms();

  const makeVault = prepareVault(baggage, makeRecorderKit, zcf);

  /**
   * @param {HeldParams & { metricsStorageNode: StorageNode }} params
   * @returns {HeldParams & ImmutableState & MutableState}
   */
  const initState = params => {
    const {
      debtMint,
      collateralBrand,
      metricsStorageNode,
      startTimeStamp,
      storageNode,
    } = params;
    const debtBrand = debtMint.getIssuerRecord().brand;

    /** @type {ImmutableState} */
    const immutable = {
      debtBrand,
      poolIncrementSeat: zcf.makeEmptySeatKit().zcfSeat,

      /**
       * Vaults that have been sent for liquidation. When we get proceeds (or lack
       * thereof) back from the liquidator, we will allocate them among the vaults.
       *
       * @type {SetStore<Vault>}
       */
      liquidatingVaults: makeScalarBigSetStore('liquidatingVaults', {
        durable: true,
      }),

      assetTopicKit: makeRecorderKit(storageNode),

      metricsTopicKit: makeRecorderKit(metricsStorageNode),

      // TODO(#7074) not used while liquidation is disabled. Reinstate with #7074
      retainedCollateralSeat: zcf.makeEmptySeatKit().zcfSeat,

      unsettledVaults: makeScalarBigMapStore('orderedVaultStore', {
        durable: true,
      }),
    };

    const zeroCollateral = AmountMath.makeEmpty(collateralBrand, 'nat');
    const zeroDebt = AmountMath.makeEmpty(debtBrand, 'nat');

    return harden({
      ...params,
      ...immutable,
      compoundedInterest: makeRatio(100n, debtBrand), // starts at 1.0, no interest
      latestInterestUpdate: startTimeStamp,
      numLiquidationsCompleted: 0,
      numLiquidationsAborted: 0,
      totalCollateral: zeroCollateral,
      totalCollateralSold: zeroCollateral,
      totalDebt: zeroDebt,
      liquidatingCollateral: zeroCollateral,
      liquidatingDebt: zeroDebt,
      totalOverageReceived: zeroDebt,
      totalProceedsReceived: zeroDebt,
      totalShortfallReceived: zeroDebt,
      vaultCounter: 0,
      lockedQuote: undefined,
    });
  };

  const makeVaultManagerKitInternal = prepareExoClassKit(
    baggage,
    'VaultManagerKit',
    {
      collateral: M.interface('collateral', {
        makeVaultInvitation: M.call().returns(M.promise()),
        getSubscriber: M.call().returns(SubscriberShape),
        getMetrics: M.call().returns(SubscriberShape),
        getPublicTopics: M.call().returns(TopicsRecordShape),
        getQuotes: M.call().returns(NotifierShape),
        getCompoundedInterest: M.call().returns(RatioShape),
      }),
      helper: M.interface(
        'helper',
        // not exposed so sloppy okay
        {},
        { sloppy: true },
      ),
      manager: M.interface('manager', {
        getGovernedParams: M.call().returns(M.remotable('governedParams')),
        maxDebtFor: M.call(AmountShape).returns(AmountShape),
        mintAndTransfer: M.call(
          SeatShape,
          AmountShape,
          AmountShape,
          M.arrayOf(TransferPartShape),
        ).returns(),
        burn: M.call(AmountShape, SeatShape).returns(),
        getAssetSubscriber: M.call().returns(SubscriberShape),
        getCollateralBrand: M.call().returns(BrandShape),
        getDebtBrand: M.call().returns(BrandShape),
        getCompoundedInterest: M.call().returns(RatioShape),
        scopeDescription: M.call(M.string()).returns(M.string()),
        handleBalanceChange: M.call(
          AmountShape,
          AmountShape,
          M.string(),
          M.string(),
          M.remotable('vault'),
        ).returns(),
      }),
      self: M.interface('self', {
        getGovernedParams: M.call().returns(M.remotable('governedParams')),
        makeVaultKit: M.call(SeatShape).returns(M.promise()),
        getCollateralQuote: M.call().returns(PriceQuoteShape),
        getPublicFacet: M.call().returns(M.remotable('publicFacet')),
        lockOraclePrices: M.call().returns(PriceQuoteShape),
        liquidateVaults: M.call(AuctionPFShape).returns(M.promise()),
      }),
    },
    initState,
    {
      collateral: {
        makeVaultInvitation() {
          const { facets } = this;
          const { collateralBrand, debtBrand } = this.state;
          return zcf.makeInvitation(
            seat => this.facets.self.makeVaultKit(seat),
            facets.manager.scopeDescription('MakeVault'),
            undefined,
            M.splitRecord({
              give: {
                Collateral: makeNatAmountShape(collateralBrand),
              },
              want: {
                Minted: makeNatAmountShape(debtBrand),
              },
            }),
          );
        },
        /** @deprecated use getPublicTopics */
        getSubscriber() {
          return this.state.assetTopicKit.subscriber;
        },
        /** @deprecated use getPublicTopics */
        getMetrics() {
          return this.state.metricsTopicKit.subscriber;
        },
        getQuotes() {
          const ephemera = collateralEphemera(this.state.collateralBrand);
          return ephemera.storedQuotesNotifier;
        },
        getCompoundedInterest() {
          return this.state.compoundedInterest;
        },
        getPublicTopics() {
          const { assetTopicKit, metricsTopicKit } = this.state;
          return harden({
            asset: makeRecorderTopic(
              'State of the assets managed',
              assetTopicKit,
            ),
            metrics: makeRecorderTopic(
              'Vault Factory metrics',
              metricsTopicKit,
            ),
          });
        },
      },

      // Some of these could go in closures but are kept on a facet anticipating future durability options.
      helper: {
        /**
         * Start non-durable processes (or restart if needed after vat restart)
         */
        start() {
          const { state, facets } = this;
          trace(state.collateralBrand, 'helper.start()', state.vaultCounter);
          const {
            collateralBrand,
            collateralUnit,
            debtBrand,
            storageNode,
            unsettledVaults,
          } = state;

          const ephemera = collateralEphemera(collateralBrand);
          ephemera.prioritizedVaults = makePrioritizedVaults(unsettledVaults);

          trace('helper.start() making periodNotifier');
          const periodNotifier = E(timerService).makeNotifier(
            0n,
            factoryPowers
              .getGovernedParams(collateralBrand)
              .getChargingPeriod(),
          );

          trace('helper.start() starting observe periodNotifier');
          void observeNotifier(periodNotifier, {
            updateState: updateTime =>
              facets.helper
                .chargeAllVaults(updateTime)
                .catch(e =>
                  console.error('🚨 vaultManager failed to charge interest', e),
                ),
            fail: reason => {
              zcf.shutdownWithFailure(
                assert.error(X`Unable to continue without a timer: ${reason}`),
              );
            },
            finish: done => {
              zcf.shutdownWithFailure(
                assert.error(X`Unable to continue without a timer: ${done}`),
              );
            },
          });

          trace('helper.start() making quoteNotifier from', priceAuthority);
          const quoteNotifier = E(priceAuthority).makeQuoteNotifier(
            collateralUnit,
            debtBrand,
          );
          ephemera.storedQuotesNotifier = makeStoredNotifier(
            quoteNotifier,
            E(storageNode).makeChildNode('quotes'),
            marshaller,
          );
          trace('helper.start() awaiting observe storedQuotesNotifier');
          // NB: upon restart, there may not be a price for a while. If manager
          // operations are permitted, ones the depend on price information will
          // throw. See https://github.com/Agoric/agoric-sdk/issues/4317
          void observeNotifier(quoteNotifier, {
            updateState(value) {
              trace('vaultManager got new collateral quote', value);
              ephemera.storedCollateralQuote = value;
            },
            fail(reason) {
              console.error('quoteNotifier failed to iterate', reason);
            },
          });
          trace('helper.start() done');
        },
        /**
         * @param {Timestamp} updateTime
         */
        async chargeAllVaults(updateTime) {
          const { state, facets } = this;
          const { collateralBrand, debtMint, poolIncrementSeat } = state;
          trace(collateralBrand, 'chargeAllVaults', {
            updateTime,
          });

          const interestRate = factoryPowers
            .getGovernedParams(collateralBrand)
            .getInterestRate();

          // Update state with the results of charging interest

          const changes = chargeInterest(
            {
              mint: debtMint,
              mintAndTransferWithFee: factoryPowers.mintAndTransfer,
              poolIncrementSeat,
              seatAllocationKeyword: 'Minted',
            },
            {
              interestRate,
              chargingPeriod: factoryPowers
                .getGovernedParams(collateralBrand)
                .getChargingPeriod(),
              recordingPeriod: factoryPowers
                .getGovernedParams(collateralBrand)
                .getRecordingPeriod(),
            },
            {
              latestInterestUpdate: state.latestInterestUpdate,
              compoundedInterest: state.compoundedInterest,
              totalDebt: state.totalDebt,
            },
            updateTime,
          );

          state.compoundedInterest = changes.compoundedInterest;
          state.latestInterestUpdate = changes.latestInterestUpdate;
          state.totalDebt = changes.totalDebt;

          return facets.helper.assetNotify();
        },
        assetNotify() {
          const { state } = this;
          const { collateralBrand, assetTopicKit } = state;
          const interestRate = factoryPowers
            .getGovernedParams(collateralBrand)
            .getInterestRate();
          /** @type {AssetState} */
          const payload = harden({
            compoundedInterest: state.compoundedInterest,
            interestRate,
            latestInterestUpdate: state.latestInterestUpdate,
          });
          return assetTopicKit.recorder.write(payload);
        },
        burnToCoverDebt(debt, proceeds, seat) {
          const { state } = this;

          if (AmountMath.isGTE(proceeds, debt)) {
            factoryPowers.burnDebt(debt, seat);
            state.totalDebt = AmountMath.subtract(state.totalDebt, debt);
          } else {
            factoryPowers.burnDebt(proceeds, seat);
            state.totalDebt = AmountMath.subtract(state.totalDebt, proceeds);
          }

          state.totalProceedsReceived = AmountMath.add(
            state.totalProceedsReceived,
            proceeds,
          );
        },
        sendToReserve(penalty, seat, seatKeyword = 'Collateral') {
          const invitation =
            E(reservePublicFacet).makeAddCollateralInvitation();

          // don't wait for response
          void E.when(invitation, invite => {
            const proposal = { give: { Collateral: penalty } };
            void offerTo(
              zcf,
              invite,
              { [seatKeyword]: 'Collateral' },
              proposal,
              seat,
            );
          });
        },
        /** @type {(collatSold: Amount<'nat'>, completed: number, aborted?: number) => void} */
        markCollateralLiquidated(collatSold, completed, aborted = 0) {
          const { state } = this;

          state.totalCollateral = AmountMath.subtract(
            state.totalCollateral,
            collatSold,
          );
          state.numLiquidationsCompleted += completed;
          state.numLiquidationsAborted += aborted;
        },
        markLiquidating(debt, collateral) {
          const { state } = this;

          state.liquidatingCollateral = AmountMath.add(
            state.liquidatingCollateral,
            collateral,
          );

          state.liquidatingDebt = AmountMath.add(state.liquidatingDebt, debt);
        },
        /**
         *
         * @param {Amount<'nat'>} debt
         * @param {Amount<'nat'>} collateral
         * @param {{ overage: Amount<'nat'>, shortfall: Amount<'nat'> }} accounting
         */
        markDoneLiquidating(debt, collateral, accounting) {
          const { state } = this;

          // update liquidation state

          state.liquidatingCollateral = AmountMath.subtract(
            state.liquidatingCollateral,
            collateral,
          );
          state.liquidatingDebt = AmountMath.subtract(
            state.liquidatingDebt,
            debt,
          );

          // record shortfall and proceeds

          const { overage, shortfall } = accounting;
          // cumulative values
          state.totalOverageReceived = AmountMath.add(
            state.totalOverageReceived,
            overage,
          );
          state.totalShortfallReceived = AmountMath.add(
            state.totalShortfallReceived,
            shortfall,
          );
          state.totalDebt = AmountMath.subtract(state.totalDebt, shortfall);

          E.when(
            factoryPowers.getShortfallReporter(),
            reporter => E(reporter).increaseLiquidationShortfall(shortfall),
            err =>
              console.error(
                '🛠️ getShortfallReporter() failed during liquidation; repair by updating governance',
                err,
              ),
          ).catch(err => {
            console.error('🚨 failed to report liquidation shortfall', err);
          });
        },
        /**
         * If interest was charged between liquidating and liquidated, erase it.
         *
         * @param {Amount<'nat'>} priorDebtAmount
         * @param {Amount<'nat'>} currentDebt
         */
        subtractPhantomInterest(priorDebtAmount, currentDebt) {
          const { state } = this;
          const difference = AmountMath.subtract(currentDebt, priorDebtAmount);

          if (!AmountMath.isEmpty(difference)) {
            state.totalDebt = AmountMath.subtract(state.totalDebt, difference);
          }
        },
        markRestoreDebt(debt) {
          const { state } = this;

          state.totalDebt = AmountMath.add(state.totalDebt, debt);
        },
        writeMetrics() {
          const { state } = this;
          const { collateralBrand, retainedCollateralSeat, metricsTopicKit } =
            state;
          const { prioritizedVaults } = collateralEphemera(collateralBrand);

          const retainedCollateral =
            retainedCollateralSeat.getCurrentAllocation()?.Collateral ??
            AmountMath.makeEmpty(collateralBrand, 'nat');

          /** @type {MetricsNotification} */
          const payload = harden({
            numActiveVaults: prioritizedVaults.getCount(),
            numLiquidatingVaults: state.liquidatingVaults.getSize(),
            totalCollateral: state.totalCollateral,
            totalDebt: state.totalDebt,
            retainedCollateral,

            numLiquidationsCompleted: state.numLiquidationsCompleted,
            numLiquidationsAborted: state.numLiquidationsAborted,
            totalCollateralSold: state.totalCollateralSold,
            liquidatingCollateral: state.liquidatingCollateral,
            liquidatingDebt: state.liquidatingDebt,
            totalOverageReceived: state.totalOverageReceived,
            totalProceedsReceived: state.totalProceedsReceived,
            totalShortfallReceived: state.totalShortfallReceived,
          });

          return E(metricsTopicKit.recorder).write(payload);
        },

        /**
         * @param {AmountKeywordRecord} proceeds
         * @param {Amount<'nat'>} totalDebt
         * @param {{ quoteAmount: any; quotePayment?: ERef<Payment<"set">>; }} oraclePriceAtStart
         * @param {ZCFSeat} liqSeat
         * @param {MapStore<Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}>} vaultData
         * @param {Amount<'nat'>} totalCollateral
         */
        distributeProceeds(
          proceeds,
          totalDebt,
          oraclePriceAtStart,
          liqSeat,
          vaultData,
          totalCollateral,
        ) {
          trace('distributeProceeds', {
            proceeds,
            totalDebt,
            totalCollateral,
          });
          const { state, facets } = this;
          const { collateralBrand, debtBrand, liquidatingVaults } = this.state;

          const { Collateral: collateralProceeds } = proceeds;
          /** @type {Amount<'nat'>} */
          const collateralSold = AmountMath.subtract(
            totalCollateral,
            collateralProceeds,
          );
          state.totalCollateralSold = AmountMath.add(
            state.totalCollateralSold,
            collateralSold,
          );

          const mintedProceeds =
            proceeds.Minted || AmountMath.makeEmpty(debtBrand);
          const accounting = liquidationResults(totalDebt, mintedProceeds);
          // Try to repro
          const price = makeRatioFromAmounts(mintedProceeds, collateralSold);

          /** @type {Array<Vault>} */
          const vaultsToLiquidate = [];
          const markAllVaultsLiquidated = () => {
            for (const vault of vaultsToLiquidate) {
              vault.liquidated();
              liquidatingVaults.delete(vault);
            }
          };

          const penaltyRate = facets.self
            .getGovernedParams()
            .getLiquidationPenalty();
          // charged in collateral
          const totalPenalty = ceilMultiplyBy(
            totalDebt,
            multiplyRatios(
              penaltyRate,
              quoteAsRatio(oraclePriceAtStart.quoteAmount.value[0]),
            ),
          );

          // Liquidation.md describes how to process liquidation proceeds
          const bestToWorst = [...vaultData.entries()].reverse();
          if (AmountMath.isEmpty(accounting.shortfall)) {
            // Flow #1: no shortfall

            const collateralToDistribute = AmountMath.isGTE(
              collateralProceeds,
              totalPenalty,
            );

            const distributableCollateral = collateralToDistribute
              ? AmountMath.subtract(collateralProceeds, totalPenalty)
              : AmountMath.makeEmptyFromAmount(collateralProceeds);

            facets.helper.burnToCoverDebt(totalDebt, mintedProceeds, liqSeat);
            facets.helper.sendToReserve(accounting.overage, liqSeat, 'Minted');

            // return remaining funds to vaults before closing

            /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
            const transfers = [];
            let leftToStage = distributableCollateral;

            // iterate from best to worst, returning collateral until it has
            // been exhausted. Vaults after that get nothing.
            for (const [vault, amounts] of bestToWorst) {
              const { collateralAmount: vCollat, debtAmount } = amounts;
              facets.helper.subtractPhantomInterest(
                debtAmount,
                vault.getCurrentDebt(),
              );
              const debtInCollateral = ceilDivideBy(debtAmount, price);
              const collatPostDebt = AmountMath.isGTE(vCollat, debtInCollateral)
                ? AmountMath.subtract(vCollat, debtInCollateral)
                : AmountMath.makeEmptyFromAmount(vCollat);
              if (!AmountMath.isEmpty(leftToStage)) {
                const collat = AmountMath.min(leftToStage, collatPostDebt);
                leftToStage = AmountMath.subtract(leftToStage, collat);
                transfers.push([
                  liqSeat,
                  vault.getVaultSeat(),
                  { Collateral: collat },
                ]);
              }
              vaultsToLiquidate.push(vault);
            }
            if (transfers.length > 0) {
              atomicRearrange(zcf, harden(transfers));
            }

            const forReserve = collateralToDistribute
              ? AmountMath.add(leftToStage, totalPenalty)
              : collateralProceeds;
            facets.helper.sendToReserve(forReserve, liqSeat);

            facets.helper.markCollateralLiquidated(
              totalCollateral,
              vaultData.getSize(),
            );

            facets.helper.markDoneLiquidating(
              totalDebt,
              totalCollateral,
              accounting,
            );
          } else if (AmountMath.isEmpty(collateralProceeds)) {
            // Flow #2a

            // charge penalty if proceeds are sufficient
            const penaltyInMinted = ceilMultiplyBy(totalDebt, penaltyRate);
            const recoveredDebt = AmountMath.min(
              AmountMath.add(totalDebt, penaltyInMinted),
              mintedProceeds,
            );

            facets.helper.burnToCoverDebt(
              recoveredDebt,
              mintedProceeds,
              liqSeat,
            );

            const coverDebt = AmountMath.isGTE(mintedProceeds, recoveredDebt);
            const distributable = coverDebt
              ? AmountMath.subtract(mintedProceeds, recoveredDebt)
              : AmountMath.makeEmptyFromAmount(mintedProceeds);
            let mintedRemaining = distributable;

            const vaultPortion = makeRatioFromAmounts(
              distributable,
              totalCollateral,
            );
            /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
            const transfers = [];

            // iterate from best to worst returning remaining funds to vaults
            /** @type {Array<[Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}]>} */
            for (const [vault, balance] of bestToWorst) {
              // from best to worst, return minted above penalty if any remains
              const { collateralAmount: vCollat, debtAmount } = balance;
              const vaultShare = floorMultiplyBy(vCollat, vaultPortion);
              facets.helper.subtractPhantomInterest(
                debtAmount,
                vault.getCurrentDebt(),
              );

              if (!AmountMath.isEmpty(mintedRemaining)) {
                const mintedToReturn = AmountMath.isGTE(
                  mintedRemaining,
                  vaultShare,
                )
                  ? vaultShare
                  : mintedRemaining;
                mintedRemaining = AmountMath.subtract(
                  mintedRemaining,
                  mintedToReturn,
                );
                const seat = vault.getVaultSeat();
                transfers.push([liqSeat, seat, { Minted: mintedToReturn }]);
              }
              vaultsToLiquidate.push(vault);
            }

            if (transfers.length > 0) {
              atomicRearrange(zcf, harden(transfers));
            }

            facets.helper.markCollateralLiquidated(
              totalCollateral,
              vaultData.getSize(),
            );

            facets.helper.markDoneLiquidating(
              totalDebt,
              totalCollateral,
              accounting,
            );
          } else {
            // Flow #2b: There's unsold collateral; some vaults may be revived.

            facets.helper.burnToCoverDebt(totalDebt, mintedProceeds, liqSeat);
            facets.helper.sendToReserve(accounting.overage, liqSeat, 'Minted');

            // reconstitute vaults until collateral is insufficient
            let reconstituteVaults = AmountMath.isGTE(
              collateralProceeds,
              totalPenalty,
            );

            // charge penalty if proceeds are sufficient
            const distributableCollateral = reconstituteVaults
              ? AmountMath.subtract(collateralProceeds, totalPenalty)
              : AmountMath.makeEmptyFromAmount(collateralProceeds);

            let collatRemaining = distributableCollateral;
            /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
            const transfers = [];
            let liquidated = 0;
            /** @type {Array<Vault>} */
            const vaultsToReinstate = [];
            const reinstateAll = () => {
              const { prioritizedVaults } = collateralEphemera(collateralBrand);
              for (const vault of vaultsToReinstate) {
                const vaultId = vault.abortLiquidation();
                prioritizedVaults.addVault(vaultId, vault);
                liquidatingVaults.delete(vault);
              }
            };

            let collateralReduction = AmountMath.makeEmpty(collateralBrand);
            let shortfallToReserve = accounting.shortfall;
            const debtPortion = makeRatioFromAmounts(totalPenalty, totalDebt);
            const reduceCollateral = amount =>
              (collateralReduction = AmountMath.add(
                collateralReduction,
                amount,
              ));

            // iterate from best to worst attempting to reconstitute, by
            // returning remaining funds to vaults
            /** @type {Array<[Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}]>} */
            for (const [vault, balance] of bestToWorst) {
              const { collateralAmount: vCollat, debtAmount } = balance;
              const vaultPenalty = ceilMultiplyBy(debtAmount, penaltyRate);
              const collatPostPenalty = AmountMath.subtract(
                vCollat,
                ceilMultiplyBy(vaultPenalty, debtPortion),
              );
              const vaultDebt = floorMultiplyBy(debtAmount, debtPortion);
              if (
                reconstituteVaults &&
                !AmountMath.isEmpty(collatPostPenalty) &&
                AmountMath.isGTE(collatRemaining, collatPostPenalty) &&
                AmountMath.isGTE(totalDebt, debtAmount)
              ) {
                collatRemaining = AmountMath.subtract(
                  collatRemaining,
                  collatPostPenalty,
                );
                shortfallToReserve = AmountMath.isGTE(
                  shortfallToReserve,
                  debtAmount,
                )
                  ? AmountMath.subtract(shortfallToReserve, debtAmount)
                  : AmountMath.makeEmptyFromAmount(shortfallToReserve);
                const seat = vault.getVaultSeat();
                // must reinstate after atomicRearrange(), so we record them.
                vaultsToReinstate.push(vault);
                reduceCollateral(vaultDebt);
                transfers.push([
                  liqSeat,
                  seat,
                  { Collateral: collatPostPenalty },
                ]);
              } else {
                reconstituteVaults = false;
                liquidated += 1;
                facets.helper.subtractPhantomInterest(
                  debtAmount,
                  vault.getCurrentDebt(),
                );

                reduceCollateral(vCollat);
                vaultsToLiquidate.push(vault);
              }
            }

            // Putting all the rearrangements after the loop ensures that errors
            // in the calculations don't result in paying pack some vaults and
            // leaving others hanging.
            if (transfers.length > 0) {
              atomicRearrange(zcf, harden(transfers));
            }
            reinstateAll();

            facets.helper.markCollateralLiquidated(
              collateralReduction,
              liquidated,
              transfers.length,
            );

            facets.helper.sendToReserve(collatRemaining, liqSeat);
            facets.helper.markDoneLiquidating(totalDebt, totalCollateral, {
              ...accounting,
              shortfall: shortfallToReserve,
            });
          }
          markAllVaultsLiquidated();
          return facets.helper.writeMetrics();
        },
      },

      manager: {
        getGovernedParams() {
          const { collateralBrand } = this.state;
          return factoryPowers.getGovernedParams(collateralBrand);
        },

        /**
         * Look up the most recent price authority price to determine the max
         * debt this manager config will allow for the collateral.
         *
         * @param {Amount<'nat'>} collateralAmount
         */
        maxDebtFor(collateralAmount) {
          const { collateralBrand } = this.state;
          const { storedCollateralQuote } = collateralEphemera(collateralBrand);
          if (!storedCollateralQuote)
            throw Fail`maxDebtFor called before a collateral quote was available`;
          // use the lower price to prevent vault adjustments that put them imminently underwater
          const collateralPrice = minimumPrice(
            storedCollateralQuote,
            this.state.lockedQuote,
          );
          const collatlVal = ceilMultiplyBy(collateralAmount, collateralPrice);
          const minimumCollateralization = calculateMinimumCollateralization(
            factoryPowers
              .getGovernedParams(collateralBrand)
              .getLiquidationMargin(),
            factoryPowers
              .getGovernedParams(collateralBrand)
              .getLiquidationPadding(),
          );
          // floorDivide because we want the debt ceiling lower
          return floorDivideBy(collatlVal, minimumCollateralization);
        },
        /** @type {MintAndTransfer} */
        mintAndTransfer(mintReceiver, toMint, fee, transfers) {
          const { state } = this;
          const { collateralBrand, totalDebt } = state;

          checkDebtLimit(
            factoryPowers.getGovernedParams(collateralBrand).getDebtLimit(),
            totalDebt,
            toMint,
          );
          factoryPowers.mintAndTransfer(mintReceiver, toMint, fee, transfers);
        },
        /**
         * @param {Amount<'nat'>} toBurn
         * @param {ZCFSeat} seat
         */
        burn(toBurn, seat) {
          const { state } = this;
          const { collateralBrand } = this.state;

          trace(collateralBrand, 'burn', {
            toBurn,
            totalDebt: state.totalDebt,
          });
          factoryPowers.burnDebt(toBurn, seat);
        },
        getAssetSubscriber() {
          return this.state.assetTopicKit.subscriber;
        },
        getCollateralBrand() {
          const { collateralBrand } = this.state;
          return collateralBrand;
        },
        getDebtBrand() {
          const { debtBrand } = this.state;
          return debtBrand;
        },
        /**
         * Prepend with an identifier of this vault manager
         *
         * @param {string} base
         */
        scopeDescription(base) {
          const { descriptionScope } = this.state;
          return `${descriptionScope}: ${base}`;
        },
        /**
         * coefficient on existing debt to calculate new debt
         */
        getCompoundedInterest() {
          return this.state.compoundedInterest;
        },
        /**
         * Called by a vault when its balances change.
         *
         * @param {NormalizedDebt} oldDebtNormalized
         * @param {Amount<'nat'>} oldCollateral
         * @param {VaultId} vaultId
         * @param {import('./vault.js').VaultPhase} vaultPhase at the end of whatever change updated balances
         * @param {Vault} vault
         * @returns {void}
         */
        handleBalanceChange(
          oldDebtNormalized,
          oldCollateral,
          vaultId,
          vaultPhase,
          vault,
        ) {
          const { state, facets } = this;

          // the manager holds only vaults that can accrue interest or be liquidated;
          // i.e. vaults that have debt. The one exception is at the outset when
          // a vault has been added to the manager but not yet accounted for.
          const settled =
            AmountMath.isEmpty(oldDebtNormalized) &&
            vaultPhase !== Phase.ACTIVE;

          trace('handleBalanceChange', {
            oldDebtNormalized,
            oldCollateral,
            vaultId,
            vaultPhase,
            vault,
            settled,
          });

          const { prioritizedVaults } = collateralEphemera(
            state.collateralBrand,
          );
          if (settled) {
            assert(
              !prioritizedVaults.hasVaultByAttributes(
                oldDebtNormalized,
                oldCollateral,
                vaultId,
              ),
              'Settled vaults must not be retained in storage',
            );
            return;
          }

          const isNew = AmountMath.isEmpty(oldDebtNormalized);
          trace(state.collateralBrand, { isNew });
          if (!isNew) {
            // its position in the queue is no longer valid

            const vaultInStore = prioritizedVaults.removeVaultByAttributes(
              oldDebtNormalized,
              oldCollateral,
              vaultId,
            );
            assert(
              vault === vaultInStore,
              'handleBalanceChange for two different vaults',
            );
            trace('removed', vault, vaultId);
          }

          // replace in queue, but only if it can accrue interest or be liquidated (i.e. has debt).
          // getCurrentDebt() would also work (0x = 0) but require more computation.
          if (!AmountMath.isEmpty(vault.getNormalizedDebt())) {
            prioritizedVaults.addVault(vaultId, vault);
          }

          // total += vault's delta (post — pre)
          state.totalCollateral = AmountMath.subtract(
            AmountMath.add(state.totalCollateral, vault.getCollateralAmount()),
            oldCollateral,
          );
          state.totalDebt = AmountMath.subtract(
            AmountMath.add(state.totalDebt, vault.getCurrentDebt()),
            oldDebtNormalized,
          );
          void facets.helper.writeMetrics();
        },
      },
      self: {
        getGovernedParams() {
          const { collateralBrand } = this.state;
          return factoryPowers.getGovernedParams(collateralBrand);
        },

        /**
         * @param {ZCFSeat} seat
         */
        async makeVaultKit(seat) {
          const {
            state,
            facets: { manager },
          } = this;
          trace(state.collateralBrand, 'makeVaultKit');
          const { storageNode } = this.state;
          assert(marshaller, 'makeVaultKit missing marshaller');
          assert(storageNode, 'makeVaultKit missing storageNode');
          assert(zcf, 'makeVaultKit missing zcf');

          const vaultId = String(state.vaultCounter);

          // must be a presence to be stored in vault state
          const vaultStorageNode = await E(
            E(storageNode).makeChildNode(`vaults`),
          ).makeChildNode(`vault${vaultId}`);

          const { self: vault } = makeVault(manager, vaultId, vaultStorageNode);
          trace(state.collateralBrand, 'makeVaultKit made vault', vault);

          try {
            // TODO `await` is allowed until the above ordering is fixed
            // eslint-disable-next-line @jessie.js/no-nested-await
            const vaultKit = await vault.initVaultKit(seat, vaultStorageNode);
            // initVaultKit calls back to handleBalanceChange() which will add the
            // vault to prioritizedVaults

            // initVaultKit doesn't write to the storage node until it's returning
            // so if it returned then we know the node key was consumed
            state.vaultCounter += 1;

            return vaultKit;
          } catch (err) {
            console.error(
              'attempting recovery after initVaultKit failure',
              err,
            );
            // ??? do we still need this cleanup? it won't get into the store unless it has collateral,
            // which should qualify it to be in the store. If we drop this catch then the nested await
            // for `vault.initVaultKit()` goes away.

            // remove it from the store if it got in
            /** @type {NormalizedDebt} */
            // @ts-expect-error cast
            const normalizedDebt = AmountMath.makeEmpty(state.debtBrand);
            const collateralPre = seat.getCurrentAllocation().Collateral;
            const { prioritizedVaults } = collateralEphemera(
              state.collateralBrand,
            );
            try {
              prioritizedVaults.removeVaultByAttributes(
                normalizedDebt,
                collateralPre,
                vaultId,
              );
              console.warn(
                'removed vault',
                vaultId,
                'after initVaultKit failure',
              );
            } catch {
              console.info(
                'vault',
                vaultId,
                'never stored during initVaultKit failure',
              );
            }
            throw err;
          } finally {
            if (!seat.hasExited()) {
              seat.exit();
            }
          }
        },

        getCollateralQuote() {
          const { storedCollateralQuote } = collateralEphemera(
            this.state.collateralBrand,
          );
          if (!storedCollateralQuote)
            throw Fail`getCollateralQuote called before a collateral quote was available`;
          return storedCollateralQuote;
        },

        getPublicFacet() {
          return this.facets.collateral;
        },

        lockOraclePrices() {
          const { state } = this;
          const { storedCollateralQuote } = collateralEphemera(
            state.collateralBrand,
          );
          if (!storedCollateralQuote)
            throw Fail`lockOraclePrices called before a collateral quote was available`;
          trace(
            `lockPrice`,
            getAmountIn(storedCollateralQuote),
            getAmountOut(storedCollateralQuote),
          );

          state.lockedQuote = storedCollateralQuote;
          return storedCollateralQuote;
        },
        /**
         * @param {AuctioneerPublicFacet} auctionPF
         */
        async liquidateVaults(auctionPF) {
          const { state, facets } = this;
          const { self, helper } = facets;
          const {
            collateralBrand,
            compoundedInterest,
            debtBrand,
            liquidatingVaults,
            lockedQuote,
          } = state;
          trace(collateralBrand, 'considering liquidation');

          const { prioritizedVaults } = collateralEphemera(collateralBrand);
          assert(factoryPowers && prioritizedVaults && zcf);
          lockedQuote ||
            Fail`Must have locked a quote before liquidating vaults.`;
          assert(lockedQuote); // redundant with previous line

          const liqMargin = self.getGovernedParams().getLiquidationMargin();

          const { totalDebt, totalCollateral, vaultData, liqSeat } =
            getLiquidatableVaults(
              zcf,
              {
                quote: lockedQuote,
                interest: compoundedInterest,
                margin: liqMargin,
              },
              prioritizedVaults,
              liquidatingVaults,
              debtBrand,
              collateralBrand,
            );
          // reset lockedQuote after we've used it for the liquidation decision
          state.lockedQuote = undefined;

          if (vaultData.getSize() === 0) {
            return;
          }
          trace(
            ' Found vaults to liquidate',
            liquidatingVaults.getSize(),
            totalCollateral,
          );

          helper.markLiquidating(totalDebt, totalCollateral);
          void helper.writeMetrics();

          const { userSeatPromise, deposited } = await E.when(
            E(auctionPF).makeDepositInvitation(),
            depositInvitation =>
              offerTo(
                zcf,
                depositInvitation,
                harden({ Minted: 'Bid' }),
                harden({ give: { Collateral: totalCollateral } }),
                liqSeat,
                liqSeat,
                { goal: totalDebt },
              ),
          );

          // This is expected to wait for the duration of the auction, which
          // is controlled by the auction parameters startFrequency, clockStep,
          // and the difference between startingRate and lowestRate.
          const [proceeds] = await Promise.all([deposited, userSeatPromise]);

          const { storedCollateralQuote } = collateralEphemera(
            this.state.collateralBrand,
          );

          trace(`LiqV after long wait`, proceeds);
          return helper.distributeProceeds(
            proceeds,
            totalDebt,
            storedCollateralQuote,
            liqSeat,
            vaultData,
            totalCollateral,
          );
        },
      },
    },

    {
      finish: ({ state, facets: { helper } }) => {
        helper.start();
        void state.assetTopicKit.recorder.write(
          harden({
            compoundedInterest: state.compoundedInterest,
            interestRate: factoryPowers
              .getGovernedParams(state.collateralBrand)
              .getInterestRate(),
            latestInterestUpdate: state.latestInterestUpdate,
          }),
        );

        // push initial state of metrics
        void helper.writeMetrics();
      },
    },
  );

  /** @param {Omit<Parameters<typeof makeVaultManagerKitInternal>[0], 'metricsStorageNode'>} externalParams */
  const makeVaultManagerKit = async externalParams => {
    const metricsStorageNode = await E(
      externalParams.storageNode,
    ).makeChildNode('metrics');
    return makeVaultManagerKitInternal({
      ...externalParams,
      metricsStorageNode,
    });
  };
  return makeVaultManagerKit;
};

/**
 * @typedef {Awaited<ReturnType<ReturnType<typeof prepareVaultManagerKit>>>} VaultManagerKit
 */
/**
 * @typedef {VaultManagerKit['self']} VaultManager
 * Each VaultManager manages a single collateral type.
 *
 * It manages some number of outstanding debt positions, each called a Vault,
 * for which the collateral is provided in exchange for borrowed Minted.
 */
/** @typedef {VaultManagerKit['collateral']} CollateralManager */

/**
 * Support restarting kits from baggage and mutating the array holding them
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const provideAndStartVaultManagerKits = baggage => {
  trace('provideAndStartVaultManagerKits start');
  const key = 'vaultManagerKits';

  const noKits = /** @type {VaultManagerKit[]} */ (harden([]));

  for (const kit of provide(baggage, key, () => noKits)) {
    kit.helper.start();
  }

  trace('provideAndStartVaultManagerKits returning');
  return {
    /** @type {(kit: VaultManagerKit) => void} */
    add: kit => {
      appendToStoredArray(baggage, key, kit);
    },
    /** @type {(index: number) => VaultManagerKit} */
    get: index => {
      const kits = baggage.get(key);
      index < kits.length || Fail`no VaultManagerKit at index ${index}`;
      return kits[index];
    },
    length: () => baggage.get(key).length,
  };
};
harden(provideAndStartVaultManagerKits);
