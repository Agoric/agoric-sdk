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
} from '@agoric/zoe/src/contractSupport/index.js';
import { observeNotifier } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

import { makeVaultKit } from './vault.js';
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

const { details: X } = assert;

const trace = makeTracer(' VM ');

// Each VaultManager manages a single collateralType. It owns an autoswap
// instance which trades this collateralType against RUN. It also manages
// some number of outstanding loans, each called a Vault, for which the
// collateral is provided in exchange for borrowed RUN.

/** @type {MakeVaultManager} */
export const makeVaultManager = (
  zcf,
  runMint,
  collateralBrand,
  priceAuthority,
  getLoanParams,
  reallocateReward,
  timerService,
  liquidationStrategy,
) => {
  const { brand: runBrand } = runMint.getIssuerRecord();

  const getLoanParamValue = key => getLoanParams()[key].value;

  /** @type {GetVaultParams} */
  const shared = {
    // loans below this margin may be liquidated
    getLiquidationMargin() {
      return (
        /** @type {Ratio} */
        (getLoanParamValue(LIQUIDATION_MARGIN_KEY))
      );
    },
    // loans must initially have at least 1.2x collateralization
    getInitialMargin() {
      return (
        /** @type {Ratio} */
        (getLoanParamValue(INITIAL_MARGIN_KEY))
      );
    },
    getLoanFee() {
      return (
        /** @type {Ratio} */
        (getLoanParamValue(LOAN_FEE_KEY))
      );
    },
    getInterestRate() {
      return (
        /** @type {Ratio} */
        (getLoanParamValue(INTEREST_RATE_KEY))
      );
    },
    getChargingPeriod() {
      return (
        /** @type {RelativeTime} */
        (getLoanParamValue(CHARGING_PERIOD_KEY))
      );
    },
    getRecordingPeriod() {
      return (
        /** @type {RelativeTime} */
        (getLoanParamValue(RECORDING_PERIOD_KEY))
      );
    },
    async getCollateralQuote() {
      // get a quote for one unit of the collateral
      const displayInfo = await E(collateralBrand).getDisplayInfo();
      const decimalPlaces = (displayInfo && displayInfo.decimalPlaces) || 0n;
      return E(priceAuthority).quoteGiven(
        AmountMath.make(collateralBrand, 10n ** Nat(decimalPlaces)),
        runBrand,
      );
    },
  };

  // A Map from vaultKits to their most recent ratio of debt to
  // collateralization. (This representation won't be optimized; when we need
  // better performance, use virtual objects.)
  //
  // sortedVaultKits should only be set once, but can't be set until after the
  // definition of reschedulePriceCheck, which refers to sortedVaultKits
  let sortedVaultKits;
  let outstandingQuote;

  // When any Vault's debt ratio is higher than the current high-water level,
  // call reschedulePriceCheck() to request a fresh notification from the
  // priceAuthority. There will be extra outstanding requests since we can't
  // cancel them. (https://github.com/Agoric/agoric-sdk/issues/2713). When the
  // vault with the current highest debt ratio is removed or reduces its ratio,
  // we won't reschedule the priceAuthority requests to reduce churn. Instead,
  // when a priceQuote is received, we'll only reschedule if the high-water
  // level when the request was made matches the current high-water level.
  const reschedulePriceCheck = async () => {
    const highestDebtRatio = sortedVaultKits.highestRatio();
    if (!highestDebtRatio) {
      // if there aren't any open vaults, we don't need an outstanding RFQ.
      return;
    }

    const liquidationMargin = shared.getLiquidationMargin();

    // ask to be alerted when the price level falls enough that the vault
    // with the highest debt to collateral ratio will no longer be valued at the
    // liquidationMargin above its debt.
    const triggerPoint = ceilMultiplyBy(
      highestDebtRatio.numerator,
      liquidationMargin,
    );

    // if there's an outstanding quote, reset the level. If there's no current
    // quote (because this is the first loan, or because a quote just resolved)
    // then make a new request to the priceAuthority, and when it resolves,
    // liquidate anything that's above the price level.
    if (outstandingQuote) {
      E(outstandingQuote).updateLevel(
        highestDebtRatio.denominator,
        triggerPoint,
      );
      return;
    }

    outstandingQuote = await E(priceAuthority).mutableQuoteWhenLT(
      highestDebtRatio.denominator,
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

    sortedVaultKits.forEachRatioGTE(quoteRatioPlusMargin, ({ vaultKit }) => {
      trace('liquidating', vaultKit.vaultSeat.getProposal());

      liquidate(
        zcf,
        vaultKit,
        runMint.burnLosses,
        liquidationStrategy,
        collateralBrand,
      );
    });
    outstandingQuote = undefined;
    reschedulePriceCheck();
  };
  sortedVaultKits = makePrioritizedVaults(reschedulePriceCheck);

  const liquidateAll = () => {
    const promises = sortedVaultKits.map(({ vaultKit }) =>
      liquidate(
        zcf,
        vaultKit,
        runMint.burnLosses,
        liquidationStrategy,
        collateralBrand,
      ),
    );
    return Promise.all(promises);
  };

  const chargeAllVaults = async (updateTime, poolIncrementSeat) => {
    const poolIncrement = sortedVaultKits.reduce(
      (total, vaultPair) =>
        AmountMath.add(
          total,
          vaultPair.vaultKit.accrueInterestAndAddToPool(updateTime),
        ),
      AmountMath.makeEmpty(runBrand),
    );
    sortedVaultKits.updateAllDebts();
    reschedulePriceCheck();
    runMint.mintGains(harden({ RUN: poolIncrement }), poolIncrementSeat);
    reallocateReward(poolIncrement, poolIncrementSeat);
  };

  const periodNotifier = E(timerService).makeNotifier(
    0n,
    /** @type {bigint} */ (getLoanParamValue(RECORDING_PERIOD_KEY)),
  );
  const { zcfSeat: poolIncrementSeat } = zcf.makeEmptySeatKit();

  const timeObserver = {
    updateState: updateTime =>
      chargeAllVaults(updateTime, poolIncrementSeat).catch(_ => {}),
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

  /** @type {InnerVaultManager} */
  const innerFacet = harden({
    ...shared,
    reallocateReward,
    getCollateralBrand: () => collateralBrand,
  });

  /** @param {ZCFSeat} seat */
  const makeLoanKit = async seat => {
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { RUN: null },
    });

    const startTimeStamp = await E(timerService).getCurrentTimestamp();
    const vaultKit = makeVaultKit(
      zcf,
      innerFacet,
      runMint,
      priceAuthority,
      startTimeStamp,
    );

    const { vault, openLoan } = vaultKit;
    const { notifier } = await openLoan(seat);
    sortedVaultKits.addVaultKit(vaultKit, notifier);

    seat.exit();

    return harden({
      uiNotifier: notifier,
      invitationMakers: Far('invitation makers', {
        AdjustBalances: vault.makeAdjustBalancesInvitation,
        CloseVault: vault.makeCloseInvitation,
      }),
      vault,
    });
  };

  /** @type {VaultManager} */
  return Far('vault manager', {
    ...shared,
    makeLoanKit,
    liquidateAll,
  });
};
