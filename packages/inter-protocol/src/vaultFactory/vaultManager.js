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
  makeStoredNotifier,
  makePublicTopic,
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
} from '@agoric/vat-data';
import {
  assertProposalShape,
  atomicTransfer,
  getAmountIn,
  atomicRearrange,
  floorMultiplyBy,
  offerTo,
  getAmountOut,
  makeRatio,
  provideEmptySeat,
  invertRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/eventual-send';
import { TransferPartShape } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { checkDebtLimit } from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { maxDebtForVault } from './math.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { Phase, prepareVault } from './vault.js';
import { normalizedCr, normalizedCrKey } from './storeUtils.js';
import { liquidationResults } from './liquidation.js';
import { AuctionPFShape } from '../auction/auctioneer.js';

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
 *                                                from AMM to owners of vaults liquidated with shortfalls
 *
 * @property {Amount<'nat'>}  totalCollateralSold       running sum of collateral sold in liquidation
 * @property {Amount<'nat'>}  totalOverageReceived      running sum of overages, central received greater than debt
 * @property {Amount<'nat'>}  totalProceedsReceived     running sum of central received from liquidation
 * @property {Amount<'nat'>}  totalShortfallReceived    running sum of shortfalls, central received less than debt
 * @property {number}         numLiquidationsCompleted  running count of liquidations
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
 * @typedef {Readonly<{
 * }>} ImmutableState
 */

/**
 * @typedef {{
 * compoundedInterest: Ratio,
 * latestInterestUpdate: Timestamp,
 * liquidator?: Liquidator
 * liquidatorInstance?: Instance
 * numLiquidationsCompleted: number,
 * totalCollateral: Amount<'nat'>,
 * totalCollateralSold: Amount<'nat'>,
 * totalDebt: Amount<'nat'>,
 * totalOverageReceived: Amount<'nat'>,
 * totalProceedsReceived: Amount<'nat'>,
 * totalShortfallReceived: Amount<'nat'>,
 * vaultCounter: number,
 * lockedQuote: PriceDescription | undefined,
 * }} MutableState
 */

const updateStateFromAccounting = (state, accounting, collateral) => {
  // Reduce totalCollateral by collateralPre, since all the collateral was
  // sold, returned to the vault owner, or held by the VaultManager.
  state.totalCollateral = AmountMath.subtract(
    state.totalCollateral,
    collateral,
  );
  state.totalDebt = AmountMath.subtract(state.totalDebt, accounting.shortfall);

  // cumulative values
  state.totalProceedsReceived = AmountMath.add(
    state.totalProceedsReceived,
    accounting.proceeds,
  );
  state.totalOverageReceived = AmountMath.add(
    state.totalOverageReceived,
    accounting.overage,
  );
  state.totalShortfallReceived = AmountMath.add(
    state.totalShortfallReceived,
    accounting.shortfall,
  );
  state.numLiquidationsCompleted += 1;
};

const quoteAsRatio = quoteAmount =>
  makeRatioFromAmounts(quoteAmount.amountIn, quoteAmount.amountOut);

/**
 *
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {ERef<Marshaller>} marshaller
 * @param {Readonly<{
 * debtMint: ZCFMint<'nat'>,
 * collateralBrand: Brand<'nat'>,
 * collateralUnit: Amount<'nat'>,
 * factoryPowers: import('./vaultDirector.js').FactoryPowersFacet,
 * descriptionScope: string,
 * startTimeStamp: Timestamp,
 * storageNode: ERef<StorageNode>,
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

  const { priceAuthority, timerService } = zcf.getTerms();

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
      totalCollateral: zeroCollateral,
      totalDebt: zeroDebt,
      totalOverageReceived: zeroDebt,
      totalProceedsReceived: zeroDebt,
      totalCollateralSold: zeroCollateral,
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
        getGovernedParams: M.call().returns(M.remotable()),
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
          M.remotable(),
        ).returns(),
      }),
      self: M.interface('self', {
        getGovernedParams: M.call().returns(M.remotable()),
        makeVaultKit: M.call(SeatShape).returns(M.promise()),
        getCollateralQuote: M.call().returns(M.promise()),
        getPublicFacet: M.call().returns(M.remotable()),
        lockOraclePrices: M.call().returns(M.promise()),
        // XXX Patterns insists that this returns a promise, though it returns nothing
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
          trace('chargeAllVaults complete', collateralBrand);
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
            totalCollateralSold: state.totalCollateralSold,
            totalOverageReceived: state.totalOverageReceived,
            totalProceedsReceived: state.totalProceedsReceived,
            totalShortfallReceived: state.totalShortfallReceived,
          });
          metricsPublisher.publish(payload);
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
          trace('maxDebtFor', collateralAmount);
          assert(factoryPowers && priceAuthority);
          const quote = await E(priceAuthority).quoteGiven(
            collateralAmount,
            debtBrand,
          );
          trace('maxDebtFor got quote', quote.quoteAmount.value[0]);
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
          const { burnDebt } = factoryPowers;
          burnDebt(toBurn, seat);
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
          assertProposalShape(seat, {
            give: { Collateral: null },
            want: { Minted: null },
          });

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
        async liquidateVaults(auctionPF) {
          const { state, facets } = this;
          const { lockedQuote, compoundedInterest } = state;

          assert(factoryPowers && prioritizedVaults && zcf);
          lockedQuote ||
            Fail`Must have locked a quote before liquidating vaults.`;
          assert(lockedQuote); // redundant with previous line

          /** @type {import('./storeUtils.js').NormalizedDebt} */
          // @ts-expect-error cast
          const crKey = normalizedCrKey(lockedQuote, compoundedInterest);

          trace(
            `Liquidating vaults worse than`,
            normalizedCr(lockedQuote, compoundedInterest),
          );
          const { totalDebt, totalCollateral, vaultsToLiquidate, liqSeat } =
            prioritizedVaults.removeVaultsBelow(crKey, zcf);
          if (!totalCollateral) {
            return;
          }

          vaultsToLiquidate.forEach(([_, v]) => {
            v.liquidating();
            liquidatingVaults.add(v);
          });

          trace(' Found vaults to liquidate', liquidatingVaults.getSize());

          const { userSeatPromise, deposited } = await E.when(
            E(auctionPF).getDepositInvitation(),
            depositInvitation =>
              offerTo(
                zcf,
                depositInvitation,
                harden({ Minted: 'Currency' }),
                harden({
                  give: { Collateral: totalCollateral },
                }),
                liqSeat,
              ),
          );

          // This can be a long wait.
          const [proceeds] = await Promise.all([deposited, userSeatPromise]);

          trace(`VM LiqV after long wait`, proceeds);

          const accounting = liquidationResults(
            totalDebt,
            proceeds.Minted || AmountMath.makeEmpty(debtBrand),
          );

          const removeLiquidatedVault = v => {
            trace(`removing a liquidated vault`);
            v.liquidated();
            liquidatingVaults.delete(v);
          };

          if (AmountMath.isEmpty(accounting.overage)) {
            // no one gets anything back
            facets.manager.burnAndRecord(accounting.toBurn, liqSeat);
            if (
              !AmountMath.isEmpty(proceeds.Collateral) &&
              !AmountMath.isEmpty(accounting.shortfall)
            ) {
              // The borrower doesn't get the excess collateral remaining when
              // liquidation results in a shortfall.
              // TODO  transfer it to the reserve.
              atomicTransfer(zcf, liqSeat, retainedCollateralSeat, {
                Collateral: proceeds.Collateral,
              });
            }

            if (!AmountMath.isEmpty(accounting.shortfall)) {
              E(factoryPowers.getShortfallReporter())
                .increaseLiquidationShortfall(accounting.shortfall)
                .catch(reason =>
                  console.error(
                    'liquidVaults failed to increaseLiquidationShortfall',
                    reason,
                  ),
                );
            }
            vaultsToLiquidate.forEach(([_, v]) => removeLiquidatedVault(v));

            updateStateFromAccounting(state, accounting, proceeds.Collateral);
            facets.helper.updateMetrics();
          } else {
            facets.manager.burnAndRecord(accounting.toBurn, liqSeat);

            // Some will get refunds. Best collateralized first
            // remainder is overage plus proceeds.Collateral.

            const aboveWaterVaults = [];
            let netPositive = AmountMath.makeEmpty(collateralBrand);
            vaultsToLiquidate.forEach(([key, vault]) => {
              const collateraValue = floorMultiplyBy(
                vault.getCollateralAmount(),
                // @ts-expect-error non-null asserted above
                invertRatio(quoteAsRatio(lockedQuote.quoteAmount.value[0])),
              );
              if (AmountMath.isGTE(vault.getCurrentDebt(), collateraValue)) {
                //  if debt was more than collateral value, just close it
                removeLiquidatedVault(vault);
              } else {
                // if debt was less, add equity to total, and save vault to get return
                const above = AmountMath.subtract(
                  collateraValue,
                  vault.getCurrentDebt(),
                );
                netPositive = AmountMath.add(netPositive, above);
                aboveWaterVaults.push({ key, vault, above });
              }
            });
            if (!aboveWaterVaults.length) {
              return;
            }

            const mintedfRatio = makeRatioFromAmounts(
              accounting.overage,
              netPositive,
            );
            const collateralRatio = makeRatioFromAmounts(
              proceeds.Collateral,
              netPositive,
            );
            const transfers = [];
            aboveWaterVaults.forEach(({ vault, above }) => {
              const amounts = harden({
                Collateral: floorMultiplyBy(above, collateralRatio),
                Minted: floorMultiplyBy(above, mintedfRatio),
              });
              transfers.push([liqSeat, vault.getVaultSeat(), amounts]);
            });
            atomicRearrange(zcf, transfers);
            aboveWaterVaults.forEach(([_, v]) => removeLiquidatedVault(v));

            updateStateFromAccounting(state, accounting, proceeds.Collateral);
            facets.helper.updateMetrics();
          }
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
