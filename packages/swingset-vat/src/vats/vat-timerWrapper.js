// @ts-check

import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeTimedIterable } from './timed-iteration.js';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  const repeaters = new Map();

  async function createTimerService(timerNode) {
    /** @type {TimerService} */
    const timerService = Far('timerService', {
      getCurrentTimestamp() {
        return Nat(D(timerNode).getLastPolled());
      },
      setWakeup(baseTime, handler) {
        baseTime = Nat(baseTime);
        return D(timerNode).setWakeup(baseTime, handler);
      },
      // can be used after setWakeup(h) or schedule(h)
      removeWakeup(handler) {
        return D(timerNode).removeWakeup(handler);
      },
      makeRepeater(delay, interval) {
        delay = Nat(delay);
        interval = Nat(interval);
        assert(
          interval > 0,
          X`makeRepeater's second parameter must be a positive integer: ${interval}`,
        );

        const index = D(timerNode).makeRepeater(delay, interval);

        const vatRepeater = Far('vatRepeater', {
          schedule(h) {
            return D(timerNode).schedule(index, h);
          },
          disable() {
            repeaters.delete(index);
            return D(timerNode).deleteRepeater(index);
          },
        });
        repeaters.set(index, vatRepeater);
        return vatRepeater;
      },
      makeNotifier(delay, interval) {
        delay = Nat(delay);
        interval = Nat(interval);
        assert(
          interval > 0,
          X`makeNotifier's second parameter must be a positive integer: ${interval}`,
        );

        // Find when the first notification will fire.
        const baseTime = timerService.getCurrentTimestamp() + delay + interval;

        const iterable = makeTimedIterable(
          timerService.delay,
          timerService.getCurrentTimestamp,
          baseTime,
          interval,
        );

        const notifier = makeNotifierFromAsyncIterable(iterable);

        return notifier;
      },
      delay(delay) {
        delay = Nat(delay);
        const now = timerService.getCurrentTimestamp();
        const baseTime = now + delay;
        const promiseKit = makePromiseKit();
        const delayHandler = Far('delayHandler', {
          wake: promiseKit.resolve,
        });
        timerService.setWakeup(baseTime, delayHandler);
        return promiseKit.promise;
      },
    });
    return timerService;
  }

  return Far('root', { createTimerService });
}
