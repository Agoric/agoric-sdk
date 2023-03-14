// @jessie-check

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { TimeMath } from '@agoric/time';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/index.js';
import { makeScalarMapStore } from '@agoric/store';

import { AUCTION_START_DELAY, PRICE_LOCK_PERIOD } from '../auction/params.js';

const trace = makeTracer('LIQ', false);

/** @typedef {import('@agoric/time/src/types').TimerService} TimerService */
/** @typedef {import('@agoric/time/src/types').TimerWaker} TimerWaker */
/** @typedef {import('@agoric/time/src/types').CancelToken} CancelToken */
/** @typedef {import('@agoric/time/src/types').RelativeTimeRecord} RelativeTimeRecord */

/**
 * @param {ERef<import('../auction/auctioneer.js').AuctioneerPublicFacet>} auctionPublicFacet
 * @param {ERef<TimerService>} timer
 * @param {TimerWaker} priceLockWaker
 * @param {TimerWaker} liquidationWaker
 * @param {TimerWaker} reschedulerWaker
 */
const scheduleLiquidationWakeups = async (
  auctionPublicFacet,
  timer,
  priceLockWaker,
  liquidationWaker,
  reschedulerWaker,
) => {
  const [schedules, params] = await Promise.all([
    E(auctionPublicFacet).getSchedules(),
    E(auctionPublicFacet).getGovernedParams(),
  ]);
  const { startTime } = schedules.nextAuctionSchedule;

  trace('SCHEDULE', schedules.nextAuctionSchedule);

  /** @type {RelativeTimeRecord} */
  // @ts-expect-error Casting
  // eslint-disable-next-line no-restricted-syntax
  const priceLockPeriod = params[PRICE_LOCK_PERIOD].value;
  /** @type {RelativeTimeRecord} */
  // @ts-expect-error Casting
  // eslint-disable-next-line no-restricted-syntax
  const auctionStartDelay = params[AUCTION_START_DELAY].value;

  const nominalStart = TimeMath.subtractAbsRel(startTime, auctionStartDelay);
  const priceLockWakeTime = TimeMath.subtractAbsRel(
    nominalStart,
    priceLockPeriod,
  );
  const afterStart = TimeMath.addAbsRel(startTime, TimeMath.toRel(1n));
  const a = t => TimeMath.absValue(t);
  trace('scheduling ', a(priceLockWakeTime), a(nominalStart), a(startTime));
  E(timer).setWakeup(priceLockWakeTime, priceLockWaker);
  E(timer).setWakeup(nominalStart, liquidationWaker);
  E(timer).setWakeup(afterStart, reschedulerWaker);
};

/**
 *
 * @param {Amount<'nat'>} debt
 * @param {Amount<'nat'>} minted
 */
const liquidationResults = (debt, minted) => {
  if (AmountMath.isEmpty(minted)) {
    return {
      overage: minted,
      toBurn: minted,
      shortfall: debt,
    };
  }

  const [overage, shortfall] = AmountMath.isGTE(debt, minted)
    ? [AmountMath.makeEmptyFromAmount(debt), AmountMath.subtract(debt, minted)]
    : [AmountMath.subtract(minted, debt), AmountMath.makeEmptyFromAmount(debt)];

  const toBurn = AmountMath.min(minted, debt);
  // debt is fully accounted for, with toBurn and shortfall
  assert(AmountMath.isEqual(debt, AmountMath.add(toBurn, shortfall)));

  return {
    overage,
    toBurn,
    shortfall,
  };
};

/**
 * @param {ZCF} zcf
 * @param {string} crKey
 * @param {ReturnType<typeof import('./prioritizedVaults.js').makePrioritizedVaults>} prioritizedVaults
 * @param {SetStore<Vault>} liquidatingVaults
 * @returns {{
 *    vaultData: MapStore<Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}>,
 *    totalDebt: Amount<'nat'> | undefined,
 *    totalCollateral: Amount<'nat'> | undefined,
 *    liqSeat: ZCFSeat}}
 */
const getLiquidatableVaults = (
  zcf,
  crKey,
  prioritizedVaults,
  liquidatingVaults,
) => {
  // crKey represents a collateralizationRatio based on the locked price.
  // We'll extract all vaults below that ratio, and return them with stats.

  const vaultsToLiquidate = prioritizedVaults.removeVaultsBelow(crKey);
  /** @type {MapStore<Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}>} */
  const vaultData = makeScalarMapStore();

  const { zcfSeat: liqSeat } = zcf.makeEmptySeatKit();
  let totalDebt;
  let totalCollateral;
  /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
  const transfers = [];

  for (const vault of vaultsToLiquidate.values()) {
    vault.liquidating();
    liquidatingVaults.add(vault);

    const collateralAmount = vault.getCollateralAmount();
    totalCollateral = totalCollateral
      ? AmountMath.add(totalCollateral, collateralAmount)
      : collateralAmount;

    const debtAmount = vault.getCurrentDebt();
    totalDebt = totalDebt ? AmountMath.add(totalDebt, debtAmount) : debtAmount;
    transfers.push([
      vault.getVaultSeat(),
      liqSeat,
      { Collateral: collateralAmount },
    ]);
    vaultData.init(vault, { collateralAmount, debtAmount });
  }

  if (transfers.length > 0) {
    atomicRearrange(zcf, harden(transfers));
  }

  return { vaultData, totalDebt, totalCollateral, liqSeat };
};

harden(scheduleLiquidationWakeups);
harden(liquidationResults);
harden(getLiquidatableVaults);

export {
  scheduleLiquidationWakeups,
  liquidationResults,
  getLiquidatableVaults,
};
