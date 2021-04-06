// @ts-check
import '@agoric/zoe/exported';

import { E } from '@agoric/eventual-send';
import { Nat } from '@agoric/nat';
import {
  assertProposalShape,
  makeRatioFromAmounts,
  getAmountOut,
  getAmountIn,
  divideBy,
  multiplyBy,
} from '@agoric/zoe/src/contractSupport';
import { observeNotifier } from '@agoric/notifier';
import { amountMath } from '@agoric/ertp';
import { makeVaultKit } from './vault';
import { makePrioritizedVaults } from './prioritizedVaults';
import { liquidate } from './liquidation';
import { makeTracer } from './makeTracer';

const trace = makeTracer(' VM ');

// Each VaultManager manages a single collateralType. It owns an autoswap
// instance which trades this collateralType against RUN. It also manages
// some number of outstanding loans, each called a Vault, for which the
// collateral is provided in exchange for borrowed RUN.

/** @type {MakeVaultManager} */
export function makeVaultManager(
  zcf,
  autoswap,
  runMint,
  collateralBrand,
  priceAuthority,
  rates,
  stageReward,
  timerService,
  loanParams,
  liquidationStrategy,
) {
  const { brand: runBrand } = runMint.getIssuerRecord();

  const shared = {
    // loans below this margin may be liquidated
    getLiquidationMargin() {
      return rates.liquidationMargin;
    },
    // loans must initially have at least 1.2x collateralization
    getInitialMargin() {
      return rates.initialMargin;
    },
    getLoanFee() {
      return rates.loanFee;
    },
    getInterestRate() {
      return rates.interestRate;
    },
    async getCollateralQuote() {
      // get a quote for one unit of the collateral
      const displayInfo = await E(collateralBrand).getDisplayInfo();
      const decimalPlaces = (displayInfo && displayInfo.decimalPlaces) || 0n;
      return E(priceAuthority).quoteGiven(
        amountMath.make(10n ** Nat(decimalPlaces), collateralBrand),
        runBrand,
      );
    },
    stageReward,
  };

  // A Map from vaultKits to their most recent ratio of debt to
  // collateralization. (This representation won't be optimized; when we need
  // better performance, use virtual objects.)
  // eslint-disable-next-line no-use-before-define
  const sortedVaultKits = makePrioritizedVaults(reschedulePriceCheck);
  let outstandingQuote;

  // When any Vault's debt ratio is higher than the current high-water level,
  // call reschedulePriceCheck() to request a fresh notification from the
  // priceAuthority. There will be extra outstanding requests since we can't
  // cancel them. (https://github.com/Agoric/agoric-sdk/issues/2713). When the
  // vault with the current highest debt ratio is removed or reduces its ratio,
  // we won't reschedule the priceAuthority requests to reduce churn. Instead,
  // when a priceQuote is received, we'll only reschedule if the high-water
  // level when the request was made matches the current high-water level.
  async function reschedulePriceCheck() {
    const highestDebtRatio = sortedVaultKits.highestRatio();
    if (!highestDebtRatio) {
      // if there aren't any open vaults, we don't need an outstanding RFQ.
      return;
    }

    const liquidationMargin = shared.getLiquidationMargin();

    // ask to be alerted when the price level falls enough that the vault
    // with the highest debt to collateral ratio will no longer be valued at the
    // liquidationMargin above its debt.
    const triggerPoint = multiplyBy(
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
    // level) because we use the actual price ratio plus margin here.
    const quoteRatioPlusMargin = makeRatioFromAmounts(
      divideBy(getAmountOut(quote), liquidationMargin),
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
  }

  function liquidateAll() {
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
  }

  async function chargeAllVaults(updateTime, poolIncrementSeat) {
    const poolIncrement = sortedVaultKits.reduce(
      (total, vaultPair) =>
        amountMath.add(
          total,
          vaultPair.vaultKit.accrueInterestAndAddToPool(updateTime),
        ),
      amountMath.makeEmpty(runBrand),
    );
    sortedVaultKits.updateAllDebts();
    reschedulePriceCheck();
    runMint.mintGains({ RUN: poolIncrement }, poolIncrementSeat);
    const poolStage = poolIncrementSeat.stage({
      RUN: amountMath.makeEmpty(runBrand),
    });
    const poolSeatStaging = stageReward(poolIncrement);
    zcf.reallocate(poolStage, poolSeatStaging);
  }

  const periodNotifier = E(timerService).makeNotifier(
    0n,
    loanParams.recordingPeriod,
  );
  const { zcfSeat: poolIncrementSeat } = zcf.makeEmptySeatKit();

  const timeObserver = {
    updateState: updateTime =>
      chargeAllVaults(updateTime, poolIncrementSeat).catch(_ => {}),
    fail: reason => {
      zcf.shutdownWithFailure(`Unable to continue without a timer: ${reason}`);
    },
    finish: done => {
      zcf.shutdownWithFailure(`Unable to continue without a timer: ${done}`);
    },
  };

  observeNotifier(periodNotifier, timeObserver);

  /** @type {InnerVaultManager} */
  const innerFacet = harden({
    ...shared,
    collateralBrand,
  });

  /** @param {ZCFSeat} seat */
  async function makeLoanKit(seat) {
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { RUN: null },
    });

    const startTimeStamp = await E(timerService).getCurrentTimestamp();
    const vaultKit = makeVaultKit(
      zcf,
      innerFacet,
      runMint,
      autoswap,
      priceAuthority,
      loanParams,
      startTimeStamp,
    );

    const { vault, openLoan } = vaultKit;
    const { notifier, collateralPayoutP } = await openLoan(seat);
    sortedVaultKits.addVaultKit(vaultKit, notifier);

    seat.exit();

    // TODO: nicer to return single objects, find a better way to give them
    // the payout object
    return harden({
      uiNotifier: notifier,
      invitationMakers: {
        AdjustBalances: vault.makeAdjustBalancesInvitation,
        CloseVault: vault.makeCloseInvitation,
      },
      vault,
      liquidationPayout: collateralPayoutP,
    });
  }

  /** @type {VaultManager} */
  return harden({
    ...shared,
    makeLoanKit,
    liquidateAll,
  });
}
