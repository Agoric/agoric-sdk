// @ts-check

import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

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

        // Find where the first notification will fire.
        const baseTime = timerService.getCurrentTimestamp() + delay + interval;

        // We use an onObserved handler to ensure we don't have timers pending
        // that nobody's waiting for.
        const { notifier, updater, registerOnObserved } = makeNotifierKit();

        const notifierDelayHandler = Far('notifierDelayHandler', {
          wake: updater.updateState,
        });

        // The latest stamp we have produced a notifier update for.
        let latestNotifiedStamp = baseTime;
        registerOnObserved(_observedUpdateCount => {
          // Whenever we have an observer for a new state, we need to handle two
          // different cases:
          // 1. If there would have been a prior wakeup since the last
          //    notification, report it immediately.
          // 2. Otherwise, set a wakeup when the next one would be scheduled.

          const now = timerService.getCurrentTimestamp();

          // Calculate where we are relative to our base time.
          const currentOffset = now > baseTime ? now - baseTime : 0n;
          const intervalRemaining = interval - (currentOffset % interval);

          // Find the previous wakeup relative to our last one.
          const nextWakeup = baseTime + currentOffset + intervalRemaining;
          const priorWakeup = nextWakeup - interval;

          if (priorWakeup > latestNotifiedStamp) {
            // At least one interval has passed since the prior one we notified
            // for, so we can do an immediate update.
            latestNotifiedStamp = priorWakeup;
            updater.updateState(priorWakeup);
          } else {
            // The last notification we know about is in the future, so notify
            // later because the client is waiting on a promise.
            latestNotifiedStamp = nextWakeup;
            D(timerNode).setWakeup(nextWakeup, notifierDelayHandler);
          }
        });

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
