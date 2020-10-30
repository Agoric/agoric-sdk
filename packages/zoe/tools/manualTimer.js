// @ts-check

import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';

import './types';
import './internal-types';

/**
 * A fake clock that also logs progress.
 *
 * @param {(...args: any[]) => void} log
 * @param {Timestamp} [startValue=0]
 * @returns {ManualTimer}
 */
export default function buildManualTimer(log, startValue = 0) {
  let ticks = startValue;

  /** @type {Store<Timestamp, Array<Waker>>} */
  const schedule = makeStore('Timestamp');

  /** @type {ManualTimer} */
  const timer = {
    // This function will only be called in testing code to advance the clock.
    async tick(msg) {
      ticks += 1;
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
    getCurrentTimestamp() {
      return ticks;
    },
    setWakeup(baseTime, waker) {
      if (baseTime <= ticks) {
        log(`&& task was past its deadline when scheduled: ${baseTime} &&`);
        E(waker).wake(ticks);
        return undefined;
      }
      log(`@@ schedule task for:${baseTime}, currently: ${ticks} @@`);
      if (!schedule.has(baseTime)) {
        schedule.init(baseTime, []);
      }
      schedule.get(baseTime).push(waker);
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
    createRepeater(delay, interval) {
      /** @type {Array<Waker> | null} */
      let wakers = [];

      /** @type {Waker} */
      const repeaterWaker = {
        async wake(timestamp) {
          if (!wakers) {
            return;
          }
          timer.setWakeup(ticks + interval, repeaterWaker);
          await Promise.allSettled(
            wakers.map(waker => E(waker).wake(timestamp)),
          );
        },
      };

      /** @type {TimerRepeater} */
      const repeater = {
        schedule(waker) {
          wakers.push(waker);
        },
        disable() {
          wakers = null;
          timer.removeWakeup(repeaterWaker);
        },
      };
      harden(repeater);
      timer.setWakeup(ticks + delay, repeaterWaker);
      return repeater;
    },
  };
  harden(timer);
  return timer;
}
