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
import {
  makePublicTopic,
  makeStoredNotifier,
  observeNotifier,
  pipeTopicToStorage,
  prepareDurablePublishKit,
  SubscriberShape,
  TopicsRecordShape,
} from '@agoric/notifier';
import {
  M,
  prepareExoClassKit,
  provideDurableMapStore,
  provideDurableSetStore,
  makeScalarMapStore,
} from '@agoric/vat-data';
import { TransferPartShape } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import {
  atomicRearrange,
  ceilMultiplyBy,
  floorMultiplyBy,
  getAmountIn,
  getAmountOut,
  makeRatio,
  makeRatioFromAmounts,
  multiplyRatios,
  offerTo,
  provideEmptySeat,
} from '@agoric/zoe/src/contractSupport/index.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/eventual-send';
import { AuctionPFShape } from '../auction/auctioneer.js';
import { checkDebtLimit, makeNatAmountShape } from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { getLiquidatableVaults, liquidationResults } from './liquidation.js';
import { maxDebtForVault } from './math.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { Phase, prepareVault } from './vault.js';

const { details: X, Fail } = assert;

const trace = makeTracer('VM', false);

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
 *  liquidatorInstance?: Instance,
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
 *  getLoanFee: () => Ratio,
 * }} GovernedParamGetters
 */

/**
 * @typedef {{
 *   compoundedInterest: Ratio,
 *   latestInterestUpdate: Timestamp,
 *   liquidator?: Liquidator
 *   numLiquidationsCompleted: number,
 *   numLiquidationsReconstituted: number,
 *   totalCollateral: Amount<'nat'>,
 *   totalCollateralSold: Amount<'nat'>,
 *   totalDebt: Amount<'nat'>,
 *   liquidatingCollateral: Amount<'nat'>,
 *   liquidatingDebt: Amount<'nat'>,
 *   totalOverageReceived: Amount<'nat'>,
 *   totalProceedsReceived: Amount<'nat'>,
 *   totalShortfallReceived: Amount<'nat'>,
 *   vaultCounter: number,
 *   lockedQuote: PriceDescription | undefined,
 * }} MutableState
 */

/** @param {Pick<PriceDescription, 'amountIn' | 'amountOut'>} quoteAmount */
const quoteAsRatio = quoteAmount =>
  makeRatioFromAmounts(quoteAmount.amountIn, quoteAmount.amountOut);

/**
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {ERef<Marshaller>} marshaller
 * @param {Readonly<{
 *   debtMint: ZCFMint<'nat'>,
 *   collateralBrand: Brand<'nat'>,
 *   collateralUnit: Amount<'nat'>,
 *   factoryPowers: import('./vaultDirector.js').FactoryPowersFacet,
 *   descriptionScope: string,
 *   startTimeStamp: Timestamp,
 *   storageNode: ERef<StorageNode>,
 * }>} unique per singleton
 */
