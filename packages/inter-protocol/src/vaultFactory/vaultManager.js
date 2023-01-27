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

import { Fail } from '@agoric/assert';
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
  makeStoredSubscriber,
  observeNotifier,
  prepareDurablePublishKit,
  SubscriberShape,
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
  ceilDivideBy,
  floorDivideBy,
  getAmountIn,
  getAmountOut,
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { InstallationShape, SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/eventual-send';
import { checkDebtLimit, provideEmptySeat } from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { liquidate, makeQuote, updateQuote } from './liquidation.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { Phase, prepareVault } from './vault.js';

const { details: X } = assert;

const trace = makeTracer('VM', false);

/** @typedef {import('./storeUtils.js').NormalizedDebt} NormalizedDebt */

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
 *  getLiquidationMargin: () => Ratio,
 *  getLiquidationPenalty: () => Ratio,
 *  getLoanFee: () => Ratio,
 * }} GovernedParamGetters
 */

/**
 * @typedef {Readonly<{
 * unsettledVaults: MapStore<string, Vault>,
 * liquidatingVaults: SetStore<Vault>,
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
 * }} MutableState
 */

// TODO move params of initState here because it's a singleton
// and remove from State what doesn't need to be stored between upgrades
/**
 *
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {Brand<'nat'>} collateralBrand
 * @param {Amount<'nat'>} collateralUnit
 * @param {import('./vaultDirector.js').FactoryPowersFacet} factoryPowers
 * @param {Timestamp} startTimeStamp
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareVaultManagerKit = (
  baggage,
  zcf,
  debtMint,
  collateralBrand,
  collateralUnit,
  factoryPowers,
  startTimeStamp,
  storageNode,
  marshaller,
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

  const { publisher: metricsPublisher, subscriber: metricsSubscriber } =
    makeVaultManagerPublishKit();

  /** @type {PublishKit<AssetState>} */
  const { publisher: assetPublisher, subscriber: assetSubscriber } =
    makeVaultManagerPublishKit();

  /** @type {MapStore<string, Vault>} */
  const unsettledVaults = provideDurableMapStore(baggage, 'orderedVaultStore');

  const debtBrand = debtMint.getIssuerRecord().brand;
  const zeroCollateral = AmountMath.makeEmpty(collateralBrand, 'nat');
  const zeroDebt = AmountMath.makeEmpty(debtBrand, 'nat');

  const storedMetricsSubscriber = makeStoredSubscriber(
    metricsSubscriber,
    E(storageNode).makeChildNode('metrics'),
    marshaller,
  );

  const storedAssetSubscriber = makeStoredSubscriber(
    assetSubscriber,
    storageNode,
    marshaller,
  );

  const storedQuotesNotifier = makeStoredNotifier(
    E(priceAuthority).makeQuoteNotifier(collateralUnit, debtBrand),
    E(storageNode).makeChildNode('quotes'),
    marshaller,
  );

  const prioritizedVaults = makePrioritizedVaults(unsettledVaults);

  /**
   * If things are going well, the set will contain at most one Vault. Otherwise
   * failures remain and are available to be repaired via contract upgrade.
   *
   * @type {SetStore<Vault>}
   */
  const liquidatingVaults = provideDurableSetStore(
    baggage,
    'liquidatingVaults',
  );

  const poolIncrementSeat = provideEmptySeat(zcf, baggage, 'pool increment');
  const retainedCollateralSeat = provideEmptySeat(
    zcf,
    baggage,
    'retained collateral',
  );

  // ephemeral state
  /** @type {boolean} */
  let liquidationQueueing = false;
  /** @type {Promise<MutableQuote>?} */
  let outstandingQuote = null;

  let singletonMade = false;

  const initState = () => {
    !singletonMade || Fail`vaultManager singleton can be made just once`;
    singletonMade = true;

    const compoundedInterest = makeRatio(100n, debtBrand); // starts at 1.0, no interest
    // timestamp of most recent update to interest
    const latestInterestUpdate = startTimeStamp;

    assetPublisher.publish(
      harden({
        compoundedInterest,
        interestRate: factoryPowers.getGovernedParams().getInterestRate(),
        latestInterestUpdate,
      }),
    );

    /** @type {MutableState} */
    const state = {
      compoundedInterest,
      latestInterestUpdate,
      liquidator: undefined,
      liquidatorInstance: undefined,
      numLiquidationsCompleted: 0,
      totalCollateral: zeroCollateral,
      totalDebt: zeroDebt,
      totalOverageReceived: zeroDebt,
      totalProceedsReceived: zeroDebt,
      totalCollateralSold: zeroCollateral,
      totalShortfallReceived: zeroDebt,
      vaultCounter: 0,
    };

    return state;
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
        mintAndReallocate: M.call(AmountShape, AmountShape, SeatShape)
          .rest()
          .returns(),
        burnAndRecord: M.call(AmountShape, SeatShape).returns(),
        getAssetSubscriber: M.call().returns(SubscriberShape),
        getCollateralBrand: M.call().returns(BrandShape),
        getDebtBrand: M.call().returns(BrandShape),
        getCompoundedInterest: M.call().returns(RatioShape),
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
        liquidateAll: M.call().returns(M.promise()),
        makeVaultKit: M.call(SeatShape).returns(M.promise()),
        setupLiquidator: M.call(InstallationShape, M.record()).returns(
          M.promise(),
        ),
        getCollateralQuote: M.call().returns(M.promise()),
        getPublicFacet: M.call().returns(M.remotable()),
      }),
    },
    initState,
    {
      collateral: {
        makeVaultInvitation() {
          return zcf.makeInvitation(
            seat => this.facets.self.makeVaultKit(seat),
            'MakeVault',
          );
        },
        getSubscriber() {
          return storedAssetSubscriber;
        },
        getMetrics() {
          return storedMetricsSubscriber;
        },
        getQuotes() {
          return storedQuotesNotifier;
        },
        getCompoundedInterest() {
          return this.state.compoundedInterest;
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
              mintAndReallocateWithFee: factoryPowers.mintAndReallocate,
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
          // price to check against has changed
          return facets.helper.reschedulePriceCheck();
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

        /**
         * When any Vault's debt ratio is higher than the current high-water level,
         * call `reschedulePriceCheck()` to request a fresh notification from the
         * priceAuthority. There will be extra outstanding requests since we can't
         * cancel them. (https://github.com/Agoric/agoric-sdk/issues/2713).
         *
         * When the vault with the current highest debt ratio is removed or reduces
         * its ratio, we won't reschedule the priceAuthority requests to reduce churn.
         * Instead, when a priceQuote is received, we'll only reschedule if the
         * high-water level when the request was made matches the current high-water
         * level.
         *
         * @param {Ratio} [highestRatio]
         * @returns {Promise<void>}
         */
        async reschedulePriceCheck(highestRatio) {
          const { facets } = this;
          trace('reschedulePriceCheck', collateralBrand, {
            liquidationQueueing,
          });
          // INTERLOCK: the first time through, start the activity to wait for
          // and process liquidations over time.
          if (!liquidationQueueing) {
            liquidationQueueing = true;
            // eslint-disable-next-line consistent-return
            return facets.helper
              .processLiquidations()
              .catch(e => console.error('Liquidator failed', e))
              .finally(() => {
                liquidationQueueing = false;
              });
          }

          if (!outstandingQuote) {
            // the new threshold will be picked up by the next quote request
            return;
          }

          const highestDebtRatio =
            highestRatio || prioritizedVaults.highestRatio();
          if (!highestDebtRatio) {
            // if there aren't any open vaults, we don't need an outstanding RFQ.
            trace('no open vaults');
            return;
          }

          // There is already an activity processing liquidations. It may be
          // waiting for the oracle price to cross a threshold.
          // Update the current in-progress quote.
          const govParams = factoryPowers.getGovernedParams();
          const liquidationMargin = govParams.getLiquidationMargin();
          // Safe to call extraneously (lightweight and idempotent)
          updateQuote(outstandingQuote, highestDebtRatio, liquidationMargin);
          trace('update quote', collateralBrand, highestDebtRatio);
        },

        async processLiquidations() {
          const { facets } = this;
          const govParams = factoryPowers.getGovernedParams();

          async function* eventualLiquidations() {
            while (true) {
              const highestDebtRatio = prioritizedVaults.highestRatio();
              if (!highestDebtRatio) {
                return;
              }
              const liquidationMargin = govParams.getLiquidationMargin();

              // ask to be alerted when the price level falls enough that the vault
              // with the highest debt to collateral ratio will no longer be valued at the
              // liquidationMargin above its debt.
              outstandingQuote = makeQuote(
                priceAuthority,
                highestDebtRatio,
                liquidationMargin,
              );
              trace('posted quote request', collateralBrand, highestDebtRatio);

              // The rest of this method will not happen until after a quote is received.
              // This may not happen until much later, when the market changes.
              // eslint-disable-next-line no-await-in-loop, @jessie.js/no-nested-await -- loop/nesting to yield each unconditionally
              const quote = await E(outstandingQuote).getPromise();
              outstandingQuote = null;
              // When we receive a quote, we check whether the vault with the highest
              // ratio of debt to collateral is below the liquidationMargin, and if so,
              // we liquidate it. We use ceilDivide to round up because ratios above
              // this will be liquidated.
              const quoteRatioPlusMargin = makeRatioFromAmounts(
                ceilDivideBy(getAmountOut(quote), liquidationMargin),
                getAmountIn(quote),
              );
              trace('quote', collateralBrand, quote, quoteRatioPlusMargin);

              // Liquidate the head of the queue
              const [next] =
                prioritizedVaults.entriesPrioritizedGTE(quoteRatioPlusMargin);
              if (next) {
                yield next;
              }
            }
          }
          for await (const next of eventualLiquidations()) {
            await facets.helper.liquidateAndRemove(next);
            trace('price check liq', collateralBrand, next && next[0]);
          }
        },

        /**
         * @param {[key: string, vaultKit: Vault]} record
         */
        liquidateAndRemove([key, vault]) {
          const { state, facets } = this;
          const vaultSeat = vault.getVaultSeat();
          trace('liquidating', collateralBrand, vaultSeat.getProposal());

          const collateralPre = vault.getCollateralAmount();

          // Start liquidation (vaultState: LIQUIDATING)
          const liquidator = state.liquidator;
          assert(liquidator);
          liquidatingVaults.add(vault);
          prioritizedVaults.removeVault(key);

          return liquidate(
            zcf,
            vault,
            liquidator,
            collateralBrand,
            factoryPowers.getGovernedParams().getLiquidationPenalty(),
          )
            .then(accounting => {
              facets.manager.burnAndRecord(accounting.toBurn, vaultSeat);

              // current values

              // Sometimes, the AMM will sell less than all the collateral. If there
              // was a shortfall, the investor doesn't keep the change, so we get it.
              // If there was no shortfall, the collateral is returned.
              const collateralPost = vault.getCollateralAmount();
              if (
                !AmountMath.isEmpty(collateralPost) &&
                !AmountMath.isEmpty(accounting.shortfall)
              ) {
                // The borrower doesn't get the excess collateral remaining when
                // liquidation results in a shortfall. We currently do nothing with
                // it. We could hold it until it crosses some threshold, then sell it
                // to the AMM, or we could transfer it to the reserve. At least it's
                // visible in the accounting.
                atomicTransfer(zcf, vaultSeat, retainedCollateralSeat, {
                  Collateral: collateralPost,
                });
              }

              // Reduce totalCollateral by collateralPre, since all the collateral was
              // sold, returned to the vault owner, or held by the VaultManager.
              state.totalCollateral = AmountMath.subtract(
                state.totalCollateral,
                collateralPre,
              );
              state.totalDebt = AmountMath.subtract(
                state.totalDebt,
                accounting.shortfall,
              );

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
              liquidatingVaults.delete(vault);
              trace('liquidated', collateralBrand);
              state.numLiquidationsCompleted += 1;
              facets.helper.updateMetrics();

              if (!AmountMath.isEmpty(accounting.shortfall)) {
                E(factoryPowers.getShortfallReporter())
                  .increaseLiquidationShortfall(accounting.shortfall)
                  .catch(reason =>
                    console.error(
                      'liquidateAndRemove failed to increaseLiquidationShortfall',
                      reason,
                    ),
                  );
              }
            })
            .catch(e => {
              // XXX should notify interested parties
              console.error('liquidateAndRemove failed with', e);
              throw e;
            });
        },
      },
      manager: {
        getGovernedParams() {
          return factoryPowers.getGovernedParams();
        },

        /**
         * @param {Amount<'nat'>} collateralAmount
         */
        async maxDebtFor(collateralAmount) {
          trace('maxDebtFor', collateralAmount);
          assert(factoryPowers && priceAuthority);
          const quoteAmount = await E(priceAuthority).quoteGiven(
            collateralAmount,
            debtBrand,
          );
          trace('maxDebtFor got quote', quoteAmount);
          // floorDivide because we want the debt ceiling lower
          return floorDivideBy(
            getAmountOut(quoteAmount),
            factoryPowers.getGovernedParams().getLiquidationMargin(),
          );
        },
        /**
         * TODO utility method to turn a callback into non-actual one
         * was type {MintAndReallocate}
         *
         * @param {Amount<'nat'>} toMint
         * @param {Amount<'nat'>} fee
         * @param {ZCFSeat} seat
         * @param {...ZCFSeat} otherSeats
         * @returns {void}
         */
        mintAndReallocate(toMint, fee, seat, ...otherSeats) {
          const { state } = this;
          const { totalDebt } = state;

          checkDebtLimit(
            factoryPowers.getGovernedParams().getDebtLimit(),
            totalDebt,
            toMint,
          );
          factoryPowers.mintAndReallocate(toMint, fee, seat, ...otherSeats);
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
          return storedAssetSubscriber;
        },
        getCollateralBrand() {
          return collateralBrand;
        },
        getDebtBrand() {
          return debtBrand;
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
         * In extreme situations, system health may require liquidating all vaults.
         * This starts the liquidations all in parallel.
         */
        async liquidateAll() {
          const {
            facets: { helper },
          } = this;
          const toLiquidate = Array.from(prioritizedVaults.entries()).map(
            entry => helper.liquidateAndRemove(entry),
          );
          await Promise.all(toLiquidate);
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

          // NB: This increments even when a vault fails to init and is removed
          // from the manager, creating a sparse series of published vaults.
          state.vaultCounter += 1;
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
            seat.exit();
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
              console.error(
                'removed vault',
                vaultId,
                'after initVaultKit failure',
              );
            } catch {
              console.error(
                'vault',
                vaultId,
                'never stored during initVaultKit failure',
              );
            }
            throw err;
          }
        },

        /**
         *
         * @param {Installation} liquidationInstall
         * @param {object} liquidationTerms
         */
        async setupLiquidator(liquidationInstall, liquidationTerms) {
          const { state, facets } = this;
          const { ammPublicFacet, reservePublicFacet } = zcf.getTerms();
          const zoe = zcf.getZoeService();
          const collateralIssuer = zcf.getIssuerForBrand(collateralBrand);
          const debtIssuer = zcf.getIssuerForBrand(debtBrand);
          trace('setup liquidator', collateralBrand, {
            debtBrand,
            debtIssuer,
            collateralBrand,
            liquidationTerms,
          });
          const { creatorFacet, instance } = await E(zoe).startInstance(
            liquidationInstall,
            harden({ Minted: debtIssuer, Collateral: collateralIssuer }),
            harden({
              ...liquidationTerms,
              amm: ammPublicFacet,
              debtBrand,
              reservePublicFacet,
              priceAuthority,
              timerService,
            }),
          );
          trace('setup liquidator complete', collateralBrand, {
            instance,
            old: state.liquidatorInstance,
            equal: state.liquidatorInstance === instance,
          });
          state.liquidatorInstance = instance;
          state.liquidator = creatorFacet;
          facets.helper.assetNotify();
        },

        async getCollateralQuote() {
          // get a quote for one unit of the collateral
          return E(priceAuthority).quoteGiven(collateralUnit, debtBrand);
        },

        getPublicFacet() {
          return this.facets.collateral;
        },
      },
    },
    {
      // XXX type error when destructuring params
      finish: context => {
        const {
          facets: { helper },
        } = context;
        prioritizedVaults.onHigherHighest(() => helper.reschedulePriceCheck());

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
