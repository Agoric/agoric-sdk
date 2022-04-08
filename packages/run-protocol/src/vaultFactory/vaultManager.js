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

const trace = makeTracer('VM', false);

/**
 * @typedef {{
 *  compoundedInterest: Ratio,
 *  interestRate: Ratio,
 *  latestInterestUpdate: bigint,
 *  totalDebt: Amount<'nat'>,
 * }} AssetState */

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
  /** @type {{brand: Brand<'nat'>}} */
  const { brand: debtBrand } = debtMint.getIssuerRecord();

  /** @type {GetVaultParams} */
  const shared = {
    ...loanParamGetters,
    getChargingPeriod: () => timingParams[CHARGING_PERIOD_KEY].value,
    getRecordingPeriod: () => timingParams[RECORDING_PERIOD_KEY].value,
    async getCollateralQuote() {
      // get a quote for one unit of the collateral
      const displayInfo = await E(collateralBrand).getDisplayInfo();
      const decimalPlaces = displayInfo?.decimalPlaces || 0n;
      return E(priceAuthority).quoteGiven(
        AmountMath.make(collateralBrand, 10n ** Nat(decimalPlaces)),
        debtBrand,
      );
    },
  };

  let vaultCounter = 0;
  let liquidationInProgress = false;

  /**
   * A store for vaultKits prioritized by their collaterization ratio.
   *
   * @type {ReturnType<typeof makePrioritizedVaults>}
   */
  const prioritizedVaults = makePrioritizedVaults();

  /** @type {MutableQuote=} */
  let outstandingQuote;
  /** @type {Amount<'nat'>} */
  let totalDebt = AmountMath.makeEmpty(debtBrand, 'nat');
  /** @type {Ratio}} */
  let compoundedInterest = makeRatio(100n, debtBrand); // starts at 1.0, no interest

  /**
   * timestamp of most recent update to interest
   *
   * @type {bigint}
   */
  let latestInterestUpdate = startTimeStamp;

  const { updater: assetUpdater, notifier: assetNotifer } = makeNotifierKit(
    harden({
      compoundedInterest,
      interestRate: shared.getInterestRate(),
      latestInterestUpdate,
      totalDebt,
    }),
  );

  /**
   *
   * @param {[key: string, vaultKit: InnerVault]} record
   */
  const liquidateAndRemove = ([key, vault]) => {
    trace('liquidating', vault.getVaultSeat().getProposal());
    liquidationInProgress = true;

    // Start liquidation (vaultState: LIQUIDATING)
    return liquidate(
      zcf,
      vault,
      debtMint.burnLosses,
      liquidationStrategy,
      collateralBrand,
      penaltyPoolSeat,
      loanParamGetters.getLiquidationPenalty(),
    )
      .then(() => {
        prioritizedVaults?.removeVault(key);
        liquidationInProgress = false;
      })
      .catch(e => {
        liquidationInProgress = false;
        // XXX should notify interested parties
        console.error('liquidateAndRemove failed with', e);
        throw e;
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
    outstandingQuote = await E(priceAuthority).mutableQuoteWhenLT(
      highestDebtRatio.denominator, // collateral
      triggerPoint,
    );

    const quote = await E(outstandingQuote).getPromise();
    // When we receive a quote, we liquidate all the vaults that don't have
    // sufficient collateral, (even if the trigger was set for a different
    // level) because we use the actual price ratio plus margin here. Use
    // ceilDivide to round up because ratios above this will be liquidated.
    const quoteRatioPlusMargin = makeRatioFromAmounts(
      ceilDivideBy(getAmountOut(quote), liquidationMargin),
      getAmountIn(quote),
    );

    outstandingQuote = undefined;

    // Liquidate the head of the queue
    const [next] =
      prioritizedVaults.entriesPrioritizedGTE(quoteRatioPlusMargin);
    await (next ? liquidateAndRemove(next) : null);

    reschedulePriceCheck();
  };
  prioritizedVaults.setRescheduler(reschedulePriceCheck);

  /**
   * In extreme situations, system health may require liquidating all vaults.
   * This starts the liquidations all in parallel.
   */
  const liquidateAll = async () => {
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

    // Update local state with the results of charging interest
    ({ compoundedInterest, latestInterestUpdate, totalDebt } = chargeInterest(
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
      { latestInterestUpdate, compoundedInterest, totalDebt },
      updateTime,
    ));

    /** @type {AssetState} */
    const payload = harden({
      compoundedInterest,
      interestRate,
      latestInterestUpdate,
      totalDebt,
    });
    assetUpdater.updateState(payload);

    trace('chargeAllVaults complete', payload);

    reschedulePriceCheck();
  };

  /**
   * @param {Amount<'nat'>} toMint
   * @throws if minting would exceed total debt
   */
  const checkDebtLimit = toMint => {
    const debtPost = AmountMath.add(totalDebt, toMint);
    const limit = loanParamGetters.getDebtLimit();
    if (AmountMath.isGTE(debtPost, limit)) {
      assert.fail(
        X`Minting ${toMint} would exceed total debt limit ${q(limit)}`,
      );
    }
  };

  const maxDebtFor = async collateralAmount => {
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
    prioritizedVaults.refreshVaultPriority(oldDebt, oldCollateral, vaultId);
    trace('updateVaultPriority complete', { totalDebt });
  };

  const periodNotifier = E(timerService).makeNotifier(
    0n,
    timingParams[RECORDING_PERIOD_KEY].value,
  );
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

  observeNotifier(periodNotifier, timeObserver);

  /** @type {MintAndReallocate} */
  const mintAndReallocate = (toMint, fee, seat, ...otherSeats) => {
    checkDebtLimit(toMint);
    mintAndReallocateWithFee(toMint, fee, seat, ...otherSeats);
    totalDebt = AmountMath.add(totalDebt, toMint);
  };

  const burnAndRecord = (toBurn, seat) => {
    burnDebt(toBurn, seat);
    totalDebt = AmountMath.subtract(totalDebt, toBurn);
    // TODO signal updater?
  };

  /** @type {Parameters<typeof makeInnerVault>[1]} */
  const managerFacet = Far('managerFacet', {
    ...shared,
    maxDebtFor,
    mintAndReallocate,
    burnAndRecord,
    getNotifier: () => assetNotifer,
    getCollateralBrand: () => collateralBrand,
    getDebtBrand: () => debtBrand,
    getCompoundedInterest: () => compoundedInterest,
    updateVaultPriority,
  });

  /** @param {ZCFSeat} seat */
  const makeVaultKit = async seat => {
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { RUN: null },
    });

    vaultCounter += 1;
    const vaultId = String(vaultCounter);

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
    getNotifier: () => assetNotifer,
    getCompoundedInterest: () => compoundedInterest,
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
