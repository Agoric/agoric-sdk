import { E } from '@endo/eventual-send';
import { TimeMath } from '@agoric/time';
import { Far } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';

import { AuctionState } from './util.js';
import { nextDescendingStepTime, computeRoundTiming } from './scheduleMath.js';

const { Fail, quote: q } = assert;

const trace = makeTracer('SCHED', false);

/**
 * @file The scheduler is presumed to be quiescent between auction rounds. Each
 * Auction round consists of a sequence of steps with decreasing prices. There
 * should always be a next schedule, but between rounds, liveSchedule is null.
 *
 * The lock period that the liquidators use might start before the previous
 * round has finished, so we need to schedule the next round each time an
 * auction starts. This means if the scheduling parameters change, it'll be a
 * full cycle before we switch. Otherwise, the vaults wouldn't know when to
 * start their lock period. If the lock period for the next auction hasn't
 * started when each aucion ends, we recalculate it, in case the parameters have
 * changed.
 *
 * If the clock skips forward (because of a chain halt, for instance), the
 * scheduler will try to cleanly and quickly finish any round already in
 * progress. It would take additional work on the manual timer to test this
 * thoroughly.
 */
const makeCancelToken = () => {
  let tokenCount = 1;
  return Far(`cancelToken${(tokenCount += 1)}`, {});
};

/**
 * @typedef {object} AuctionDriver
 * @property {() => void} reducePriceAndTrade
 * @property {() => void} finalize
 * @property {() => void} startRound
 */

/**
 * @typedef {object} ScheduleNotification
 *
 * @property {Timestamp | undefined} activeStartTime start time of current
 *    auction if auction is active
 * @property {Timestamp} nextStartTime start time of next auction
 * @property {Timestamp} nextDescendingStepTime when the next descending step
 *    will take place
 */

/**
 * @param {AuctionDriver} auctionDriver
 * @param {import('@agoric/time/src/types').TimerService} timer
 * @param {Awaited<import('./params.js').AuctionParamManaager>} params
 * @param {import('@agoric/time/src/types').TimerBrand} timerBrand
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').Recorder<ScheduleNotification>} scheduleRecorder
 */
