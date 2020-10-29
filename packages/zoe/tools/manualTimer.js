// @ts-check

import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';

import './types';

/**
 * @typedef {Object} ManualTimerAdmin
 * @property {(msg: string | undefined) => Promise<void>} tick
 */

/**
 * @typedef {ManualTimerAdmin & TimerService} ManualTimer
 */

/**
 * A fake clock that also logs progress.
 *
 * @param {(...args: any[]) => void} log
 * @param {Timestamp} [startValue=0]
 * @returns {ManualTimer}
 */
export default function buildManualTimer(log, startValue = 0) {
  let ticks = startValue;

  /** @type {Store<Timestamp, Array<TimerServiceHandler>>} */
  const schedule = makeStore('Timestamp');

  /** @type {ManualTimer} */
  const timer = {
    // This function will only be called in testing code to advance the clock.
    async tick(msg) {
      ticks += 1;
      log(`@@ tick:${ticks}${msg ? `: ${msg}` : ''} @@`);
      if (schedule.has(ticks)) {
        const handlers = schedule.get(ticks);
        schedule.delete(ticks);
        await Promise.allSettled(
          handlers.map(h => {
            log(`&& running a task scheduled for ${ticks}. &&`);
            return E(h).wake(ticks);
          }),
        );
      }
    },
    getCurrentTimestamp() {
      return ticks;
    },
    setWakeup(baseTime, handler) {
      if (baseTime <= ticks) {
        log(`&& task was past its deadline when scheduled: ${baseTime} &&`);
        handler.wake(ticks);
        return undefined;
      }
      log(`@@ schedule task for:${baseTime}, currently: ${ticks} @@`);
      if (!schedule.has(baseTime)) {
        schedule.init(baseTime, []);
      }
      schedule.get(baseTime).push(handler);
      return baseTime;
    },
    removeWakeup(handler) {
      const baseTimes = [];
      for (const [baseTime, handlers] of schedule.entries()) {
        const index = handlers.indexOf(handler);
        if (index >= 0) {
          handlers.splice(index, 1);
          baseTimes.push(baseTime);
        }
      }
      return baseTimes;
    },
    createRepeater(baseTime, interval) {
      let handlers = [];
      const repeater = {
        schedule(h) {
          handlers.push(h);
        },
        disable() {
          handlers = undefined;
        },
      };
      harden(repeater);
      const repeaterHandler = {
        async wake(timestamp) {
          if (handlers === undefined) {
            return;
          }
          timer.setWakeup(ticks + interval, repeaterHandler);
          await Promise.allSettled(handlers.map(h => E(h).wake(timestamp)));
        },
      };
      timer.setWakeup(ticks + baseTime, repeaterHandler);
      return repeater;
    },
  };
  harden(timer);
  return timer;
}