export const prepareVaultManagerKit = (
  baggage,
  zcf,
  marshaller,
  {
    debtMint,
    collateralBrand,
    collateralUnit,
    descriptionScope,
    factoryPowers,
    startTimeStamp,
    storageNode,
  },
) => {
  assert(
    storageNode && marshaller,
    'VaultManager missing storageNode or marshaller',
  );

  const { priceAuthority, timerService, reservePublicFacet } = zcf.getTerms();

  const makeVault = prepareVault(baggage, marshaller, zcf);
  const makeVaultManagerPublishKit = prepareDurablePublishKit(
    baggage,
    'Vault Manager publish kit',
  );
  const periodNotifier = E(timerService).makeNotifier(
    0n,
    factoryPowers.getGovernedParams().getChargingPeriod(),
  );

  /** @type {PublishKit<AssetState>} */
  const { publisher: assetPublisher, subscriber: assetSubscriber } =
    makeVaultManagerPublishKit();
  pipeTopicToStorage(assetSubscriber, storageNode, marshaller);

  /** @type {MapStore<string, Vault>} */
  const unsettledVaults = provideDurableMapStore(baggage, 'orderedVaultStore');

  const debtBrand = debtMint.getIssuerRecord().brand;
  const zeroCollateral = AmountMath.makeEmpty(collateralBrand, 'nat');
  const zeroDebt = AmountMath.makeEmpty(debtBrand, 'nat');

  const metricsNode = E(storageNode).makeChildNode('metrics');
  const { publisher: metricsPublisher, subscriber: metricsSubscriber } =
    makeVaultManagerPublishKit();
  pipeTopicToStorage(metricsSubscriber, metricsNode, marshaller);

  const storedQuotesNotifier = makeStoredNotifier(
    E(priceAuthority).makeQuoteNotifier(collateralUnit, debtBrand),
    E(storageNode).makeChildNode('quotes'),
    marshaller,
  );

  const prioritizedVaults = makePrioritizedVaults(unsettledVaults);

  /**
   * Vaults that have been sent for liquidation. When we get proceeds (or lack
   * thereof) back from the liquidator, we will allocate them among the vaults.
   *
   * @type {SetStore<Vault>}
   */
  const liquidatingVaults = provideDurableSetStore(
    baggage,
    'liquidatingVaults',
  );

  const poolIncrementSeat = provideEmptySeat(zcf, baggage, 'pool increment');

  // TODO(#7074) not used while liquidation is disabled. Reinstate with #7074
  const retainedCollateralSeat = provideEmptySeat(
    zcf,
    baggage,
    'retained collateral',
  );

  const topics = harden({
    asset: makePublicTopic(
      'State of the assets managed',
      assetSubscriber,
      storageNode,
    ),
    metrics: makePublicTopic(
      'Vault Factory metrics',
      metricsSubscriber,
      metricsNode,
    ),
  });

  /**
   * This class is a singleton kind so initState will be called only once per prepare.
   */
  const initState = () => {
    /** @type {MutableState} */
    return {
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
    };
  };

  // TODO find a way to not have to indent a level deeper than defineDurableExoClassKit does
  return prepareExoClassKit(
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
        maxDebtFor: M.call(AmountShape).returns(M.promise()),
        mintAndTransfer: M.call(
          SeatShape,
          AmountShape,
          AmountShape,
          M.arrayOf(TransferPartShape),
        ).returns(),
        burnAndRecord: M.call(AmountShape, SeatShape).returns(),
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
        getCollateralQuote: M.call().returns(M.promise()),
        getPublicFacet: M.call().returns(M.remotable('publicFacet')),
        lockOraclePrices: M.call().returns(M.promise()),
        liquidateVaults: M.call(AuctionPFShape).returns(M.promise()),
      }),
    },
    initState,
    {
      collateral: {
        makeVaultInvitation() {
          const { facets } = this;
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
          return assetSubscriber;
        },
        /** @deprecated use getPublicTopics */
        getMetrics() {
          return metricsSubscriber;
        },
        getQuotes() {
          return storedQuotesNotifier;
        },
        getCompoundedInterest() {
          return this.state.compoundedInterest;
        },
        getPublicTopics() {
          return topics;
        },
      },

      // Some of these could go in closures but are kept on a facet anticipating future durability options.
      helper: {
        /**
         * @param {Timestamp} updateTime
         */
        async chargeAllVaults(updateTime) {
          const { state, facets } = this;
          trace('chargeAllVaults', collateralBrand, {
            updateTime,
          });

          const interestRate = factoryPowers
            .getGovernedParams()
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
                .getGovernedParams()
                .getChargingPeriod(),
              recordingPeriod: factoryPowers
                .getGovernedParams()
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

          facets.helper.assetNotify();
        },

        assetNotify() {
          const { state } = this;
          const interestRate = factoryPowers
            .getGovernedParams()
            .getInterestRate();
          /** @type {AssetState} */
          const payload = harden({
            compoundedInterest: state.compoundedInterest,
            interestRate,
            latestInterestUpdate: state.latestInterestUpdate,
            // NB: the liquidator is determined by governance but the resulting
            // instance is a concern of the manager. The param manager knows only
            // about the installation and terms of the liqudation contract. We could
            // have another notifier for state downstream of governance changes, but
            // that doesn't seem to be cost-effective.
            liquidatorInstance: state.liquidatorInstance,
          });
          assetPublisher.publish(payload);
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

        /** @type {(accounting: { overage: Amount<'nat'>, shortfall: Amount<'nat'> }) => void} */
        recordShortfallAndProceeds(accounting) {
          const { state } = this;

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

          void E.when(factoryPowers.getShortfallReporter(), reporter =>
            E(reporter).increaseLiquidationShortfall(shortfall),
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
        markDoneLiquidating(debt, collateral) {
          const { state } = this;

          state.liquidatingCollateral = AmountMath.subtract(
            state.liquidatingCollateral,
            collateral,
          );
          state.liquidatingDebt = AmountMath.subtract(
            state.liquidatingDebt,
            debt,
          );
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
        updateMetrics() {
          const { state } = this;

          const retainedCollateral =
            retainedCollateralSeat.getCurrentAllocation()?.Collateral ??
            AmountMath.makeEmpty(collateralBrand, 'nat');

          /** @type {MetricsNotification} */
          const payload = harden({
            numActiveVaults: prioritizedVaults.getCount(),
            numLiquidatingVaults: liquidatingVaults.getSize(),
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

          metricsPublisher.publish(payload);
        },

        distributeProceeds(proceeds, totalDebt, oraclePriceAtStart, liqSeat) {
          const { state, facets } = this;
          const { totalCollateral, vaultData } = state;

          state.totalCollateralSold = AmountMath.add(
            state.totalCollateralSold,
            AmountMath.subtract(totalCollateral, proceeds.Collateral),
          );

          const mintedProceeds =
            proceeds.Minted || AmountMath.makeEmpty(debtBrand);
          const accounting = liquidationResults(totalDebt, mintedProceeds);
          const { Collateral: collateralProceeds } = proceeds;

          /** @type {(v: Vault) => void} */
          const recordLiquidation = v => {
            v.liquidated();
            liquidatingVaults.delete(v);
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
            const collateralPortion = makeRatioFromAmounts(
              distributableCollateral,
              totalCollateral,
            );

            /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
            const transfers = [];
            let collatRemaining = distributableCollateral;

            for (const [vault, amounts] of vaultData.entries()) {
              facets.helper.subtractPhantomInterest(
                amounts.debtAmount,
                vault.getCurrentDebt(),
              );
              if (collateralToDistribute) {
                const collat = floorMultiplyBy(
                  amounts.collateralAmount,
                  collateralPortion,
                );
                collatRemaining = AmountMath.subtract(collatRemaining, collat);
                transfers.push([
                  liqSeat,
                  vault.getVaultSeat(),
                  { Collateral: collat },
                ]);
              }
              recordLiquidation(vault);
            }
            if (transfers.length > 0) {
              atomicRearrange(zcf, harden(transfers));
            }

            const forReserve = collateralToDistribute
              ? AmountMath.add(collatRemaining, totalPenalty)
              : collateralProceeds;
            facets.helper.sendToReserve(forReserve, liqSeat);

            facets.helper.markCollateralLiquidated(
              totalCollateral,
              vaultData.getSize(),
            );

            facets.helper.markDoneLiquidating(totalDebt, totalCollateral);
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
            const bestToWorst = [...vaultData.entries()].reverse();
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
              recordLiquidation(vault);
            }

            if (transfers.length > 0) {
              atomicRearrange(zcf, harden(transfers));
            }

            facets.helper.markCollateralLiquidated(
              totalCollateral,
              vaultData.getSize(),
            );

            facets.helper.markDoneLiquidating(totalDebt, totalCollateral);
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

            const debtPortion = makeRatioFromAmounts(totalPenalty, totalDebt);
            let collatRemaining = distributableCollateral;
            let debtRemaining = totalDebt;
            /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
            const transfers = [];
            let liquidated = 0;
            /** @type {MapStore<string, Vault>} */
            const vaultsToReinstate = makeScalarMapStore();
            let collateralReduction = AmountMath.makeEmpty(collateralBrand);

            const reduceCollateral = amount =>
              (collateralReduction = AmountMath.add(
                collateralReduction,
                amount,
              ));

            // iterate from best to worst attempting to reconstitute, by
            // returning remaining funds to vaults
            /** @type {Array<[Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}]>} */
            const bestToWorst = [...vaultData.entries()].reverse();
            for (const [vault, balance] of bestToWorst) {
              const { collateralAmount: vCollat, debtAmount } = balance;
              const vaultDebt = floorMultiplyBy(debtAmount, debtPortion);
              const collatPostDebt = AmountMath.subtract(vCollat, vaultDebt);
              if (
                reconstituteVaults &&
                AmountMath.isGTE(collatRemaining, collatPostDebt) &&
                AmountMath.isGTE(debtRemaining, debtAmount)
              ) {
                collatRemaining = AmountMath.subtract(
                  collatRemaining,
                  collatPostDebt,
                );
                debtRemaining = AmountMath.subtract(debtRemaining, debtAmount);
                const seat = vault.getVaultSeat();
                const vaultId = vault.abortLiquidation();
                liquidatingVaults.delete(vault);
                // must reinstate after atomicRearrange(), so we record them.
                vaultsToReinstate.init(vaultId, vault);
                reduceCollateral(vaultDebt);
                transfers.push([liqSeat, seat, { Collateral: collatPostDebt }]);
              } else {
                reconstituteVaults = false;
                liquidated += 1;
                facets.helper.subtractPhantomInterest(
                  debtAmount,
                  vault.getCurrentDebt(),
                );

                reduceCollateral(vCollat);
                recordLiquidation(vault);
              }
            }

            // Putting all the rearrangements after the loop ensures that errors
            // in the calculations don't result in paying pack some vaults and
            // leaving others hanging.
            if (transfers.length > 0) {
              atomicRearrange(zcf, harden(transfers));
            }
            for (const [vaultId, vault] of vaultsToReinstate.entries()) {
              prioritizedVaults.addVault(vaultId, vault);
            }

            facets.helper.markCollateralLiquidated(
              collateralReduction,
              liquidated,
              transfers.length,
            );

            facets.helper.markRestoreDebt(
              AmountMath.subtract(totalDebt, debtRemaining),
            );
            facets.helper.sendToReserve(collatRemaining, liqSeat);
          }
          facets.helper.recordShortfallAndProceeds(accounting);
          facets.helper.updateMetrics();
        },
      },

      manager: {
        getGovernedParams() {
          return factoryPowers.getGovernedParams();
        },

        /**
         * Consults a price authority to determine the max debt this manager
         * config will allow for the collateral.
         *
         * @param {Amount<'nat'>} collateralAmount
         */
        async maxDebtFor(collateralAmount) {
          assert(factoryPowers && priceAuthority);
          const quote = await E(priceAuthority).quoteGiven(
            collateralAmount,
            debtBrand,
          );
          return maxDebtForVault(
            quote,
            factoryPowers.getGovernedParams().getLiquidationMargin(),
            factoryPowers.getGovernedParams().getLiquidationPadding(),
          );
        },
        /** @type {MintAndTransfer} */
        mintAndTransfer(mintReceiver, toMint, fee, transfers) {
          const { state } = this;
          const { totalDebt } = state;

          checkDebtLimit(
            factoryPowers.getGovernedParams().getDebtLimit(),
            totalDebt,
            toMint,
          );
          factoryPowers.mintAndTransfer(mintReceiver, toMint, fee, transfers);
          state.totalDebt = AmountMath.add(state.totalDebt, toMint);
        },
        /**
         * @param {Amount<'nat'>} toBurn
         * @param {ZCFSeat} seat
         */
        burnAndRecord(toBurn, seat) {
          const { state } = this;

          trace('burnAndRecord', collateralBrand, {
            toBurn,
            totalDebt: state.totalDebt,
          });
          factoryPowers.burnDebt(toBurn, seat);
          state.totalDebt = AmountMath.subtract(state.totalDebt, toBurn);
        },
        getAssetSubscriber() {
          return assetSubscriber;
        },
        getCollateralBrand() {
          return collateralBrand;
        },
        getDebtBrand() {
          return debtBrand;
        },
        /**
         * Prepend with an identifier of this vault manager
         *
         * @param {string} base
         */
        scopeDescription(base) {
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

          if (settled) {
            assert(
              !prioritizedVaults.hasVaultByAttributes(
                oldDebtNormalized,
                oldCollateral,
                vaultId,
              ),
              'Settled vaults must not be retained in storage',
            );
          } else {
            const isNew = AmountMath.isEmpty(oldDebtNormalized);
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
            }

            // replace in queue, but only if it can accrue interest or be liquidated (i.e. has debt).
            // getCurrentDebt() would also work (0x = 0) but require more computation.
            if (!AmountMath.isEmpty(vault.getNormalizedDebt())) {
              prioritizedVaults.addVault(vaultId, vault);
            }

            // totalCollateral += vault's collateral delta (post — pre)
            state.totalCollateral = AmountMath.subtract(
              AmountMath.add(
                state.totalCollateral,
                vault.getCollateralAmount(),
              ),
              oldCollateral,
            );
            // debt accounting managed through minting and burning
            facets.helper.updateMetrics();
          }
        },
      },
      self: {
        getGovernedParams() {
          return factoryPowers.getGovernedParams();
        },

        /**
         * @param {ZCFSeat} seat
         */
        async makeVaultKit(seat) {
          trace('makevaultKit');
          const {
            state,
            facets: { manager },
          } = this;
          assert(marshaller, 'makeVaultKit missing marshaller');
          assert(storageNode, 'makeVaultKit missing storageNode');
          assert(zcf, 'makeVaultKit missing zcf');

          const vaultId = String(state.vaultCounter);

          // must be a presence to be stored in vault state
          const vaultStorageNode = await E(
            E(storageNode).makeChildNode(`vaults`),
          ).makeChildNode(`vault${vaultId}`);

          const { self: vault } = makeVault(manager, vaultId, vaultStorageNode);
          trace('makevaultKit made vault', vault);

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
            // ??? do we still need this cleanup? it won't get into the store unless it has collateral,
            // which should qualify it to be in the store. If we drop this catch then the nested await
            // for `vault.initVaultKit()` goes away.

            // remove it from the store if it got in
            /** @type {NormalizedDebt} */
            // @ts-expect-error cast
            const normalizedDebt = AmountMath.makeEmpty(debtBrand);
            const collateralPre = seat.getCurrentAllocation().Collateral;
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

        async getCollateralQuote() {
          // get a quote for one unit of the collateral
          return E(priceAuthority).quoteGiven(collateralUnit, debtBrand);
        },

        getPublicFacet() {
          return this.facets.collateral;
        },

        lockOraclePrices() {
          const { state, facets } = this;
          const { self } = facets;

          // XXX: 'twould be better if collateralQuote were updated lazily when it
          // changes by more than X%, and we use a cached value.  see #6946
          return E.when(self.getCollateralQuote(), quote => {
            trace(`lockPrice`, getAmountIn(quote), getAmountOut(quote));
            // @ts-expect-error declared PriceQuote | undefined. TS thinks undefined.
            state.lockedQuote = quote;
            return quote;
          });
        },
        /**
         * @param {AuctioneerPublicFacet} auctionPF
         */
        async liquidateVaults(auctionPF) {
          const { state, facets } = this;
          const { self, helper } = facets;
          const { lockedQuote, compoundedInterest } = state;
          const oraclePriceAtStartP = facets.self.getCollateralQuote();

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
          if (vaultData.getSize() === 0) {
            return;
          }
          trace(
            ' Found vaults to liquidate',
            liquidatingVaults.getSize(),
            totalCollateral,
          );

          helper.markLiquidating(totalDebt, totalCollateral);
          helper.updateMetrics();

          const { userSeatPromise, deposited } = await E.when(
            E(auctionPF).getDepositInvitation(),
            depositInvitation =>
              offerTo(
                zcf,
                depositInvitation,
                harden({ Minted: 'Currency' }),
                harden({ give: { Collateral: totalCollateral } }),
                liqSeat,
                liqSeat,
                { goal: totalDebt },
              ),
          );

          // This is expected to wait for the duration of the auction, which
          // is controlled by the auction parameters startFrequency, clockStep,
          // and the difference between startingRate and lowestRate.
          const [proceeds, oraclePrice] = await Promise.all([
            deposited,
            oraclePriceAtStartP,
            userSeatPromise,
          ]);

          trace(`LiqV after long wait`, proceeds);
          helper.distributeProceeds(proceeds, totalDebt, oraclePrice, liqSeat);
        },
      },
    },

    {
      finish: ({ state, facets: { helper } }) => {
        assetPublisher.publish(
          harden({
            compoundedInterest: state.compoundedInterest,
            interestRate: factoryPowers.getGovernedParams().getInterestRate(),
            latestInterestUpdate: state.latestInterestUpdate,
          }),
        );

        // push initial state of metrics
        helper.updateMetrics();

        void observeNotifier(periodNotifier, {
          updateState: updateTime =>
            helper
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
      },
    },
  );
};

/**
 * @typedef {ReturnType<ReturnType<typeof prepareVaultManagerKit>>['self']} VaultManager
 * Each VaultManager manages a single collateral type.
 *
 * It manages some number of outstanding loans, each called a Vault, for which
 * the collateral is provided in exchange for borrowed Minted.
 */
/** @typedef {ReturnType<VaultManager['getPublicFacet']>} CollateralManager */