export const makeScheduler = async (
  auctionDriver,
  timer,
  params,
  timerBrand,
  scheduleRecorder,
) => {
  /**
   * live version is defined when an auction is active.
   *
   * @type {Schedule | undefined}
   */
  let liveSchedule;

  /** @returns {Promise<{ now: Timestamp, nextSchedule: Schedule }>} */
  const initializeNextSchedule = async () => {
    return E.when(
      // XXX manualTimer returns a bigint, not a timeRecord.
      E(timer).getCurrentTimestamp(),
      now => {
        const nextSchedule = computeRoundTiming(
          params,
          TimeMath.toAbs(now, timerBrand),
        );
        return { now, nextSchedule };
      },
    );
  };
  let { now, nextSchedule } = await initializeNextSchedule();
  const setTimeMonotonically = time => {
    TimeMath.compareAbs(time, now) >= 0 || Fail`Time only moves forward`;
    now = time;
  };

  const stepCancelToken = makeCancelToken();

  /** @type {typeof AuctionState[keyof typeof AuctionState]} */
  let auctionState = AuctionState.WAITING;

  /**
   * Publish the schedule. To be called after clockTick() (which processes a
   * descending step) or when the next round is scheduled.
   */
  const publishSchedule = () => {
    const sched = harden({
      activeStartTime: liveSchedule?.startTime,
      nextStartTime: nextSchedule?.startTime,
      nextDescendingStepTime: nextDescendingStepTime(
        liveSchedule,
        nextSchedule,
        now,
      ),
    });
    scheduleRecorder.write(sched);
  };

  /**
   * @param {Schedule | undefined} schedule
   */
  const clockTick = schedule => {
    trace('clockTick', schedule?.startTime, now);
    if (!schedule) {
      return;
    }

    if (
      TimeMath.compareAbs(now, schedule.startTime) >= 0 &&
      TimeMath.compareAbs(now, schedule.endTime) <= 0
    ) {
      if (auctionState !== AuctionState.ACTIVE) {
        auctionState = AuctionState.ACTIVE;
        auctionDriver.startRound();
      } else {
        auctionDriver.reducePriceAndTrade();
      }
    }

    if (TimeMath.compareAbs(now, schedule.endTime) >= 0) {
      auctionState = AuctionState.WAITING;

      auctionDriver.finalize();

      if (!nextSchedule) throw Fail`nextSchedule not defined`;

      // only recalculate the next schedule at this point if the lock time has
      // not been reached.
      const nextLock = nextSchedule.lockTime;
      if (nextLock && TimeMath.compareAbs(now, nextLock) < 0) {
        const afterNow = TimeMath.addAbsRel(
          now,
          TimeMath.toRel(1n, timerBrand),
        );
        nextSchedule = computeRoundTiming(params, afterNow);
      }
      liveSchedule = undefined;

      void E(timer).cancel(stepCancelToken);
    }

    publishSchedule();
  };

  // schedule the wakeups for the steps of this round
  const scheduleSteps = () => {
    if (!liveSchedule) throw Fail`liveSchedule not defined`;

    const { startTime } = liveSchedule;
    trace('START ', startTime);

    const delayFromNow =
      TimeMath.compareAbs(startTime, now) > 0
        ? TimeMath.subtractAbsAbs(startTime, now)
        : TimeMath.subtractAbsAbs(startTime, startTime);

    trace('repeating', now, delayFromNow, startTime);

    void E(timer).repeatAfter(
      delayFromNow,
      liveSchedule.clockStep,
      Far('SchedulerWaker', {
        wake(time) {
          setTimeMonotonically(time);
          trace('wake step', now);
          clockTick(liveSchedule);
        },
      }),
      stepCancelToken,
    );
  };

  // schedule a wakeup for the next round
  const scheduleNextRound = start => {
    trace(`nextRound`, start);
    void E(timer).setWakeup(
      start,
      Far('SchedulerWaker', {
        wake(time) {
          setTimeMonotonically(time);
          // eslint-disable-next-line no-use-before-define
          void startAuction();
        },
      }),
    );
    publishSchedule();
  };

  const startAuction = async () => {
    !liveSchedule || Fail`can't start an auction round while one is active`;

    assert(nextSchedule);
    // The clock tick may have arrived too late to trigger the next scheduled
    // round, for example because of a chain halt.  When this happens the oracle
    // quote may out of date and so must be ignored. Recover by returning
    // deposits and scheduling the next round.
    if (TimeMath.compareAbs(now, nextSchedule.startTime) > 0) {
      console.warn(
        `Auction time jumped to ${q(now)} before next scheduled start ${q(
          nextSchedule.startTime,
        )}. Skipping that round.`,
      );
      nextSchedule = computeRoundTiming(params, now);
    }
    liveSchedule = nextSchedule;

    const after = TimeMath.addAbsRel(
      liveSchedule.startTime,
      TimeMath.toRel(1n, timerBrand),
    );
    nextSchedule = computeRoundTiming(params, after);

    scheduleSteps();
    scheduleNextRound(
      TimeMath.subtractAbsRel(nextSchedule.startTime, nextSchedule.startDelay),
    );
  };

  const firstStart = TimeMath.subtractAbsRel(
    nextSchedule.startTime,
    nextSchedule.startDelay,
  );
  scheduleNextRound(firstStart);

  return Far('scheduler', {
    getSchedule: () =>
      harden({
        liveAuctionSchedule: liveSchedule,
        nextAuctionSchedule: nextSchedule,
      }),
    getAuctionState: () => auctionState,
  });
};

/**
 * @typedef {object} Schedule
 * @property {import('@agoric/time/src/types').TimestampRecord} startTime
 * @property {import('@agoric/time/src/types').TimestampRecord} endTime
 * @property {NatValue} steps
 * @property {NatValue} endRate
 * @property {RelativeTime} startDelay
 * @property {RelativeTime} clockStep
 * @property {Timestamp} [lockTime]
 */

/**
 * @typedef {object} FullSchedule
 * @property {Schedule | undefined} nextAuctionSchedule
 * @property {Schedule | undefined} liveAuctionSchedule
 */
