// @jessie-check

import { TimeMath } from '@agoric/time';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '@agoric/internal';

const { subtract, multiply, floorDivide } = natSafeMath;
const { Fail } = assert;

const trace = makeTracer('SMath', false);

/**
 * The length of the auction has to be inferred from the governed params.
 *
 * 1. It starts by offering collateral at a `StartingRate` (e.g., 105%) of the
 *    market price at auction start, and continues until it reaches LowestRate
 *    (e.g., 65%)
 * 2. It changes its offer price every `ClockStep` seconds
 * 3. Its offer price changes by `DiscountStep` amount (e.g., 5%) each step So
 *    it must run however many `ClockSteps` required to get from `StartingRate`
 *    to `LowestRate` changing by `DiscountStep` each time.
 *
 * Therefore the duration is `(StartingRate - LowestRate) / DiscountStep * ClockStep`.
 *
 * Note that this is what's *scheduled* and some conditions can end the auction
 * early (e.g. reaching its target debt to raise or selling all its collateral).
 *
 * @param {Awaited<import('./params.js').AuctionParamManaager>} params
 * @param {Timestamp} baseTime
 * @returns {import('./scheduler.js').Schedule}
 */
export const computeRoundTiming = (params, baseTime) => {
  const freq = params.getStartFrequency();
  const clockStep = params.getClockStep();
  const startingRate = params.getStartingRate();
  const discountStep = params.getDiscountStep();
  const lockPeriod = params.getPriceLockPeriod();
  const lowestRate = params.getLowestRate();

  const startDelay = params.getAuctionStartDelay();
  TimeMath.compareRel(freq, startDelay) > 0 ||
    Fail`startFrequency must exceed startDelay, ${freq}, ${startDelay}`;
  TimeMath.compareRel(freq, lockPeriod) > 0 ||
    Fail`startFrequency must exceed lock period, ${freq}, ${lockPeriod}`;

  startingRate > lowestRate ||
    Fail`startingRate ${startingRate} must be more than lowest: ${lowestRate}`;
  const rateChange = subtract(startingRate, lowestRate);
  const requestedSteps = floorDivide(rateChange, discountStep);
  requestedSteps > 0n ||
    Fail`discountStep ${discountStep} too large for requested rates`;
  TimeMath.compareRel(freq, clockStep) >= 0 ||
    Fail`clockStep ${TimeMath.relValue(
      clockStep,
    )} must be shorter than startFrequency ${TimeMath.relValue(
      freq,
    )} to allow at least one step down`;

  // (StartingRate - LowestRate) / DiscountStep * ClockStep
  const requestedDuration = TimeMath.multiplyRelNat(clockStep, requestedSteps);

  // Max out the duration at just shy of StartFrequency,
  // TODO consider having .max/.min in TimeMath
  const targetDuration =
    TimeMath.compareRel(requestedDuration, freq) < 0
      ? requestedDuration
      : TimeMath.subtractRelRel(freq, 1n);
  // How many steps of ClockStep duration fit into the full auction
  const steps = TimeMath.divideRelRel(targetDuration, clockStep);
  steps > 0n ||
    Fail`clockStep ${clockStep} too long for auction duration ${targetDuration}`;

  const endRate = subtract(startingRate, multiply(steps, discountStep));

  // Use a duration that exactly matches the last step completing (no remainder)
  const actualDuration = TimeMath.multiplyRelNat(clockStep, steps);

  // computed start is baseTime + freq - (now mod freq). if there are hourly
  // starts, we add an hour to the time, and subtract now mod freq.
  // Then we add the delay
  /** @type {import('@agoric/time/src/types').TimestampRecord} */
  const startTime = TimeMath.addAbsRel(
    TimeMath.addAbsRel(
      baseTime,
      TimeMath.subtractRelRel(freq, TimeMath.modAbsRel(baseTime, freq)),
    ),
    startDelay,
  );
  const endTime = TimeMath.addAbsRel(startTime, actualDuration);
  const lockTime = TimeMath.subtractAbsRel(startTime, lockPeriod);

  /** @type {import('./scheduler.js').Schedule} */
  const next = {
    startTime,
    endTime,
    steps,
    endRate,
    startDelay,
    clockStep,
    lockTime,
  };
  return harden(next);
};
harden(computeRoundTiming);

/**
 * Calculate when the next descending step will start. If we're between
 * auctions (i.e. liveSchedule is undefined), or the last step of the current
 * auction has started, then it'll be nextSchedule.startTime. Otherwise, it's
 * the start of the step following the current step.
 *
 * @param {import('./scheduler.js').Schedule | undefined} liveSchedule
 * @param {import('./scheduler.js').Schedule} nextSchedule
 * @param {Timestamp} now
 */
export const nextDescendingStepTime = (liveSchedule, nextSchedule, now) => {
  nextSchedule || Fail`nextSchedule must always be defined`;

  if (!liveSchedule) {
    return nextSchedule.startTime;
  }

  const { startTime, endTime, clockStep } = liveSchedule;
  trace('calc', startTime, now);
  if (TimeMath.compareAbs(startTime, now) > 0) {
    return startTime;
  }

  const elapsed = TimeMath.subtractAbsAbs(now, startTime);
  const sinceLastStep = TimeMath.modRelRel(elapsed, clockStep);
  const lastStepStart = TimeMath.subtractAbsRel(now, sinceLastStep);
  const expectedNext = TimeMath.addAbsRel(lastStepStart, clockStep);

  if (TimeMath.compareAbs(expectedNext, endTime) > 0) {
    return nextSchedule.startTime;
  }

  return expectedNext;
};
harden(nextDescendingStepTime);
