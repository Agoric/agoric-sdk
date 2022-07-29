/* eslint-disable consistent-return */
// @ts-check
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
import { Nat } from '@agoric/nat';
import { makeStoredPublishKit, observeNotifier } from '@agoric/notifier';
import {
  defineDurableKindMulti,
  makeKindHandle,
  makeScalarBigMapStore,
  pickFacet,
} from '@agoric/vat-data';
import {
  assertProposalShape,
  ceilDivideBy,
  ceilMultiplyBy,
  floorDivideBy,
  getAmountIn,
  getAmountOut,
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/eventual-send';
import {
  checkDebtLimit,
  makeEphemeraProvider,
  makeMetricsPublisherKit,
} from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { makeTracer } from '../makeTracer.js';
import { liquidate } from './liquidation.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { makeVault, Phase } from './vault.js';

const { details: X } = assert;

const trace = makeTracer('VM');

/** @typedef {import('./storeUtils.js').NormalizedDebt} NormalizedDebt */

// Metrics naming scheme: nouns are present values; past-participles are accumulative.
/**
 * @typedef {object} MetricsNotification
 *
 * @property {number}         numVaults        present count of vaults
 * @property {Amount<'nat'>}  totalCollateral  present sum of collateral across all vaults
 * @property {Amount<'nat'>}  totalDebt        present sum of debt across all vaults
 *
 * @property {Amount<'nat'>}  totalCollateralSold       running sum of collateral sold in liquidation // totalCollateralSold
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
 * collateralBrand: Brand<'nat'>,
 * debtBrand: Brand<'nat'>,
 * debtMint: ZCFMint<'nat'>,
 * poolIncrementSeat: ZCFSeat,
 * unsettledVaults: MapStore<string, Vault>,
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
 * @typedef {Readonly<{
 *   state: ImmutableState & MutableState,
 *   facets: {
 *     collateral: import('@agoric/vat-data/src/types').KindFacet<typeof collateralBehavior>,
 *     helper: import('@agoric/vat-data/src/types').KindFacet<typeof helperBehavior>,
 *     manager: import('@agoric/vat-data/src/types').KindFacet<typeof managerBehavior>,
 *     self: import('@agoric/vat-data/src/types').KindFacet<typeof selfBehavior>,
 *   }
 * }>} MethodContext
 */

/**
 * Ephemera are the elements of state that cannot (or need not) be durable.
 * When there's a single instance it can be held in a closure, but there are
 * many vault manaager objects. So we hold their ephemera keyed by the durable
 * vault manager.
 *
 * XXX However since we don't have the vault manager object during
 * initState when we hold values that need to go into ephemera, we key for now
 * using a proxy for the manager object, collateralBrand.
 *
 * @type {(collateralBrand: Brand) => Partial<{
 * assetSubscriber: Subscriber<AssetState>,
 * assetPublisher: Publisher<AssetState>,
 * factoryPowers: import('./vaultDirector.js').FactoryPowersFacet?,
 * liquidationQueueing: boolean,
 * outstandingQuote: Promise<MutableQuote>?,
 * marshaller: ERef<Marshaller>,
 * periodNotifier: ERef<Notifier<Timestamp>>,
 * priceAuthority: ERef<PriceAuthority>,
 * prioritizedVaults: ReturnType<typeof makePrioritizedVaults>,
 * metricsPublication: IterationObserver<MetricsNotification>,
 * metricsSubscription: StoredSubscription<MetricsNotification>,
 * storageNode: ERef<StorageNode>,
 * zcf: import('./vaultFactory.js').VaultFactoryZCF,
 * }>} */
const provideEphemera = makeEphemeraProvider(() => ({
  liquidationQueueing: false,
}));

/**
 * Create state for the Vault Manager kind
 *
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
const initState = (
  zcf,
  debtMint,
  collateralBrand,
  priceAuthority,
  factoryPowers,
  timerService,
  startTimeStamp,
  storageNode,
  marshaller,
) => {
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
  const unsettledVaults = makeScalarBigMapStore('orderedVaultStore', {
    durable: true,
  });

  /** @type {ImmutableState} */
  const fixed = {
    collateralBrand,
    debtBrand,
    debtMint,
    poolIncrementSeat: zcf.makeEmptySeatKit().zcfSeat,
    unsettledVaults,
  };

  const compoundedInterest = makeRatio(100n, fixed.debtBrand); // starts at 1.0, no interest
  // timestamp of most recent update to interest
  const latestInterestUpdate = startTimeStamp;

  /** @type {PublishKit<AssetState>} */
  const { publisher: assetPublisher, subscriber: assetSubscriber } =
    makeStoredPublishKit(storageNode, marshaller);

  assetPublisher.publish(
    harden({
      compoundedInterest,
      interestRate: factoryPowers.getGovernedParams().getInterestRate(),
      latestInterestUpdate,
    }),
  );

  const ephemera = provideEphemera(collateralBrand);
  Object.assign(ephemera, {
    assetSubscriber,
    assetPublisher,
    factoryPowers,
    marshaller,
    metricsPublication,
    metricsSubscription,
    periodNotifier,
    priceAuthority,
    prioritizedVaults: makePrioritizedVaults(unsettledVaults),
    storageNode,
    zcf,
  });

  /** @type {MutableState & ImmutableState} */
  const state = {
    ...fixed,
    compoundedInterest,
    debtBrand: fixed.debtBrand,
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

/**
 * Threshold to alert when the price level falls enough that the vault
 * with the highest debt to collateral ratio will no longer be valued at the
 * liquidationMargin above its debt.
 *
 * @param {Ratio} highestDebtRatio
 * @param {Ratio} liquidationMargin
 */
const liquidationThreshold = (highestDebtRatio, liquidationMargin) =>
  ceilMultiplyBy(
    highestDebtRatio.numerator, // debt
    liquidationMargin,
  );

// Some of these could go in closures but are kept on a facet anticipating future durability options.
const helperBehavior = {
  /**
   * @param {MethodContext} context
   * @param {Timestamp} updateTime
   * @param {ZCFSeat} poolIncrementSeat
   */
  chargeAllVaults: async ({ state, facets }, updateTime, poolIncrementSeat) => {
    trace('chargeAllVaults', state.collateralBrand, {
      updateTime,
    });
    const { factoryPowers } = provideEphemera(state.collateralBrand);
    assert(factoryPowers);

    const interestRate = factoryPowers.getGovernedParams().getInterestRate();

    // Update state with the results of charging interest

    const changes = chargeInterest(
      {
        mint: state.debtMint,
        mintAndReallocateWithFee: factoryPowers.mintAndReallocate,
        poolIncrementSeat,
        seatAllocationKeyword: 'Minted',
      },
      {
        interestRate,
        chargingPeriod: factoryPowers.getGovernedParams().getChargingPeriod(),
        recordingPeriod: factoryPowers.getGovernedParams().getRecordingPeriod(),
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
    trace('chargeAllVaults complete', state.collateralBrand);
    // price to check against has changed
    return facets.helper.reschedulePriceCheck();
  },

  /** @param {MethodContext} context */
  assetNotify: ({ state }) => {
    const ephemera = provideEphemera(state.collateralBrand);
    assert(ephemera.factoryPowers && ephemera.assetPublisher);
    const interestRate = ephemera.factoryPowers
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
    ephemera.assetPublisher.publish(payload);
  },

  /** @param {MethodContext} context */
  updateMetrics: ({ state }) => {
    const { metricsPublication, prioritizedVaults } = provideEphemera(
      state.collateralBrand,
    );
    assert(metricsPublication && prioritizedVaults);

    /** @type {MetricsNotification} */
    const payload = harden({
      numVaults: prioritizedVaults.getCount(),
      totalCollateral: state.totalCollateral,
      totalDebt: state.totalDebt,

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
   * @param {MethodContext} context
   * @param {Ratio} [highestRatio]
   * @returns {Promise<void>}
   */
  reschedulePriceCheck: async ({ state, facets }, highestRatio) => {
    const { prioritizedVaults, ...ephemera } = provideEphemera(
      state.collateralBrand,
    );
    assert(ephemera.factoryPowers && prioritizedVaults);
    trace('reschedulePriceCheck', state.collateralBrand, ephemera);
    // INTERLOCK: the first time through, start the activity to wait for
    // and process liquidations over time.
    if (!ephemera.liquidationQueueing) {
      ephemera.liquidationQueueing = true;
      // eslint-disable-next-line consistent-return
      return facets.helper
        .processLiquidations()
        .catch(e => console.error('Liquidator failed', e))
        .finally(() => {
          ephemera.liquidationQueueing = false;
        });
    }

    if (!ephemera.outstandingQuote) {
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
    const govParams = ephemera.factoryPowers.getGovernedParams();
    const liquidationMargin = govParams.getLiquidationMargin();
    // Safe to call extraneously (lightweight and idempotent)
    E(ephemera.outstandingQuote).updateLevel(
      highestDebtRatio.denominator, // collateral
      liquidationThreshold(highestDebtRatio, liquidationMargin),
    );
    trace('update quote', state.collateralBrand, highestDebtRatio);
  },

  /**
   * @param {MethodContext} context
   */
  processLiquidations: async ({ state, facets }) => {
    const { prioritizedVaults, ...ephemera } = provideEphemera(
      state.collateralBrand,
    );
    assert(ephemera.factoryPowers && ephemera.priceAuthority);
    const { priceAuthority } = ephemera;
    const govParams = ephemera.factoryPowers.getGovernedParams();

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
        ephemera.outstandingQuote = E(priceAuthority).mutableQuoteWhenLT(
          highestDebtRatio.denominator, // collateral
          liquidationThreshold(highestDebtRatio, liquidationMargin),
        );
        trace('posted quote request', state.collateralBrand, highestDebtRatio);

        // The rest of this method will not happen until after a quote is received.
        // This may not happen until much later, when the market changes.
        // eslint-disable-next-line no-await-in-loop
        const quote = await E(ephemera.outstandingQuote).getPromise();
        ephemera.outstandingQuote = null;
        // When we receive a quote, we check whether the vault with the highest
        // ratio of debt to collateral is below the liquidationMargin, and if so,
        // we liquidate it. We use ceilDivide to round up because ratios above
        // this will be liquidated.
        const quoteRatioPlusMargin = makeRatioFromAmounts(
          ceilDivideBy(getAmountOut(quote), liquidationMargin),
          getAmountIn(quote),
        );
        trace('quote', state.collateralBrand, quote, quoteRatioPlusMargin);

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
      trace('price check liq', state.collateralBrand, next && next[0]);
    }
  },

  /**
   * @param {MethodContext} context
   * @param {[key: string, vaultKit: Vault]} record
   */
  liquidateAndRemove: ({ state, facets }, [key, vault]) => {
    const { factoryPowers, prioritizedVaults, zcf } = provideEphemera(
      state.collateralBrand,
    );
    assert(factoryPowers && prioritizedVaults && zcf);
    const vaultSeat = vault.getVaultSeat();
    trace('liquidating', state.collateralBrand, vaultSeat.getProposal());

    const collateralPre = vault.getCollateralAmount();

    // Start liquidation (vaultState: LIQUIDATING)
    const liquidator = state.liquidator;
    assert(liquidator);
    return liquidate(
      zcf,
      vault,
      liquidator,
      state.collateralBrand,
      factoryPowers.getGovernedParams().getLiquidationPenalty(),
    )
      .then(accounting => {
        facets.manager.burnAndRecord(accounting.toBurn, vaultSeat);

        // current values
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
        prioritizedVaults.removeVault(key);
        trace('liquidated', state.collateralBrand);
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
    const ephemera = provideEphemera(state.collateralBrand);
    assert(ephemera.factoryPowers);
    return ephemera.factoryPowers.getGovernedParams();
  },

  /**
   * @param {MethodContext} context
   * @param {Amount<'nat'>} collateralAmount
   */
  maxDebtFor: async ({ state }, collateralAmount) => {
    const { debtBrand } = state;
    const { priceAuthority, ...ephemera } = provideEphemera(
      state.collateralBrand,
    );
    assert(ephemera.factoryPowers && priceAuthority);
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      debtBrand,
    );
    // floorDivide because we want the debt ceiling lower
    return floorDivideBy(
      getAmountOut(quoteAmount),
      ephemera.factoryPowers.getGovernedParams().getLiquidationMargin(),
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
    const { totalDebt } = state;
    const { factoryPowers } = provideEphemera(state.collateralBrand);
    assert(factoryPowers);

    checkDebtLimit(
      factoryPowers.getGovernedParams().getDebtLimit(),
      totalDebt,
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
    const { factoryPowers } = provideEphemera(state.collateralBrand);
    assert(factoryPowers);
    trace('burnAndRecord', state.collateralBrand, {
      toBurn,
      totalDebt: state.totalDebt,
    });
    const { burnDebt } = factoryPowers;
    burnDebt(toBurn, seat);
    state.totalDebt = AmountMath.subtract(state.totalDebt, toBurn);
  },
  /** @param {MethodContext} context */
  getAssetSubscriber: ({ state }) => {
    const { assetSubscriber } = provideEphemera(state.collateralBrand);
    assert(assetSubscriber);
    return assetSubscriber;
  },
  /** @param {MethodContext} context */
  getCollateralBrand: ({ state }) => state.collateralBrand,
  /** @param {MethodContext} context */
  getDebtBrand: ({ state }) => state.debtBrand,
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
    const { prioritizedVaults } = provideEphemera(state.collateralBrand);
    assert(prioritizedVaults);

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

const collateralBehavior = {
  /** @param {MethodContext} context */
  makeVaultInvitation: ({ state, facets: { self } }) => {
    const { zcf } = provideEphemera(state.collateralBrand);
    assert(zcf);
    return zcf.makeInvitation(self.makeVaultKit, 'MakeVault');
  },
  /** @param {MethodContext} context */
  getSubscriber: ({ state }) => {
    const { assetSubscriber } = provideEphemera(state.collateralBrand);
    assert(assetSubscriber);
    return assetSubscriber;
  },
  /** @param {MethodContext} context */
  getMetrics: ({ state }) => {
    const { metricsSubscription } = provideEphemera(state.collateralBrand);
    assert(metricsSubscription);
    return metricsSubscription;
  },
  /** @param {MethodContext} context */
  getCompoundedInterest: ({ state }) => state.compoundedInterest,
};

const selfBehavior = {
  /** @param {MethodContext} context */
  getGovernedParams: ({ state }) => {
    const { factoryPowers } = provideEphemera(state.collateralBrand);
    assert(factoryPowers);
    return factoryPowers.getGovernedParams();
  },

  /**
   * In extreme situations, system health may require liquidating all vaults.
   * This starts the liquidations all in parallel.
   *
   * @param {MethodContext} context
   */
  liquidateAll: async ({ state, facets: { helper } }) => {
    const { prioritizedVaults } = provideEphemera(state.collateralBrand);
    assert(prioritizedVaults);
    const toLiquidate = Array.from(prioritizedVaults.entries()).map(
      helper.liquidateAndRemove,
    );
    await Promise.all(toLiquidate);
  },

  /**
   * @param {MethodContext} context
   * @param {ZCFSeat} seat
   */
  makeVaultKit: async ({ state, facets: { manager } }, seat) => {
    const { marshaller, prioritizedVaults, storageNode, zcf } = provideEphemera(
      state.collateralBrand,
    );
    assert(marshaller, 'makeVaultKit missing marshaller');
    assert(prioritizedVaults, 'makeVaultKit missing prioritizedVaults');
    assert(storageNode, 'makeVaultKit missing storageNode');
    assert(zcf, 'makeVaultKit missing zcf');
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { Minted: null },
    });

    state.vaultCounter += 1;
    const vaultId = String(state.vaultCounter);

    const vaultStorageNode = E(
      E(storageNode).getChildNode(`vaults`),
    ).getChildNode(`vault${vaultId}`);

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
      const normalizedDebt = AmountMath.makeEmpty(state.debtBrand);
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
   * @param {MethodContext} param
   * @param {Installation} liquidationInstall
   * @param {object} liquidationTerms
   */
  setupLiquidator: async (
    { state, facets },
    liquidationInstall,
    liquidationTerms,
  ) => {
    const { zcf } = provideEphemera(state.collateralBrand);
    assert(zcf);
    const { debtBrand, collateralBrand } = state;
    const { ammPublicFacet, priceAuthority, reservePublicFacet, timerService } =
      zcf.getTerms();
    const zoe = zcf.getZoeService();
    const collateralIssuer = zcf.getIssuerForBrand(collateralBrand);
    const debtIssuer = zcf.getIssuerForBrand(debtBrand);
    trace('setup liquidator', state.collateralBrand, {
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
    trace('setup liquidator complete', state.collateralBrand, {
      instance,
      old: state.liquidatorInstance,
      equal: state.liquidatorInstance === instance,
    });
    state.liquidatorInstance = instance;
    state.liquidator = creatorFacet;
    facets.helper.assetNotify();
  },

  /** @param {MethodContext} context */
  getCollateralQuote: async ({ state }) => {
    const { priceAuthority } = provideEphemera(state.collateralBrand);
    assert(priceAuthority);

    const { debtBrand } = state;
    // get a quote for one unit of the collateral
    const displayInfo = await E(state.collateralBrand).getDisplayInfo();
    const decimalPlaces = displayInfo.decimalPlaces || 0n;
    return E(priceAuthority).quoteGiven(
      AmountMath.make(state.collateralBrand, 10n ** Nat(decimalPlaces)),
      debtBrand,
    );
  },

  /** @param {MethodContext} context */
  getPublicFacet: ({ facets }) => facets.collateral,
};

/** @param {MethodContext} context */
const finish = ({ state, facets: { helper } }) => {
  const { periodNotifier, prioritizedVaults, zcf } = provideEphemera(
    state.collateralBrand,
  );
  assert(periodNotifier && prioritizedVaults && zcf);

  prioritizedVaults.onHigherHighest(helper.reschedulePriceCheck);

  // push initial state of metrics
  helper.updateMetrics();

  void observeNotifier(periodNotifier, {
    updateState: updateTime =>
      helper
        .chargeAllVaults(updateTime, state.poolIncrementSeat)
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

const makeVaultManagerKit = defineDurableKindMulti(
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
