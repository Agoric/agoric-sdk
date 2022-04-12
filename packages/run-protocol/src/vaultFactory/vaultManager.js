// @ts-check

import '@agoric/zoe/exported.js';

import { E } from '@endo/eventual-send';
import { Nat } from '@agoric/nat';
import {
  assertProposalShape,
  makeRatioFromAmounts,
  getAmountOut,
  getAmountIn,
  ceilMultiplyBy,
  ceilDivideBy,
  makeRatio,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';

import { defineKind } from '@agoric/vat-data';
import { makeInnerVault } from './vault.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { liquidate } from './liquidation.js';
import { makeTracer } from '../makeTracer.js';
import { chargeInterest } from '../interest.js';

const { details: X, quote: q } = assert;

const trace = makeTracer('VM');

/**
 * @typedef {{
 *  compoundedInterest: Ratio,
 *  interestRate: Ratio,
 *  latestInterestUpdate: bigint,
 *  totalDebt: Amount<'nat'>,
 * }} AssetState */

/**
 * @typedef {{
 *  getChargingPeriod: () => bigint,
 *  getRecordingPeriod: () => bigint,
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
 * factoryPowers: import('./vaultFactory.js').FactoryPowersFacet,
 * liquidationStrategy: LiquidationStrategy,
 * penaltyPoolSeat: ZCFSeat,
 * periodNotifier: ERef<Notifier<bigint>>,
 * poolIncrementSeat: ZCFSeat,
 * priceAuthority: ERef<PriceAuthority>,
 * prioritizedVaults: ReturnType<typeof makePrioritizedVaults>,
 * zcf: ZCF,
 * }>} ImmutableState
 */

/**
 * @typedef {{
 * assetNotifier: Notifier<AssetState>,
 * assetUpdater: IterationObserver<AssetState>,
 * compoundedInterest: Ratio,
 * latestInterestUpdate: bigint,
 * liquidationInProgress: boolean,
 * outstandingQuote: MutableQuote| null,
 * totalDebt: Amount<'nat'>,
 * vaultCounter: number,
 * }} MutableState
 */

/**
 * @typedef {{
 *   state: ImmutableState & MutableState,
 *   facets: {
 *     collateral: import('@agoric/vat-data/src/types').FunctionsMinusContext<typeof collateralBehavior>,
 *     helper: import('@agoric/vat-data/src/types').FunctionsMinusContext<typeof helperBehavior>,
 *     manager: import('@agoric/vat-data/src/types').FunctionsMinusContext<typeof managerBehavior>,
 *     self: import('@agoric/vat-data/src/types').FunctionsMinusContext<typeof selfBehavior>,
 *   }
 * }} MethodContext
 */

/**
 * Create state for the Vault Manager kind
 *
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {import('./vaultFactory.js').FactoryPowersFacet} factoryPowers
 * @param {ERef<TimerService>} timerService
 * @param {LiquidationStrategy} liquidationStrategy
 * @param {ZCFSeat} penaltyPoolSeat
 * @param {Timestamp} startTimeStamp
 */
const initState = (
  zcf,
  debtMint,
  collateralBrand,
  priceAuthority,
  factoryPowers,
  timerService,
  liquidationStrategy,
  penaltyPoolSeat,
  startTimeStamp,
) => {
  const periodNotifier = E(timerService).makeNotifier(
    0n,
    factoryPowers.getGovernedParams().getChargingPeriod(),
  );

  /** @type {ImmutableState} */
  const fixed = {
    collateralBrand,
    debtBrand: debtMint.getIssuerRecord().brand,
    debtMint,
    factoryPowers,
    liquidationStrategy,
    penaltyPoolSeat,
    periodNotifier,
    poolIncrementSeat: zcf.makeEmptySeatKit().zcfSeat,
    priceAuthority,
    /**
     * A store for vaultKits prioritized by their collaterization ratio.
     */
    prioritizedVaults: makePrioritizedVaults(),
    zcf,
  };

  const totalDebt = AmountMath.makeEmpty(fixed.debtBrand, 'nat');
  const compoundedInterest = makeRatio(100n, fixed.debtBrand); // starts at 1.0, no interest
  // timestamp of most recent update to interest
  const latestInterestUpdate = startTimeStamp;

  const { updater: assetUpdater, notifier: assetNotifier } = makeNotifierKit(
    harden({
      compoundedInterest,
      interestRate: fixed.factoryPowers.getGovernedParams().getInterestRate(),
      latestInterestUpdate,
      totalDebt,
    }),
  );

  /** @type {MutableState & ImmutableState} */
  const state = {
    ...fixed,
    assetNotifier,
    assetUpdater,
    debtBrand: fixed.debtBrand,
    vaultCounter: 0,
    liquidationInProgress: false,
    totalDebt,
    compoundedInterest,
    latestInterestUpdate,
    outstandingQuote: null,
  };

  return state;
};

const helperBehavior = {
  /**
   * @param {MethodContext} context
   * @param {Amount<'nat'>} toMint
   * @throws if minting would exceed total debt
   */
  checkDebtLimit: ({ state }, toMint) => {
    const { factoryPowers, totalDebt } = state;
    const debtPost = AmountMath.add(totalDebt, toMint);
    const limit = factoryPowers.getGovernedParams().getDebtLimit();
    if (AmountMath.isGTE(debtPost, limit)) {
      assert.fail(X`Minting would exceed total debt limit ${q(limit)}`);
    }
  },

  /**
   * @param {MethodContext} context
   * @param {bigint} updateTime
   * @param {ZCFSeat} poolIncrementSeat
   */
  chargeAllVaults: async ({ state, facets }, updateTime, poolIncrementSeat) => {
    trace('chargeAllVaults', { updateTime });
    const interestRate = state.factoryPowers
      .getGovernedParams()
      .getInterestRate();

    // Update state with the results of charging interest

    const stateUpdates = chargeInterest(
      {
        mint: state.debtMint,
        mintAndReallocateWithFee: state.factoryPowers.mintAndReallocate,
        poolIncrementSeat,
        seatAllocationKeyword: 'RUN',
      },
      {
        interestRate,
        chargingPeriod: state.factoryPowers
          .getGovernedParams()
          .getChargingPeriod(),
        recordingPeriod: state.factoryPowers
          .getGovernedParams()
          .getRecordingPeriod(),
      },
      // TODO make something like _.pick
      {
        latestInterestUpdate: state.latestInterestUpdate,
        compoundedInterest: state.compoundedInterest,
        totalDebt: state.totalDebt,
      },
      updateTime,
    );
    Object.assign(state, stateUpdates);

    /** @type {AssetState} */
    const payload = harden({
      compoundedInterest: state.compoundedInterest,
      interestRate,
      latestInterestUpdate: state.latestInterestUpdate,
      totalDebt: state.totalDebt,
    });
    state.assetUpdater.updateState(payload);

    trace('chargeAllVaults complete', payload);

    facets.helper.reschedulePriceCheck();
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
   */
  reschedulePriceCheck: async ({ state, facets }) => {
    const { prioritizedVaults } = state;
    const highestDebtRatio = prioritizedVaults.highestRatio();
    if (!highestDebtRatio) {
      // if there aren't any open vaults, we don't need an outstanding RFQ.
      trace('no open vaults');
      return;
    }

    const liquidationMargin = state.factoryPowers
      .getGovernedParams()
      .getLiquidationMargin();

    // ask to be alerted when the price level falls enough that the vault
    // with the highest debt to collateral ratio will no longer be valued at the
    // liquidationMargin above its debt.
    const triggerPoint = ceilMultiplyBy(
      highestDebtRatio.numerator, // debt
      liquidationMargin,
    );

    // if there's an outstanding quote, reset the level. If there's no current
    // quote (because this is the first loan, or because a quote just resolved)
    // then make a new request to the priceAuthority, and when it resolves,
    // liquidate anything that's above the price level.
    if (state.outstandingQuote) {
      // Safe to call extraneously (lightweight and idempotent)
      E(state.outstandingQuote).updateLevel(
        highestDebtRatio.denominator, // collateral
        triggerPoint,
      );
      trace('updating level for outstandingQuote');
      return;
    }

    if (state.liquidationInProgress) {
      return;
    }

    // There are two awaits in a row here. The first gets a mutableQuote object
    // relatively quickly from the PriceAuthority. The second schedules a
    // callback that may not fire until much later.
    // Callers shouldn't expect a response from this function.
    const { priceAuthority } = state;
    state.outstandingQuote = await E(priceAuthority).mutableQuoteWhenLT(
      highestDebtRatio.denominator, // collateral
      triggerPoint,
    );

    const quote = await E(state.outstandingQuote).getPromise();
    // When we receive a quote, we liquidate all the vaults that don't have
    // sufficient collateral, (even if the trigger was set for a different
    // level) because we use the actual price ratio plus margin here. Use
    // ceilDivide to round up because ratios above this will be liquidated.
    const quoteRatioPlusMargin = makeRatioFromAmounts(
      ceilDivideBy(getAmountOut(quote), liquidationMargin),
      getAmountIn(quote),
    );

    state.outstandingQuote = null;

    // Liquidate the head of the queue
    const [next] =
      prioritizedVaults.entriesPrioritizedGTE(quoteRatioPlusMargin);
    await (next ? facets.helper.liquidateAndRemove(next) : null);

    facets.helper.reschedulePriceCheck();
  },

  /**
   * @param {MethodContext} context
   * @param {[key: string, vaultKit: InnerVault]} record
   */
  liquidateAndRemove: ({ state }, [key, vault]) => {
    const { debtMint, factoryPowers, penaltyPoolSeat, prioritizedVaults, zcf } =
      state;
    trace('liquidating', vault.getVaultSeat().getProposal());
    state.liquidationInProgress = true;

    // Start liquidation (vaultState: LIQUIDATING)
    return liquidate(
      zcf,
      vault,
      debtMint.burnLosses,
      state.liquidationStrategy,
      state.collateralBrand,
      penaltyPoolSeat,
      factoryPowers.getGovernedParams().getLiquidationPenalty(),
    )
      .then(() => {
        prioritizedVaults?.removeVault(key);
        state.liquidationInProgress = false;
      })
      .catch(e => {
        state.liquidationInProgress = false;
        // XXX should notify interested parties
        console.error('liquidateAndRemove failed with', e);
      });
  },
};

const managerBehavior = {
  /** @param {MethodContext} context */
  getGovernedParams: ({ state }) => state.factoryPowers.getGovernedParams(),

  /**
   * @param {MethodContext} context
   * @param {Amount<'nat'>} collateralAmount
   */
  maxDebtFor: async ({ state }, collateralAmount) => {
    const { debtBrand, priceAuthority } = state;
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      debtBrand,
    );
    // floorDivide because we want the debt ceiling lower
    return floorDivideBy(
      getAmountOut(quoteAmount),
      state.factoryPowers.getGovernedParams().getLiquidationMargin(),
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
  mintAndReallocate: (
    { state, facets: { helper } },
    toMint,
    fee,
    seat,
    ...otherSeats
  ) => {
    helper.checkDebtLimit(toMint);
    state.factoryPowers.mintAndReallocate(toMint, fee, seat, ...otherSeats);
    state.totalDebt = AmountMath.add(state.totalDebt, toMint);
  },
  /**
   * @param {MethodContext} context
   * @param {Amount<'nat'>} toBurn
   * @param {ZCFSeat} seat
   */
  burnAndRecord: ({ state }, toBurn, seat) => {
    const { burnDebt } = state.factoryPowers;
    burnDebt(toBurn, seat);
    state.totalDebt = AmountMath.subtract(state.totalDebt, toBurn);
    // TODO signal updater?
  },
  /** @param {MethodContext} context */
  getNotifier: ({ state }) => state.assetNotifier,
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
   * @param {MethodContext} context
   * @param {Amount<'nat'>} oldDebt
   * @param {Amount<'nat'>} oldCollateral
   * @param {VaultId} vaultId
   */
  updateVaultPriority: ({ state }, oldDebt, oldCollateral, vaultId) => {
    const { prioritizedVaults, totalDebt } = state;
    prioritizedVaults.refreshVaultPriority(oldDebt, oldCollateral, vaultId);
    trace('updateVaultPriority complete', { totalDebt });
  },
};

const collateralBehavior = {
  /** @param {MethodContext} context */
  makeVaultInvitation: ({ state: { zcf }, facets: { self } }) =>
    zcf.makeInvitation(self.makeVaultKit, 'MakeVault'),
  /** @param {MethodContext} context */
  getNotifier: ({ state }) => state.assetNotifier,
  /** @param {MethodContext} context */
  getCompoundedInterest: ({ state }) => state.compoundedInterest,
};

const selfBehavior = {
  /** @param {MethodContext} context */
  getGovernedParams: ({ state }) => state.factoryPowers.getGovernedParams(),

  /**
   * In extreme situations, system health may require liquidating all vaults.
   * This starts the liquidations all in parallel.
   *
   * @param {MethodContext} context
   */
  liquidateAll: async ({ state, facets: { helper } }) => {
    const { prioritizedVaults } = state;
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
    const { prioritizedVaults, zcf } = state;
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { RUN: null },
    });

    state.vaultCounter += 1;
    const vaultId = String(state.vaultCounter);

    const innerVault = makeInnerVault(zcf, manager, vaultId);

    // TODO Don't record the vault until it gets opened
    const addedVaultKey = prioritizedVaults.addVault(vaultId, innerVault);

    try {
      // TODO `await` is allowed until the above ordering is fixed
      // eslint-disable-next-line @jessie.js/no-nested-await
      const vaultKit = await innerVault.initVaultKit(seat);
      seat.exit();
      return vaultKit;
    } catch (err) {
      // remove it from prioritizedVaults
      // XXX openLoan shouldn't assume it's already in the prioritizedVaults
      prioritizedVaults.removeVault(addedVaultKey);
      throw err;
    }
  },

  /** @param {MethodContext} context */
  getCollateralQuote: async ({ state }) => {
    const { debtBrand } = state;
    // get a quote for one unit of the collateral
    const displayInfo = await E(state.collateralBrand).getDisplayInfo();
    const decimalPlaces = displayInfo?.decimalPlaces || 0n;
    return E(state.priceAuthority).quoteGiven(
      AmountMath.make(state.collateralBrand, 10n ** Nat(decimalPlaces)),
      debtBrand,
    );
  },

  /** @param {MethodContext} context */
  getPublicFacet: ({ facets }) => facets.collateral,
};

/** @param {MethodContext} context */
const finish = ({ state, facets: { helper } }) => {
  state.prioritizedVaults.setRescheduler(helper.reschedulePriceCheck);

  observeNotifier(state.periodNotifier, {
    updateState: updateTime =>
      helper
        .chargeAllVaults(updateTime, state.poolIncrementSeat)
        .catch(e =>
          console.error('🚨 vaultManager failed to charge interest', e),
        ),
    fail: reason => {
      state.zcf.shutdownWithFailure(
        assert.error(X`Unable to continue without a timer: ${reason}`),
      );
    },
    finish: done => {
      state.zcf.shutdownWithFailure(
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

const makeVaultManagerKit = defineKind('VaultManagerKit', initState, behavior, {
  finish,
});

/**
 * Each VaultManager manages a single collateral type.
 *
 * It manages some number of outstanding loans, each called a Vault, for which
 * the collateral is provided in exchange for borrowed RUN.
 *
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {import('./vaultFactory.js').FactoryPowersFacet} factoryPowers
 * @param {ERef<TimerService>} timerService
 * @param {LiquidationStrategy} liquidationStrategy
 * @param {ZCFSeat} penaltyPoolSeat
 * @param {Timestamp} startTimeStamp
 */
export const makeVaultManager = (
  zcf,
  debtMint,
  collateralBrand,
  priceAuthority,
  factoryPowers,
  timerService,
  liquidationStrategy,
  penaltyPoolSeat,
  startTimeStamp,
) =>
  makeVaultManagerKit(
    zcf,
    debtMint,
    collateralBrand,
    priceAuthority,
    factoryPowers,
    timerService,
    liquidationStrategy,
    penaltyPoolSeat,
    startTimeStamp,
  ).self;

/** @typedef {ReturnType<typeof makeVaultManager>} VaultManager */
/** @typedef {ReturnType<VaultManager['getPublicFacet']>} CollateralManager */
