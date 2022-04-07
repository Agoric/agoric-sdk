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
import { Far } from '@endo/marshal';

import { makeInnerVault } from './vault.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { liquidate } from './liquidation.js';
import { makeTracer } from '../makeTracer.js';
import { RECORDING_PERIOD_KEY, CHARGING_PERIOD_KEY } from './params.js';
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
 *  getDebtLimit: () => Amount<'nat'>,
 *  getInterestRate: () => Ratio,
 *  getLiquidationMargin: () => Ratio,
 *  getLiquidationPenalty: () => Ratio,
 *  getLoanFee: () => Ratio,
 * }} GovernedParamGetters
 */

/**
 * @typedef {Readonly<{
 * chargingPeriod: bigint,
 * collateralBrand: Brand<'nat'>,
 * debtBrand: Brand<'nat'>,
 * debtMint: ZCFMint<'nat'>,
 * governedParams: GovernedParamGetters,
 * liquidationStrategy: LiquidationStrategy,
 * penaltyPoolSeat: ZCFSeat,
 * periodNotifier: ERef<Notifier<bigint>>,
 * priceAuthority: ERef<PriceAuthority>,
 * prioritizedVaults: ReturnType<typeof makePrioritizedVaults>,
 * recordingPeriod: bigint,
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
 * outstandingQuote?: MutableQuote,
 * totalDebt: Amount<'nat'>,
 * vaultCounter: number,
 * }} MutableState
 */

