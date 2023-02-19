// @jessie-check

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { TimeMath } from '@agoric/time';
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

const liquidationResults = (debt, minted) => {
  if (AmountMath.isEmpty(minted)) {
    return {
      proceeds: minted,
      overage: minted,
      toBurn: minted,
      shortfall: debt,
    };
  }

  /** @type { [Amount<'nat'>, Amount<'nat'>] } */
  const [overage, shortfall] = AmountMath.isGTE(debt, minted)
    ? [AmountMath.makeEmptyFromAmount(debt), AmountMath.subtract(debt, minted)]
    : [AmountMath.subtract(minted, debt), AmountMath.makeEmptyFromAmount(debt)];

  const toBurn = AmountMath.min(minted, debt);
  // debt is fully accounted for, with toBurn and shortfall
  assert(AmountMath.isEqual(debt, AmountMath.add(toBurn, shortfall)));

  return {
    proceeds: minted,
    overage,
    toBurn,
    shortfall,
  };
};

harden(scheduleLiquidationWakeups);
harden(liquidationResults);

export { scheduleLiquidationWakeups, liquidationResults };
