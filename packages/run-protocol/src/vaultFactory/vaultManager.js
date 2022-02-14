// @ts-check
import '@agoric/zoe/exported.js';

import { E } from '@agoric/eventual-send';
import { Nat } from '@agoric/nat';
import {
  assertProposalShape,
  makeRatioFromAmounts,
  getAmountOut,
  getAmountIn,
  ceilMultiplyBy,
  ceilDivideBy,
  makeRatio,
  multiplyRatios,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';

import { makeInnerVault } from './vault.js';
import { makePrioritizedVaults } from './prioritizedVaults.js';
import { liquidate } from './liquidation.js';
import { makeTracer } from '../makeTracer.js';
import {
  RECORDING_PERIOD_KEY,
  LIQUIDATION_MARGIN_KEY,
  INITIAL_MARGIN_KEY,
  LOAN_FEE_KEY,
  INTEREST_RATE_KEY,
  CHARGING_PERIOD_KEY,
} from './params.js';
import { makeInterestCalculator } from './interest.js';

const { details: X } = assert;

const trace = makeTracer('VM');

/**
 * Each VaultManager manages a single collateralType.
 *
 * It owns an autoswap instance which trades this collateralType against RUN. It
 * also manages some number of outstanding loans, each called a Vault, for which
 * the collateral is provided in exchange for borrowed RUN.
 *
 * @param {ContractFacet} zcf
 * @param {ZCFMint} runMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {{
 *  ChargingPeriod: ParamRecord<'relativeTime'> & { value: RelativeTime },
 *  RecordingPeriod: ParamRecord<'relativeTime'> & { value: RelativeTime },
 * }} timingParams
 * @param {GetGovernedVaultParams} getLoanParams
 * @param {ReallocateReward} reallocateReward
 * @param {ERef<TimerService>} timerService
 * @param {LiquidationStrategy} liquidationStrategy
 * @param {Timestamp} startTimeStamp
 * @returns {VaultManager}
 */
export const makeVaultManager = (
  zcf,
  runMint,
  collateralBrand,
  priceAuthority,
  timingParams,
  getLoanParams,
  reallocateReward,
  timerService,
  liquidationStrategy,
  startTimeStamp,
) => {
  const { brand: runBrand } = runMint.getIssuerRecord();

  const { updater: assetUpdater, notifier: assetNotifer } = makeNotifierKit(
    harden({
      compoundedInterest: makeRatio(1n, runBrand, 1n, runBrand),
      latestInterestUpdate: 0n,
      totalDebt: AmountMath.makeEmpty(runBrand),
    }),
  );

  /** @type {GetVaultParams} */
  const shared = {
    // loans below this margin may be liquidated
    getLiquidationMargin: () => getLoanParams()[LIQUIDATION_MARGIN_KEY].value,
    // loans must initially have at least 1.2x collateralization
    getInitialMargin: () => getLoanParams()[INITIAL_MARGIN_KEY].value,
    getLoanFee: () => getLoanParams()[LOAN_FEE_KEY].value,
    getInterestRate: () => getLoanParams()[INTEREST_RATE_KEY].value,
    getChargingPeriod: () => timingParams[CHARGING_PERIOD_KEY].value,
    getRecordingPeriod: () => timingParams[RECORDING_PERIOD_KEY].value,
    async getCollateralQuote() {
      // get a quote for one unit of the collateral
      const displayInfo = await E(collateralBrand).getDisplayInfo();
      const decimalPlaces = displayInfo?.decimalPlaces || 0n;
      return E(priceAuthority).quoteGiven(
        AmountMath.make(collateralBrand, 10n ** Nat(decimalPlaces)),
        runBrand,
      );
    },
  };

  let vaultCounter = 0;

  // A Map from vaultKits to their most recent ratio of debt to
  // collateralization. (This representation won't be optimized; when we need
  // better performance, use virtual objects.)
  //
  // sortedVaultKits should only be set once, but can't be set until after the
  // definition of reschedulePriceCheck, which refers to sortedVaultKits
  // XXX mutability and flow control
  /** @type {ReturnType<typeof makePrioritizedVaults>=} */
  let prioritizedVaults;
  /** @type {MutableQuote=} */
  let outstandingQuote;
  /** @type {Amount} */
  let totalDebt = AmountMath.makeEmpty(runBrand);
  /** @type {Ratio}} */
  let compoundedInterest = makeRatio(100n, runBrand); // starts at 1.0, no interest

  // timestamp of most recent update to interest
  /** @type {bigint} */
  let latestInterestUpdate = startTimeStamp;

  /**
   *
   * @param {[key: string, vaultKit: InnerVault]} record
   */
  const liquidateAndRemove = async ([key, vault]) => {
    assert(prioritizedVaults);
    trace('liquidating', vault.getVaultSeat().getProposal());

    try {
      // Start liquidation (vaultState: LIQUIDATING)
      await liquidate(
        zcf,
        vault,
        runMint.burnLosses,
        liquidationStrategy,
        collateralBrand,
      );

      await prioritizedVaults.removeVault(key);
    } catch (e) {
      // XXX should notify interested parties
      console.error('liquidateAndRemove failed with', e);
    }
  };

  // When any Vault's debt ratio is higher than the current high-water level,
  // call reschedulePriceCheck() to request a fresh notification from the
  // priceAuthority. There will be extra outstanding requests since we can't
  // cancel them. (https://github.com/Agoric/agoric-sdk/issues/2713). When the
  // vault with the current highest debt ratio is removed or reduces its ratio,
  // we won't reschedule the priceAuthority requests to reduce churn. Instead,
  // when a priceQuote is received, we'll only reschedule if the high-water
  // level when the request was made matches the current high-water level.
  const reschedulePriceCheck = async () => {
    assert(prioritizedVaults);
    const highestDebtRatio = prioritizedVaults.highestRatio();
    if (!highestDebtRatio) {
      // if there aren't any open vaults, we don't need an outstanding RFQ.
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
      return;
    }

    outstandingQuote = await E(priceAuthority).mutableQuoteWhenLT(
      highestDebtRatio.denominator, // collateral
      triggerPoint,
    );

    // There are two awaits in a row here. The first gets a mutableQuote object
    // relatively quickly from the PriceAuthority. The second schedules a
    // callback that may not fire until much later.
    // Callers shouldn't expect a response from this function.
    const quote = await E(outstandingQuote).getPromise();
    // When we receive a quote, we liquidate all the vaults that don't have
    // sufficient collateral, (even if the trigger was set for a different
    // level) because we use the actual price ratio plus margin here. Use
    // ceilDivide to round up because ratios above this will be liquidated.
    const quoteRatioPlusMargin = makeRatioFromAmounts(
      ceilDivideBy(getAmountOut(quote), liquidationMargin),
      getAmountIn(quote),
    );

    /** @type {Array<Promise<void>>} */
    const toLiquidate = Array.from(
      prioritizedVaults.entriesPrioritizedGTE(quoteRatioPlusMargin),
    ).map(liquidateAndRemove);

    outstandingQuote = undefined;
    // Ensure all vaults complete
    await Promise.all(toLiquidate);

    reschedulePriceCheck();
  };
  prioritizedVaults = makePrioritizedVaults(reschedulePriceCheck);

  // In extreme situations, system health may require liquidating all vaults.
  const liquidateAll = async () => {
    assert(prioritizedVaults);
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
    trace('chargeAllVault', { updateTime });
    const interestCalculator = makeInterestCalculator(
      runBrand,
      shared.getInterestRate(),
      shared.getChargingPeriod(),
      shared.getRecordingPeriod(),
    );

    // calculate delta of accrued debt
    const debtStatus = interestCalculator.calculateReportingPeriod(
      {
        latestInterestUpdate,
        newDebt: totalDebt,
        interest: AmountMath.makeEmpty(runBrand),
      },
      updateTime,
    );
    const interestAccrued = debtStatus.interest;

    // done if none
    if (AmountMath.isEmpty(interestAccrued)) {
      return;
    }

    // compoundedInterest *= debtStatus.newDebt / totalDebt;
    compoundedInterest = multiplyRatios(
      compoundedInterest,
      makeRatioFromAmounts(debtStatus.newDebt, totalDebt),
    );
    totalDebt = AmountMath.add(totalDebt, interestAccrued);

    // mint that much RUN for the reward pool
    runMint.mintGains(harden({ RUN: interestAccrued }), poolIncrementSeat);
    reallocateReward(interestAccrued, poolIncrementSeat);

    // update running tally of total debt against this collateral
    ({ latestInterestUpdate } = debtStatus);

    const payload = harden({
      compoundedInterest,
      latestInterestUpdate,
      totalDebt,
    });
    assetUpdater.updateState(payload);

    trace('chargeAllVaults complete', payload);

    reschedulePriceCheck();
  };

  /**
   * @param {Amount} oldDebt - principal and all accrued interest
   * @param {Amount} newDebt - principal and all accrued interest
   * @returns {bigint} in brand of the manager's debt
   */
  const debtDelta = (oldDebt, newDebt) => {
    // Since newDebt includes accrued interest we need to use getDebtAmount()
    // to get a baseline that also includes accrued interest.
    // XXXeslint-disable-next-line no-use-before-define
    const priorDebtValue = oldDebt.value;
    const newDebtValue = newDebt.value;
    // We can't used AmountMath because the delta can be negative.
    assert.typeof(
      priorDebtValue,
      'bigint',
      'vault debt supports only bigint amounts',
    );
    assert.typeof(
      newDebtValue,
      'bigint',
      'vault debt supports only bigint amounts',
    );
    return newDebtValue - priorDebtValue;
  };

  /**
   * @param {Amount} oldDebtOnVault
   * @param {Amount} newDebtOnVault
   */
  const applyDebtDelta = (oldDebtOnVault, newDebtOnVault) => {
    const delta = debtDelta(oldDebtOnVault, newDebtOnVault);
    trace(
      `updating total debt of ${totalDebt.value} ${totalDebt.brand} by ${delta}`,
    );
    if (delta === 0n) {
      // nothing to do
      return;
    }

    if (delta > 0n) {
      // add the amount
      totalDebt = AmountMath.add(
        totalDebt,
        AmountMath.make(totalDebt.brand, delta),
      );
    } else {
      // negate the amount so that it's a natural number, then subtract
      const absDelta = -delta;
      assert(
        !(absDelta > totalDebt.value),
        'Negative delta greater than total debt',
      );
      totalDebt = AmountMath.subtract(
        totalDebt,
        AmountMath.make(totalDebt.brand, absDelta),
      );
    }
    trace('applyDebtDelta complete', { totalDebt });
  };

  /**
   * @param {Amount} oldDebt
   * @param {Amount} oldCollateral
   * @param {VaultId} vaultId
   */
  const updateVaultPriority = (oldDebt, oldCollateral, vaultId) => {
    assert(prioritizedVaults);
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
      chargeAllVaults(updateTime, poolIncrementSeat).catch(console.error),
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

  /** @type {Parameters<typeof makeInnerVault>[1]} */
  const managerFacade = harden({
    ...shared,
    applyDebtDelta,
    reallocateReward,
    getCollateralBrand: () => collateralBrand,
    getCompoundedInterest: () => compoundedInterest,
    updateVaultPriority,
  });

  /** @param {ZCFSeat} seat */
  const makeVaultKit = async seat => {
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { RUN: null },
    });

    // eslint-disable-next-line no-plusplus
    const vaultId = String(vaultCounter++);

    const innerVault = makeInnerVault(
      zcf,
      managerFacade,
      assetNotifer,
      vaultId,
      runMint,
      priceAuthority,
    );

    // Don't record the vault until it gets opened
    // TODO
    assert(prioritizedVaults);
    prioritizedVaults.addVault(vaultId, innerVault);
    
    const vault = await innerVault.initVault(seat);

    seat.exit();

    return harden({
      uiNotifier: vault.getNotifier(),
      invitationMakers: Far('invitation makers', {
        AdjustBalances: vault.makeAdjustBalancesInvitation,
        CloseVault: vault.makeCloseInvitation,
        // TransferVault: vault.makeTransferVaultInvitation,
      }),
      vault,
    });
  };

  /** @type {VaultManager} */
  return Far('vault manager', {
    ...shared,
    makeVaultKit,
    liquidateAll,
  });
};
