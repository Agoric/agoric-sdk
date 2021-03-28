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
// instance which trades this collateralType against Scones. It also manages
// some number of outstanding loans, each called a Vault, for which the
// collateral is provided in exchange for borrowed Scones.

/** @type {MakeVaultManager} */
export function makeVaultManager(
  zcf,
  autoswap,
  sconeMint,
  collateralBrand,
  priceAuthority,
  rates,
  stageReward,
  timerService,
  loanParams,
  liquidationStrategy,
) {
  const { brand: sconeBrand } = sconeMint.getIssuerRecord();

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
        sconeBrand,
      );
    },
    stageReward,
  };

  // A Map from vaultKits to their most recent ratio of debt to
  // collateralization. (This representation won't be optimized; when we need
  // better performance, use virtual objects.)
  // eslint-disable-next-line no-use-before-define
  const sortedVaultKits = makePrioritizedVaults(reschedulePriceCheck);
  // The hightest debt ratio for which we have a request outstanding
  let highestDebtRatio = sortedVaultKits.highestRatio();

  // When any Vault's debt ratio is higher than the current high-water level,
  // call reschedulePriceCheck() to request a fresh notification from the
  // priceAuthority. There will be extra outstanding requests since we can't
  // cancel them. (https://github.com/Agoric/agoric-sdk/issues/2713). When the
  // vault with the current highest debt ratio is removed or reduces its ratio,
  // we won't reschedule the priceAuthority requests to reduce churn. Instead,
  // when a priceQuote is received, we'll only reschedule if the high-water
  // level when the request was made matches the current high-water level.
  async function reschedulePriceCheck() {
    const highestRatioWhenScheduled = sortedVaultKits.highestRatio();
    if (!highestRatioWhenScheduled) {
      // if there aren't any open vaults, we don't need an outstanding RFQ.
      return;
    }

    highestDebtRatio = highestRatioWhenScheduled;
    const liquidationMargin = shared.getLiquidationMargin();

    // We ask to be alerted when the price level falls enough that the vault
    // with the highest debt to collateral ratio will no longer be valued at the
    // liquidationMargin above its debt.
    const triggerPoint = multiplyBy(
      highestRatioWhenScheduled.numerator,
      liquidationMargin,
    );
    // Notice that this is schedueing a callback for later (possibly much later).
    // Callers shouldn't be expecting a response from this function.
    const quote = await E(priceAuthority).quoteWhenLT(
      highestRatioWhenScheduled.denominator,
      triggerPoint,
    );

    const quoteRatioPlusMargin = makeRatioFromAmounts(
      divideBy(getAmountOut(quote), liquidationMargin),
      getAmountIn(quote),
    );

    // Since we can't cancel outstanding quote requests when balances change,
    // we may receive alerts that don't match the current high-water mark. When
    // we receive a quote, we liquidate all the vaults that don't have
    // sufficient collateral, (even if the trigger was set for a different
    // level) because we use the actual price ratio plus margin here. We
    // only reschedule if the high-water mark matches to prevent creating too
    // many extra requests.

    sortedVaultKits.forEachRatioGTE(quoteRatioPlusMargin, ({ vaultKit }) => {
      trace('liquidating', vaultKit.vaultSeat.getProposal());

      liquidate(
        zcf,
        vaultKit,
        sconeMint.burnLosses,
        liquidationStrategy,
        collateralBrand,
      );
    });
    if (highestRatioWhenScheduled === highestDebtRatio) {
      reschedulePriceCheck();
    }
  }

  function liquidateAll() {
    const promises = sortedVaultKits.map(({ vaultKit }) =>
      liquidate(
        zcf,
        vaultKit,
        sconeMint.burnLosses,
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
      amountMath.makeEmpty(sconeBrand),
    );
    sconeMint.mintGains({ Scones: poolIncrement }, poolIncrementSeat);
    const poolStage = poolIncrementSeat.stage({
      Scones: amountMath.makeEmpty(sconeBrand),
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
      want: { Scones: null },
    });

    // TODO check that it's for the right type of collateral

    const startTimeStamp = await E(timerService).getCurrentTimestamp();
    const vaultKit = makeVaultKit(
      zcf,
      innerFacet,
      sconeMint,
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
      vault,
      liquidationPayout: collateralPayoutP,
    });
  }

  // Called by the vault when liquidation is insufficient. We're expected to
  // come up with 'underwaterBy' Scones.
  /**
   * @param {any} underwaterBy
   */
  // function helpLiquidateFallback(underwaterBy) {}

  /** @type {VaultManager} */
  return harden({
    ...shared,
    makeLoanKit,
    liquidateAll,
  });
}
