/* eslint-disable no-use-before-define */
/* eslint-disable consistent-return */
// @ts-check
// TODO remove the no-use-before-define

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

import { AmountMath } from '@agoric/ertp';
import { makeStoredPublishKit, observeNotifier } from '@agoric/notifier';
import {
  defineDurableKindMulti,
  M,
  makeKindHandle,
  makeScalarBigMapStore,
  makeScalarBigSetStore,
  pickFacet,
  provide,
  provideDurableMapStore,
  provideDurableSetStore,
  vivifyFarClass,
  vivifyFarClassKit,
} from '@agoric/vat-data';
import {
  assertProposalShape,
  ceilDivideBy,
  floorDivideBy,
  getAmountIn,
  getAmountOut,
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/eventual-send';
import { unitAmount } from '@agoric/zoe/src/contractSupport/priceQuote.js';
import {
  checkDebtLimit,
  makeMetricsPublisherKit,
  provideEmptySeat,
} from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { makeTracer } from '../makeTracer.js';
import { liquidate, makeQuote, updateQuote } from './liquidation.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { vivifyVaultFactory, Phase } from './vault.js';

const { details: X } = assert;

const trace = makeTracer('VM');

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
 * @typedef {Readonly<{
 *   state: MutableState,
 *   facets: {
 *     collateral: import('@agoric/vat-data/src/types').KindFacet<typeof collateralBehavior>,
 *     helper: import('@agoric/vat-data/src/types').KindFacet<typeof helperBehavior>,
 *     manager: import('@agoric/vat-data/src/types').KindFacet<typeof managerBehavior>,
 *     self: import('@agoric/vat-data/src/types').KindFacet<typeof selfBehavior>,
 *   }
 * }>} MethodContext
 */

/** The key at which the VaultManager record is stored. */
const INSTANCE_KEY = 'vaultManager';

/**
 * Create state for the Vault Manager kind
 *
 * @param baggage
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {import('./vaultDirector.js').FactoryPowersFacet} factoryPowers
 * @param {ERef<TimerService>} timerService
 * @param {Timestamp} startTimeStamp
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
const vivifyVaultManagerKit = (
  baggage,
  zcf,
  debtMint,
  priceAuthority,
  factoryPowers,
  timerService,
  storageNode,
  marshaller,
) => {
  const vmRecord = baggage.get(INSTANCE_KEY);
  return setupVaultManagerKit(
    vmRecord,
    baggage,
    zcf,
    debtMint,
    priceAuthority,
    factoryPowers,
    timerService,
    storageNode,
    marshaller,
  );
};

const setupVaultManagerKit = (
  { collateralBrand, startTimeStamp }, // TODO should startTimeStamp be in state?
  baggage,
  zcf,
  debtMint,
  priceAuthority,
  factoryPowers,
  timerService,
  storageNode,
  marshaller,
) => {
  // TODO this is redundant wiht the makeMetrics helper
  assert(
    storageNode && marshaller,
    'VaultManager missing storageNode or marshaller',
  );
  const periodNotifier = E(timerService).makeNotifier(
    0n,
    factoryPowers.getGovernedParams().getChargingPeriod(),
  );

  const debtBrand = debtMint.getIssuerRecord().brand;
  const zeroCollateral = AmountMath.makeEmpty(collateralBrand, 'nat');
  const zeroDebt = AmountMath.makeEmpty(debtBrand, 'nat');

  const { metricsPublication, metricsSubscription } = makeMetricsPublisherKit(
    storageNode,
    marshaller,
  );

  /** @type {MapStore<string, Vault>} */
  const unsettledVaults = provideDurableMapStore(baggage, 'orderedVaultStore');

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

  const poolIncrementSeat = provideEmptySeat(zcf, baggage, 'poolIncrement');
  const retainedCollateralSeat = provideEmptySeat(
    zcf,
    baggage,
    'retainedCollateral',
  );

  const initialInterest = makeRatio(100n, debtBrand); // starts at 1.0, no interest

  /** @type {PublishKit<AssetState>} */
  const { publisher: assetPublisher, subscriber: assetSubscriber } =
    makeStoredPublishKit(storageNode, marshaller);

  assetPublisher.publish(
    harden({
      compoundedInterest: initialInterest,
      interestRate: factoryPowers.getGovernedParams().getInterestRate(),
      latestInterestUpdate: startTimeStamp,
    }),
  );

  let outstandingQuote = null;
  let liquidationQueueing = false;
  // TODO this needs to go into mutable persistent state?
  const prioritizedVaults = makePrioritizedVaults(unsettledVaults);

  const initState = () => {
    /** @type {MutableState} */
    const state = {
      compoundedInterest: initialInterest,
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
    return state;
  };

  const helperBehavior = {
    /**
     * @param {Timestamp} updateTime
     * @param {ZCFSeat} poolIncrementSeat
     */
    async chargeAllVaults(updateTime, poolIncrementSeat) {
      const { state, facets } = this;
      trace('chargeAllVaults', collateralBrand, {
        updateTime,
      });

      const interestRate = factoryPowers.getGovernedParams().getInterestRate();

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
          chargingPeriod: factoryPowers.getGovernedParams().getChargingPeriod(),
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
      const interestRate = factoryPowers.getGovernedParams().getInterestRate();
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
      metricsPublication.updateState(payload);
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
      trace('reschedulePriceCheck', collateralBrand);
      const { facets } = this;
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

      const highestDebtRatio = highestRatio || prioritizedVaults.highestRatio();
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
        assert(prioritizedVaults);
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
          // eslint-disable-next-line no-await-in-loop
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
      const activeLiquidator = state.liquidator;
      assert(activeLiquidator);
      liquidatingVaults.add(vault);
      prioritizedVaults.removeVault(key);

      return liquidate(
        zcf,
        vault,
        activeLiquidator,
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
            vaultSeat.decrementBy(
              retainedCollateralSeat.incrementBy({
                Collateral: collateralPost,
              }),
            );
            zcf.reallocate(vaultSeat, retainedCollateralSeat);
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
  };

  const managerBehavior = {
    /** @param {MethodContext} context */
    getGovernedParams: ({ state }) => {
      return factoryPowers.getGovernedParams();
    },

    /**
     * @param {MethodContext} context
     * @param {Amount<'nat'>} collateralAmount
     */
    maxDebtFor: async ({ state }, collateralAmount) => {
      const quoteAmount = await E(priceAuthority).quoteGiven(
        collateralAmount,
        debtBrand,
      );
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
     * @param {MethodContext} context
     * @param {Amount} toMint
     * @param {Amount} fee
     * @param {ZCFSeat} seat
     * @param {...ZCFSeat} otherSeats
     * @returns {void}
     */
    mintAndReallocate: ({ state }, toMint, fee, seat, ...otherSeats) => {
      checkDebtLimit(
        factoryPowers.getGovernedParams().getDebtLimit(),
        state.totalDebt,
        toMint,
      );
      factoryPowers.mintAndReallocate(toMint, fee, seat, ...otherSeats);
      state.totalDebt = AmountMath.add(state.totalDebt, toMint);
    },
    /**
     * @param {MethodContext} context
     * @param {Amount<'nat'>} toBurn
     * @param {ZCFSeat} seat
     */
    burnAndRecord: ({ state }, toBurn, seat) => {
      trace('burnAndRecord', collateralBrand, {
        toBurn,
        totalDebt: state.totalDebt,
      });
      const { burnDebt } = factoryPowers;
      burnDebt(toBurn, seat);
      state.totalDebt = AmountMath.subtract(state.totalDebt, toBurn);
    },
    /** @param {MethodContext} context */
    getAssetSubscriber: ({ state }) => {
      return assetSubscriber;
    },
    /** @param {MethodContext} context */
    getCollateralBrand: ({ state }) => collateralBrand,
    /** @param {MethodContext} context */
    getDebtBrand: ({ state }) => debtBrand,
    /**
     * coefficient on existing debt to calculate new debt
     *
     * @param {MethodContext} context
     */
    getCompoundedInterest: ({ state }) => state.compoundedInterest,
    /**
     * Called by a vault when its balances change.
     *
     * @param {MethodContext} context
     * @param {NormalizedDebt} oldDebtNormalized
     * @param {Amount<'nat'>} oldCollateral
     * @param {VaultId} vaultId
     * @param {import('./vault.js').VaultPhase} vaultPhase at the end of whatever change updated balances
     * @param {Vault} vault
     */
    handleBalanceChange: (
      { state, facets },
      oldDebtNormalized,
      oldCollateral,
      vaultId,
      vaultPhase,
      vault,
    ) => {
      // the manager holds only vaults that can accrue interest or be liquidated;
      // i.e. vaults that have debt. The one exception is at the outset when
      // a vault has been added to the manager but not yet accounted for.
      const settled =
        AmountMath.isEmpty(oldDebtNormalized) && vaultPhase !== Phase.ACTIVE;

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
          AmountMath.add(state.totalCollateral, vault.getCollateralAmount()),
          oldCollateral,
        );
        // debt accounting managed through minting and burning
        facets.helper.updateMetrics();
      }
    },
  };

  // NOTE that this must be changed for non-fungible (NFT/SFT) suuport
  const amountShape = brand =>
    harden({
      brand, // matches only this exact brand
      value: M.nat(),
    });
  const mintedAmountShape = amountShape(debtBrand);
  const collateralAmountShape = amountShape(collateralBrand);

  const collateralBehavior = {
    /** @param {MethodContext} context */
    makeVaultInvitation: ({ state, facets: { self } }) => {
      return zcf.makeInvitation(
        seat => self.makeVaultKit(seat),
        'MakeVault',
        undefined,
        M.split({
          give: { Collateral: mintedAmountShape },
          want: { Minted: collateralAmountShape },
        }),
      );
    },
    /** @param {MethodContext} context */
    getSubscriber: ({ state }) => {
      return assetSubscriber;
    },
    /** @param {MethodContext} context */
    getMetrics: ({ state }) => {
      return metricsSubscription;
    },
    /** @param {MethodContext} context */
    getCompoundedInterest: ({ state }) => state.compoundedInterest,
  };

  const selfBehavior = {
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
      const toLiquidate = Array.from(prioritizedVaults.entries()).map(entry =>
        helper.liquidateAndRemove(entry),
      );
      await Promise.all(toLiquidate);
    },

    /**
     * @param {ZCFSeat} seat
     */
    async makeVaultKit(seat) {
      const {
        state,
        facets: { manager },
      } = this;

      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { Minted: null },
      });

      state.vaultCounter += 1;
      const vaultId = String(state.vaultCounter);

      const vaultStorageNode = E(
        E(storageNode).makeChildNode(`vaults`),
      ).makeChildNode(`vault${vaultId}`);

      const vault = makeVault(
        zcf,
        manager,
        vaultId,
        vaultStorageNode,
        marshaller,
      );

      try {
        // TODO `await` is allowed until the above ordering is fixed
        // eslint-disable-next-line @jessie.js/no-nested-await
        const vaultKit = await vault.initVaultKit(
          seat,
          vaultStorageNode,
          marshaller,
        );
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
          console.error('removed vault', vaultId, 'after initVaultKit failure');
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
      const {
        ammPublicFacet,
        priceAuthority,
        reservePublicFacet,
        timerService,
      } = zcf.getTerms();
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
      const collateralUnit = await unitAmount(collateralBrand);
      return E(priceAuthority).quoteGiven(collateralUnit, debtBrand);
    },

    getPublicFacet() {
      return this.facets.collateral;
    },
  };

  /** @param {MethodContext} context */
  const finish = ({ facets: { helper } }) => {
    prioritizedVaults.onHigherHighest(() => helper.reschedulePriceCheck());

    // push initial state of metrics
    helper.updateMetrics();

    void observeNotifier(periodNotifier, {
      updateState: updateTime =>
        helper
          .chargeAllVaults(updateTime, poolIncrementSeat)
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
  };

  const behavior = {
    collateral: collateralBehavior,
    helper: helperBehavior,
    manager: managerBehavior,
    self: selfBehavior,
  };

  const makeVaultManagerKit = vivifyFarClassKit(
    baggage,
    'VaultManagerKit',
    undefined, // interface
    initState,
    behavior,
    {
      finish,
    },
  );

  // TODO split vivifyVaultManager into setup and vivify. All async stuff goes in the
  // create step and writes out baggage.

  const vm = provide(
    baggage,
    `vm_${collateralKeyword}`,
    () => makeVaultManagerKit().self,
  );

  const makeVault = vivifyVaultFactory(baggage, zcf, vm);

  return vm;
};

const xmakeVaultManagerKit = defineDurableKindMulti(
  makeKindHandle('VaultManagerKit'),
  initState,
  behavior,
  {
    finish,
  },
);

/**
 * Each VaultManager manages a single collateral type.
 *
 * It manages some number of outstanding loans, each called a Vault, for which
 * the collateral is provided in exchange for borrowed Minted.
 *
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {import('./vaultDirector.js').FactoryPowersFacet} factoryPowers
 * @param {ERef<TimerService>} timerService
 * @param {Timestamp} startTimeStamp
 */
export const makeVaultManager = pickFacet(makeVaultManagerKit, 'self');

/** @typedef {ReturnType<typeof makeVaultManagerKit>['manager']} VaultKitManager */
/** @typedef {ReturnType<typeof makeVaultManager>} VaultManager */
/** @typedef {ReturnType<VaultManager['getPublicFacet']>} CollateralManager */
