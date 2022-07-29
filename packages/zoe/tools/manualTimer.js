// @ts-check

import { E } from '@endo/eventual-send';
import { makeScalarMapStore } from '@agoric/store';
import { Far } from '@endo/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@endo/promise-kit';
import { TimeMath } from '@agoric/swingset-vat/src/vats/timer/timeMath.js';

import { eventLoopIteration } from './eventLoopIteration.js';
import './types.js';
import './internal-types.js';

const { details: X } = assert;

/**
 * A fake clock that also logs progress.
 *
 * @param {(...args: any[]) => void} log
 * @param {Timestamp} [startValue=0n]
 * @param {RelativeTime} [timeStep=1n]
 * @returns {ManualTimer}
 */
export default function buildManualTimer(log, startValue = 0n, timeStep = 1n) {
  startValue = TimeMath.toAbs(startValue);
  timeStep = TimeMath.toRel(timeStep);
  let ticks = startValue;

  /** @type {MapStore<Timestamp, ERef<TimerWaker>[]>} */
  const schedule = makeScalarMapStore('Timestamp');

  const makeRepeater = (delay, interval, timer) => {
    delay = TimeMath.toRel(delay);
    interval = TimeMath.toRel(interval);
    assert(
      TimeMath.isRelZero(TimeMath.modRelRel(delay, timeStep)),
      X`timer has a resolution of ${timeStep}; ${delay} is not divisible`,
    );
    assert(
      TimeMath.isRelZero(TimeMath.modRelRel(interval, timeStep)),
      X`timer has a resolution of ${timeStep}; ${interval} is not divisible`,
    );

    /** @type {Array<ERef<TimerWaker>> | null} */
    let wakers = [];
    let nextWakeup;

    /** @type {TimerWaker} */
    const repeaterWaker = Far('repeatWaker', {
      async wake(timestamp) {
        timestamp = TimeMath.toAbs(timestamp);
        assert(
          TimeMath.isRelZero(TimeMath.modRelRel(interval, timeStep)),
          X`timer has a resolution of ${timeStep}; ${timestamp} is not divisible`,
        );
        if (!wakers) {
          return;
        }
        nextWakeup = ticks + interval;
        timer.setWakeup(nextWakeup, repeaterWaker);
        await Promise.allSettled(wakers.map(waker => E(waker).wake(timestamp)));
      },
    });

    /** @type {TimerRepeater} */
    const repeater = Far('TimerRepeater', {
      schedule(waker) {
        assert(wakers, 'Cannot schedule on a disabled repeater');
        wakers.push(waker);
        return nextWakeup;
      },
      disable() {
        wakers = null;
        timer.removeWakeup(repeaterWaker);
      },
    });
    nextWakeup = ticks + delay;
    timer.setWakeup(nextWakeup, repeaterWaker);
    return repeater;
  };

  /** @type {ManualTimer} */
  const timer = Far('ManualTimer', {
    // This function will only be called in testing code to advance the clock.
    async tick(msg) {
      ticks = TimeMath.addAbsRel(ticks, timeStep);
      log(`@@ tick:${ticks}${msg ? `: ${msg}` : ''} @@`);
      if (schedule.has(ticks)) {
        const wakers = schedule.get(ticks);
        schedule.delete(ticks);
        await Promise.allSettled(
          wakers.map(waker => {
            log(`&& running a task scheduled for ${ticks}. &&`);
            return E(waker).wake(ticks);
          }),
        );
      }
    },
    /**
     *
     * @param {number} nTimes
     * @param {string} [msg]
     */
    async tickN(nTimes, msg) {
      assert(nTimes >= 1, 'invariant nTimes >= 1');
      for (let i = 0; i < nTimes - 1; i += 1) {
        timer.tick(msg);
      }
      await eventLoopIteration();
      // suffices that only the last be awaited
      await timer.tick(msg);
    },
    getCurrentTimestamp() {
      return ticks;
    },
    setWakeup(baseTime, waker) {
      baseTime = TimeMath.toAbs(baseTime);
      assert(
        TimeMath.isRelZero(TimeMath.modAbsRel(baseTime, timeStep)),
        X`timer has a resolution of ${timeStep}; ${baseTime} is not divisible`,
      );
      if (baseTime <= ticks) {
        log(`&& task was past its deadline when scheduled: ${baseTime} &&`);
        E(waker).wake(ticks);
        return baseTime;
      }
      log(`@@ schedule task for:${baseTime}, currently: ${ticks} @@`);
      if (!schedule.has(baseTime)) {
        schedule.init(baseTime, []);
      }
      schedule.set(baseTime, [...schedule.get(baseTime), waker]);
      return baseTime;
    },
    removeWakeup(waker) {
      /** @type {Array<Timestamp>} */
      const baseTimes = [];
      for (const [baseTime, wakers] of schedule.entries()) {
        if (wakers.includes(waker)) {
          baseTimes.push(baseTime);
          const remainingWakers = wakers.filter(w => waker !== w);

          if (remainingWakers.length) {
            // Cull the wakers for this time.
            schedule.set(baseTime, remainingWakers);
          } else {
            // There are no more wakers for this time.
            schedule.delete(baseTime);
          }
        }
      }
      return harden(baseTimes);
    },
    makeRepeater(delay, interval) {
      return makeRepeater(delay, interval, timer);
    },
    makeNotifier(delay, interval) {
      delay = TimeMath.toRel(delay);
      interval = TimeMath.toRel(interval);
      assert(
        TimeMath.isRelZero(TimeMath.modRelRel(delay, timeStep)),
        X`timer has a resolution of ${timeStep}; ${delay} is not divisible`,
      );
      assert(
        TimeMath.isRelZero(TimeMath.modRelRel(interval, timeStep)),
        X`timer has a resolution of ${timeStep}; ${interval} is not divisible`,
      );
      const { notifier, updater } = makeNotifierKit();
      /** @type {TimerWaker} */
      const repeaterWaker = Far('repeatWaker', {
        async wake(timestamp) {
          timestamp = TimeMath.toAbs(timestamp);
          updater.updateState(timestamp);
          timer.setWakeup(TimeMath.addAbsRel(ticks, interval), repeaterWaker);
        },
      });
      timer.setWakeup(TimeMath.addAbsRel(ticks, delay), repeaterWaker);
      return notifier;
    },
    delay(delay) {
      delay = TimeMath.toRel(delay);
      assert(
        TimeMath.isRelZero(TimeMath.modRelRel(delay, timeStep)),
        X`timer has a resolution of ${timeStep}; ${delay} is not divisible`,
      );
      const promiseKit = makePromiseKit();
      const delayWaker = Far('delayWaker', {
        wake(timestamp) {
          promiseKit.resolve(timestamp);
        },
      });
      timer.setWakeup(TimeMath.addAbsRel(ticks, delay), delayWaker);
      return promiseKit.promise;
    },
  });
  return timer;
}
harden(buildManualTimer);