/**
 * Create state for the Vault Manager kind
 *
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {{
 *  ChargingPeriod: ParamRecord<'nat'>
 *  RecordingPeriod: ParamRecord<'nat'>
 * }} timingParams
 * @param {{
 *  getDebtLimit: () => Amount<'nat'>,
 *  getInterestRate: () => Ratio,
 *  getLiquidationMargin: () => Ratio,
 *  getLiquidationPenalty: () => Ratio,
 *  getLoanFee: () => Ratio,
 * }} loanParamGetters
 * @param {MintAndReallocate} mintAndReallocateWithFee
 * @param {BurnDebt}  burnDebt
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
  timingParams,
  loanParamGetters,
  mintAndReallocateWithFee,
  burnDebt,
  timerService,
  liquidationStrategy,
  penaltyPoolSeat,
  startTimeStamp,
) => {
  const periodNotifier = E(timerService).makeNotifier(
    0n,
    timingParams[RECORDING_PERIOD_KEY].value,
  );

  /** @type {ImmutableState} */
  const fixed = {
    collateralBrand,
    chargingPeriod: timingParams[CHARGING_PERIOD_KEY].value,
    debtBrand: debtMint.getIssuerRecord().brand,
    debtMint,
    governedParams: loanParamGetters,
    liquidationStrategy,
    penaltyPoolSeat,
    periodNotifier,
    priceAuthority,
    recordingPeriod: timingParams[RECORDING_PERIOD_KEY].value,
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
      interestRate: fixed.governedParams.getInterestRate(),
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
  };

  return state;
};

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
 * @param {{
 *  ChargingPeriod: ParamRecord<'nat'>
 *  RecordingPeriod: ParamRecord<'nat'>
 * }} timingParams
 * @param {{
 *  getDebtLimit: () => Amount<'nat'>,
 *  getInterestRate: () => Ratio,
 *  getLiquidationMargin: () => Ratio,
 *  getLiquidationPenalty: () => Ratio,
 *  getLoanFee: () => Ratio,
 * }} loanParamGetters
 * @param {MintAndReallocate} mintAndReallocateWithFee
 * @param {BurnDebt}  burnDebt
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
  timingParams,
  loanParamGetters,
  mintAndReallocateWithFee,
  burnDebt,
  timerService,
  liquidationStrategy,
  penaltyPoolSeat,
  startTimeStamp,
) => {
  const state = initState(
    zcf,
    debtMint,
    collateralBrand,
    priceAuthority,
    timingParams,
    loanParamGetters,
    mintAndReallocateWithFee,
    burnDebt,
    timerService,
    liquidationStrategy,
    penaltyPoolSeat,
    startTimeStamp,
  );

  /** @type {GetVaultParams} */
  const shared = {
    ...loanParamGetters,
    getChargingPeriod: () => state.chargingPeriod,
    getRecordingPeriod: () => state.recordingPeriod,
    async getCollateralQuote() {
      const { debtBrand } = state;
      // get a quote for one unit of the collateral
      const displayInfo = await E(collateralBrand).getDisplayInfo();
      const decimalPlaces = displayInfo?.decimalPlaces || 0n;
      return E(priceAuthority).quoteGiven(
        AmountMath.make(collateralBrand, 10n ** Nat(decimalPlaces)),
        debtBrand,
      );
    },
  };

  /**
   *
   * @param {[key: string, vaultKit: InnerVault]} record
   */
  const liquidateAndRemove = ([key, vault]) => {
    const { prioritizedVaults } = state;
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
      loanParamGetters.getLiquidationPenalty(),
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
  };

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
   */
  const reschedulePriceCheck = async () => {
    const { outstandingQuote } = state;
    const { liquidationInProgress, prioritizedVaults } = state;
    const highestDebtRatio = prioritizedVaults.highestRatio();
    if (!highestDebtRatio) {
      // if there aren't any open vaults, we don't need an outstanding RFQ.
      trace('no open vaults');
      return;
    }

    const liquidationMargin = shared.getLiquidationMargin();

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
    if (outstandingQuote) {
      // Safe to call extraneously (lightweight and idempotent)
      E(outstandingQuote).updateLevel(
        highestDebtRatio.denominator, // collateral
        triggerPoint,
      );
      trace('updating level for outstandingQuote');
      return;
    }

    if (liquidationInProgress) {
      return;
    }

    // There are two awaits in a row here. The first gets a mutableQuote object
    // relatively quickly from the PriceAuthority. The second schedules a
    // callback that may not fire until much later.
    // Callers shouldn't expect a response from this function.
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

    state.outstandingQuote = undefined;

    // Liquidate the head of the queue
    const [next] =
      prioritizedVaults.entriesPrioritizedGTE(quoteRatioPlusMargin);
    await (next ? liquidateAndRemove(next) : null);

    reschedulePriceCheck();
  };
  state.prioritizedVaults.setRescheduler(reschedulePriceCheck);

  /**
   * In extreme situations, system health may require liquidating all vaults.
   * This starts the liquidations all in parallel.
   */
  const liquidateAll = async () => {
    const { prioritizedVaults } = state;
    const toLiquidate = Array.from(prioritizedVaults.entries()).map(
      liquidateAndRemove,
    );
    await Promise.all(toLiquidate);
  };

  /**
   *
   * @param {bigint} updateTime
   * @param {ZCFSeat} poolIncrementSeat
   */
  const chargeAllVaults = async (updateTime, poolIncrementSeat) => {
    trace('chargeAllVaults', { updateTime });
    const interestRate = shared.getInterestRate();

    // Update state with the results of charging interest

    const stateUpdates = chargeInterest(
      {
        mint: debtMint,
        mintAndReallocateWithFee,
        poolIncrementSeat,
        seatAllocationKeyword: 'RUN',
      },
      {
        interestRate,
        chargingPeriod: shared.getChargingPeriod(),
        recordingPeriod: shared.getRecordingPeriod(),
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

    reschedulePriceCheck();
  };

  /**
   * @param {Amount<'nat'>} toMint
   * @throws if minting would exceed total debt
   */
  const checkDebtLimit = toMint => {
    const { totalDebt } = state;
    const debtPost = AmountMath.add(totalDebt, toMint);
    const limit = loanParamGetters.getDebtLimit();
    if (AmountMath.isGTE(debtPost, limit)) {
      assert.fail(X`Minting would exceed total debt limit ${q(limit)}`);
    }
  };

  const maxDebtFor = async collateralAmount => {
    const { debtBrand } = state;
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      debtBrand,
    );
    // floorDivide because we want the debt ceiling lower
    return floorDivideBy(
      getAmountOut(quoteAmount),
      shared.getLiquidationMargin(),
    );
  };

  /**
   * @param {Amount<'nat'>} oldDebt
   * @param {Amount<'nat'>} oldCollateral
   * @param {VaultId} vaultId
   */
  const updateVaultPriority = (oldDebt, oldCollateral, vaultId) => {
    const { prioritizedVaults, totalDebt } = state;
    prioritizedVaults.refreshVaultPriority(oldDebt, oldCollateral, vaultId);
    trace('updateVaultPriority complete', { totalDebt });
  };

  const { zcfSeat: poolIncrementSeat } = zcf.makeEmptySeatKit();

  const timeObserver = {
    updateState: updateTime =>
      chargeAllVaults(updateTime, poolIncrementSeat).catch(e =>
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
  };

  observeNotifier(state.periodNotifier, timeObserver);

  /** @type {MintAndReallocate} */
  const mintAndReallocate = (toMint, fee, seat, ...otherSeats) => {
    checkDebtLimit(toMint);
    mintAndReallocateWithFee(toMint, fee, seat, ...otherSeats);
    state.totalDebt = AmountMath.add(state.totalDebt, toMint);
  };

  const burnAndRecord = (toBurn, seat) => {
    burnDebt(toBurn, seat);
    state.totalDebt = AmountMath.subtract(state.totalDebt, toBurn);
    // TODO signal updater?
  };

  /** @type {Parameters<typeof makeInnerVault>[1]} */
  const managerFacet = Far('managerFacet', {
    ...shared,
    maxDebtFor,
    mintAndReallocate,
    burnAndRecord,
    getNotifier: () => state.assetNotifier,
    getCollateralBrand: () => collateralBrand,
    getDebtBrand: () => state.debtBrand,
    getCompoundedInterest: () => state.compoundedInterest,
    updateVaultPriority,
  });

  /** @param {ZCFSeat} seat */
  const makeVaultKit = async seat => {
    const { prioritizedVaults } = state;
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { RUN: null },
    });

    state.vaultCounter += 1;
    const vaultId = String(state.vaultCounter);

    const innerVault = makeInnerVault(zcf, managerFacet, vaultId);

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
  };

  const publicFacet = Far('collateral manager', {
    makeVaultInvitation: () => zcf.makeInvitation(makeVaultKit, 'MakeVault'),
    getNotifier: () => state.assetNotifier,
    getCompoundedInterest: () => state.compoundedInterest,
  });

  return Far('vault manager', {
    ...shared,
    makeVaultKit,
    liquidateAll,
    getPublicFacet: () => publicFacet,
  });
};

/** @typedef {ReturnType<typeof makeVaultManager>} VaultManager */
/** @typedef {ReturnType<VaultManager['getPublicFacet']>} CollateralManager */
