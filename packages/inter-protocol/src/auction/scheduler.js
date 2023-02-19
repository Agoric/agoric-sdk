import { E } from '@endo/eventual-send';
import { TimeMath } from '@agoric/time';
import { Far } from '@endo/marshal';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '@agoric/internal';
import { AuctionState } from './util.js';

const { Fail } = assert;
const { subtract, multiply, floorDivide } = natSafeMath;

const trace = makeTracer('SCHED', false);

/**
 * @file The scheduler is presumed to be quiescent between auction rounds. Each
 * Auction round consists of a sequence of steps with decreasing prices. There
 * should always be a next schedule, but between rounds, liveSchedule is null.
 *
 * The lock period that the liquidators use might start before the previous
 * round has finished, so we need to scheduled the next round each time an
 * auction starts. This means if the scheduling parameters change, it'll be a
 * full cycle before we switch. Otherwise, the vaults wouldn't know when to
 * start their lock period.
 */

const makeCancelToken = () => {
  let tokenCount = 1;
  return Far(`cancelToken${(tokenCount += 1)}`, {});
};

/**
 * @typedef {object} AuctionDriver
 * @property {() => void} descendingStep
 * @property {() => void} finalize
 * @property {() => void} startRound
 */

/**
 * @param {AuctionDriver} auctionDriver
 * @param {import('@agoric/time/src/types').TimerService} timer
 * @param {Awaited<import('./params.js').AuctionParamManaager>} params
 * @param {import('@agoric/time/src/types').TimerBrand} timerBrand
 */
export const makeScheduler = async (
  auctionDriver,
  timer,
  params,
  timerBrand,
) => {
  // live version is non-null when an auction is active.
  let liveSchedule;
  // Next should always be defined after initialization unless it's paused
  let nextSchedule;
  const stepCancelToken = makeCancelToken();

  // XXX why can't it be @type {AuctionState}?
  /** @type {'active' | 'waiting'} */
  let auctionState = AuctionState.WAITING;

  const computeRoundTiming = baseTime => {
    // currently a TimeValue; hopefully a TimeRecord soon
    /** @type {RelativeTime} */
    // @ts-expect-error cast
    const freq = params.getStartFrequency();
    /** @type {RelativeTime} */
    // @ts-expect-error cast
    const clockStep = params.getClockStep();
    /** @type {NatValue} */
    // @ts-expect-error cast
    const startingRate = params.getStartingRate();
    /** @type {NatValue} */
    // @ts-expect-error cast
    const discountStep = params.getDiscountStep();
    /** @type {RelativeTime} */
    // @ts-expect-error cast
    const lockPeriod = params.getPriceLockPeriod();
    /** @type {NatValue} */
    // @ts-expect-error cast
    const lowestRate = params.getLowestRate();

    /** @type {RelativeTime} */
    // @ts-expect-error cast
    const startDelay = params.getAuctionStartDelay();
    TimeMath.compareRel(freq, startDelay) > 0 ||
      Fail`startFrequency must exceed startDelay, ${freq}, ${startDelay}`;
    TimeMath.compareRel(freq, lockPeriod) > 0 ||
      Fail`startFrequency must exceed lock period, ${freq}, ${lockPeriod}`;

    const rateChange = subtract(startingRate, lowestRate);
    const requestedSteps = floorDivide(rateChange, discountStep);
    requestedSteps > 0n ||
      Fail`discountStep ${discountStep} too large for requested rates`;
    const duration = TimeMath.multiplyRelNat(clockStep, requestedSteps);

    TimeMath.compareRel(duration, freq) < 0 ||
      Fail`Frequency ${freq} must exceed duration ${duration}`;
    const steps = TimeMath.divideRelRel(duration, clockStep);
    steps > 0n ||
      Fail`clockStep ${clockStep} too long for auction duration ${duration}`;
    const endRate = subtract(startingRate, multiply(steps, discountStep));

    const actualDuration = TimeMath.multiplyRelNat(clockStep, steps);
    // computed start is baseTime + freq - (now mod freq). if there are hourly
    // starts, we add an hour to the current time, and subtract now mod freq.
    // Then we add the delay
    const startTime = TimeMath.addAbsRel(
      TimeMath.addAbsRel(
        baseTime,
        TimeMath.subtractRelRel(freq, TimeMath.modAbsRel(baseTime, freq)),
      ),
      startDelay,
    );
    const endTime = TimeMath.addAbsRel(startTime, actualDuration);

    const next = { startTime, endTime, steps, endRate, startDelay, clockStep };
    return harden(next);
  };

  const clockTick = (timeValue, schedule) => {
    const time = TimeMath.toAbs(timeValue, timerBrand);

    trace('clockTick', schedule.startTime, time);
    if (TimeMath.compareAbs(time, schedule.startTime) >= 0) {
      if (auctionState !== AuctionState.ACTIVE) {
        auctionState = AuctionState.ACTIVE;
        auctionDriver.startRound();
      } else {
        auctionDriver.descendingStep();
      }
    }

    if (TimeMath.compareAbs(time, schedule.endTime) >= 0) {
      trace('LastStep', time);
      auctionState = AuctionState.WAITING;

      auctionDriver.finalize();
      const afterNow = TimeMath.addAbsRel(time, TimeMath.toRel(1n, timerBrand));
      nextSchedule = computeRoundTiming(afterNow);
      liveSchedule = undefined;

      E(timer).cancel(stepCancelToken);
    }
  };

  const scheduleRound = (schedule, time) => {
    trace('nextRound', time);

    const { startTime } = schedule;
    trace('START ', startTime);

    const startDelay =
      TimeMath.compareAbs(startTime, time) > 0
        ? TimeMath.subtractAbsAbs(startTime, time)
        : TimeMath.subtractAbsAbs(startTime, startTime);

    E(timer).repeatAfter(
      startDelay,
      schedule.clockStep,
      Far('SchedulerWaker', {
        wake(t) {
          clockTick(t, schedule);
        },
      }),
      stepCancelToken,
    );
  };

  const scheduleNextRound = start => {
    trace(`SCHED   nextRound`, start);
    E(timer).setWakeup(
      start,
      Far('SchedulerWaker', {
        wake(time) {
          // eslint-disable-next-line no-use-before-define
          startAuction(time);
        },
      }),
    );
  };

  const startAuction = async time => {
    !liveSchedule || Fail`can't start an auction round while one is active`;

    liveSchedule = nextSchedule;
    const after = TimeMath.addAbsRel(
      liveSchedule.startTime,
      TimeMath.toRel(1n, timerBrand),
    );
    nextSchedule = computeRoundTiming(after);
    scheduleRound(liveSchedule, time);
    scheduleNextRound(TimeMath.toAbs(nextSchedule.startTime));
  };

  const baseNow = await E(timer).getCurrentTimestamp();
  const now = TimeMath.toAbs(baseNow, timerBrand);
  nextSchedule = computeRoundTiming(now);
  scheduleNextRound(nextSchedule.startTime);

  return Far('scheduler', {
    getSchedule: () =>
      harden({
        liveAuctionSchedule: liveSchedule,
        nextAuctionSchedule: nextSchedule,
      }),
    getAuctionState: () => auctionState,
  });
};
