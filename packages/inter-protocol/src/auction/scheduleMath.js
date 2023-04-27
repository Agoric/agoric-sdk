// @jessie-check

import { TimeMath } from '@agoric/time';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '@agoric/internal';

const { subtract, multiply, floorDivide } = natSafeMath;
const { Fail } = assert;

const trace = makeTracer('SMath', false);

export const computeRoundTiming = (params, baseTime) => {
  // currently a TimeValue; hopefully a TimeRecord soon
  /** @type {RelativeTime} */
  const freq = params.getStartFrequency();
  /** @type {RelativeTime} */
  const clockStep = params.getClockStep();
  /** @type {NatValue} */
  const startingRate = params.getStartingRate();
  /** @type {NatValue} */
  const discountStep = params.getDiscountStep();
  /** @type {RelativeTime} */
  const lockPeriod = params.getPriceLockPeriod();
  /** @type {NatValue} */
  const lowestRate = params.getLowestRate();

  /** @type {RelativeTime} */
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

  const requestedDuration = TimeMath.multiplyRelNat(clockStep, requestedSteps);
  const targetDuration =
    TimeMath.compareRel(requestedDuration, freq) < 0
      ? requestedDuration
      : TimeMath.subtractRelRel(freq, TimeMath.toRel(1n));
  const steps = TimeMath.divideRelRel(targetDuration, clockStep);
  const duration = TimeMath.multiplyRelNat(clockStep, steps);

  steps > 0n ||
    Fail`clockStep ${clockStep} too long for auction duration ${duration}`;
  const endRate = subtract(startingRate, multiply(steps, discountStep));

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
