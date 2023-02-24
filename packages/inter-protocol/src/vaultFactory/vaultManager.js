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
  makeRatio,
  provideEmptySeat,
} from '@agoric/zoe/src/contractSupport/index.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/eventual-send';
import { TransferPartShape } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { checkDebtLimit } from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { updateQuote } from './liquidation.js';
import { maxDebtForVault } from './math.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { Phase, prepareVault } from './vault.js';

const { details: X } = assert;

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
 * }} MutableState
 */

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

  // ephemeral state
  /** @type {boolean} */
  let liquidationQueueing = false;
  /** @type {Promise<MutableQuote>?} */
  const outstandingQuote = null;

  /**
   * This class is a singleton kind so initState will be called only once per prepare.
   */
  const initState = () => {
    /** @type {MutableState} */
    return {
      compoundedInterest: makeRatio(100n, debtBrand), // starts at 1.0, no interest
      latestInterestUpdate: startTimeStamp,
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

          /** @type {MetricsNotification} */
          const payload = harden({
            numActiveVaults: prioritizedVaults.getCount(),
            numLiquidatingVaults: liquidatingVaults.getSize(),
            totalCollateral: state.totalCollateral,
            totalDebt: state.totalDebt,

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
          trace('reschedulePriceCheck', collateralBrand, {
            liquidationQueueing,
            outstandingQuote: !!outstandingQuote,
          });
          // INTERLOCK: the first time through, start the activity to wait for
          // and process liquidations over time.
          if (!liquidationQueueing) {
            liquidationQueueing = true;
            // TODO(7047) replace with new approach to liquidation
            return;
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
      },
    },
    {
      finish: ({ state, facets: { helper } }) => {
        prioritizedVaults.onHigherHighest(() => helper.reschedulePriceCheck());

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
