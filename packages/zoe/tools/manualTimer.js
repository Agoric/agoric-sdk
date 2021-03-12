// @ts-check

import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { Far } from '@agoric/marshal';

import './types';
import './internal-types';
import { makeNotifierKit } from '@agoric/notifier';

/**
 * A fake clock that also logs progress.
 *
 * @param {(...args: any[]) => void} log
 * @param {Timestamp} [startValue=0]
 * @returns {ManualTimer}
 */
export default function buildManualTimer(log, startValue = 0n) {
  let ticks = Nat(startValue);

  /** @type {Store<Timestamp, Array<ERef<TimerWaker>>>} */
  const schedule = makeStore('Timestamp');

  const makeRepeater = (delaySecs, interval, timer) => {
    assert.typeof(delaySecs, 'bigint');
    assert.typeof(interval, 'bigint');
    /** @type {Array<ERef<TimerWaker>> | null} */
    let wakers = [];
    let nextWakeup;

    /** @type {TimerWaker} */
    const repeaterWaker = {
      async wake(timestamp) {
        assert.typeof(timestamp, 'bigint');
        if (!wakers) {
          return;
        }
        nextWakeup = ticks + interval;
        timer.setWakeup(nextWakeup, repeaterWaker);
        await Promise.allSettled(wakers.map(waker => E(waker).wake(timestamp)));
      },
    };

    /** @type {TimerRepeater} */
    const repeater = Far('TimerRepeater', {
      schedule(waker) {
        assert(wakers, X`Cannot schedule on a disabled repeater`);
        wakers.push(waker);
        return nextWakeup;
      },
      disable() {
        wakers = null;
        timer.removeWakeup(repeaterWaker);
      },
    });
    nextWakeup = ticks + delaySecs;
    timer.setWakeup(nextWakeup, repeaterWaker);
    return repeater;
  };

  /** @type {ManualTimer} */
  const timer = Far('ManualTimer', {
    // This function will only be called in testing code to advance the clock.
    async tick(msg) {
      ticks += 1n;
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
      assert.typeof(baseTime, 'bigint');
      if (baseTime <= ticks) {
        log(`&& task was past its deadline when scheduled: ${baseTime} &&`);
        E(waker).wake(ticks);
        return baseTime;
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
      return makeRepeater(delay, interval, timer);
    },
    makeRepeater(delaySecs, interval) {
      return makeRepeater(delaySecs, interval, timer);
    },
    makeNotifier(delaySecs, interval) {
      assert.typeof(delaySecs, 'bigint');
      assert.typeof(interval, 'bigint');
      const { notifier, updater } = makeNotifierKit();
      /** @type {TimerWaker} */
      const repeaterWaker = {
        async wake(timestamp) {
          assert.typeof(timestamp, 'bigint');
          updater.updateState(timestamp);
          timer.setWakeup(ticks + interval, repeaterWaker);
        },
      };
      timer.setWakeup(ticks + delaySecs, repeaterWaker);
      return notifier;
    },
  });
  return timer;
}
