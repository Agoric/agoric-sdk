// @jessie-check

import { Fail } from '@endo/errors';
import { TimeMath } from '@agoric/time';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { assertAllDefined, makeTracer } from '@agoric/internal';

/** @import {TimestampRecord} from '@agoric/time'; */

const { subtract, multiply, floorDivide } = natSafeMath;

const trace = makeTracer('SMath', true);

const subtract1 = relTime =>
  TimeMath.subtractRelRel(
    relTime,
    TimeMath.coerceRelativeTimeRecord(1n, relTime.timerBrand),
  );

/**
 * The length of the auction has to be inferred from the governed params.
 *
 * 1. The auction starts by offering collateral at a `StartingRate` (e.g., 105%) of
 *    the market price at auction start, and continues until it reaches (or
 *    would exceed on its next step) LowestRate (e.g., 65%)
 * 2. The offer price changes every `ClockStep` seconds
 * 3. The offer price changes by `DiscountStep` amount (e.g., 5%) each step So it
 *    must run however many `ClockSteps` are required to get from `StartingRate`
 *    to `LowestRate` changing by `DiscountStep` each time.
 *
 * Therefore, the duration is `(StartingRate - LowestRate) / DiscountStep *
 * ClockStep`.
 *
 * Note that this is what's _scheduled_. More than one auction can be running
 * simultaneously, and some conditions can cause some of the auctions to stop
 * selling early (e.g. reaching their target debt to raise or selling all of
 * their collateral).
 *
 * @param {Awaited<import('./params.js').AuctionParamManager>} params
 * @param {TimestampRecord} baseTime
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
  TimeMath.compareRel(freq, clockStep) >= 0 ||
    Fail`clockStep ${TimeMath.relValue(
      clockStep,
    )} must be shorter than startFrequency ${TimeMath.relValue(
      freq,
    )} to allow at least one step down`;

  startingRate > lowestRate ||
    Fail`startingRate ${startingRate} must be more than lowest: ${lowestRate}`;

  const rateChange = subtract(startingRate, lowestRate);
  const requestedSteps = floorDivide(rateChange, discountStep);
  requestedSteps > 0n ||
    Fail`discountStep ${discountStep} too large for requested rates`;

  // How many steps fit in a full auction? We want the biggest integer for which
  // steps * discountStep <= startingRate - lowestRate, and
  // steps * clockStep < freq
  const maxRateSteps = floorDivide(startingRate - lowestRate, discountStep);
  const maxTimeSteps = TimeMath.divideRelRel(subtract1(freq), clockStep);
  const steps = maxRateSteps < maxTimeSteps ? maxRateSteps : maxTimeSteps;

  const duration = TimeMath.multiplyRelNat(clockStep, steps);
  steps > 0n ||
    Fail`clockStep ${clockStep} too long for auction duration ${duration}`;
  const endRate = subtract(startingRate, multiply(steps, discountStep));

  // Use a duration that exactly matches the last step completing (no remainder)
  const actualDuration = TimeMath.multiplyRelNat(clockStep, steps);
  // computed start is `startDelay + baseTime + freq - (baseTime mod freq)`.
  // That is, if there are hourly starts, we add an hour to the time, and
  // subtract baseTime mod freq. Then we add the delay.
  /** @type {TimestampRecord} */
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
 * Calculate when the next descending step will start. If we're between auctions
 * (i.e. liveSchedule is undefined), or the last step of the current auction has
 * started, then it'll be nextSchedule.startTime. Otherwise, it's the start of
 * the step following the current step.
 *
 * @param {import('./scheduler.js').Schedule | null} liveSchedule
 * @param {import('./scheduler.js').Schedule | null} nextSchedule
 * @param {Timestamp} now
 * @returns {Timestamp | null}
 */
export const nextDescendingStepTime = (liveSchedule, nextSchedule, now) => {
  if (!liveSchedule) {
    return nextSchedule?.startTime || null;
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
    return nextSchedule?.startTime || null;
  }

  return expectedNext;
};
harden(nextDescendingStepTime);

/**
 * @param {Timestamp} time
 * @param {import('./scheduler.js').Schedule} schedule
 * @returns {'before' | 'during' | 'endExactly' | 'after'}
 */
export const timeVsSchedule = (time, schedule) => {
  const { startTime, endTime } = schedule;
  assertAllDefined({ startTime, endTime });

  if (TimeMath.compareAbs(time, schedule.startTime) < 0) {
    return 'before';
  }
  if (TimeMath.compareAbs(time, schedule.endTime) < 0) {
    return 'during';
  }
  if (TimeMath.compareAbs(time, schedule.endTime) === 0) {
    return 'endExactly';
  }

  return 'after';
};
harden(timeVsSchedule);
