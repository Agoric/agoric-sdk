import Nat from '@agoric/nat';
import { assert, details } from '@agoric/assert';
import { makeNotifierKit } from '@agoric/notifier';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  const repeaters = new Map();

  async function createTimerService(timerNode) {
    /* @type {TimerService} */
    return harden({
      getCurrentTimestamp() {
        return Nat(D(timerNode).getLastPolled());
      },
      setWakeup(delaySecs, handler) {
        return D(timerNode).setWakeup(delaySecs, handler);
      },
      // can be used after setWakeup(h) or schedule(h)
      removeWakeup(handler) {
        return D(timerNode).removeWakeup(handler);
      },
      createRepeater(delaySecs, interval) {
        assert(
          Nat(delaySecs) >= 0,
          details`createRepeater's first parameter must be a non-negative integer: ${delaySecs}`,
        );
        assert(
          Nat(interval) > 0,
          details`createRepeater's second parameter must be a positive integer: ${interval}`,
        );

        const index = D(timerNode).createRepeater(delaySecs, interval);

        const vatRepeater = harden({
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
      createNotifier(delaySecs, interval) {
        assert(
          Nat(delaySecs) >= 0,
          details`createNotifier's first parameter must be a non-negative integer: ${delaySecs}`,
        );
        assert(
          Nat(interval) > 0,
          details`createNotifier's second parameter must be a positive integer: ${interval}`,
        );

        const index = D(timerNode).createRepeater(delaySecs, interval);
        const { notifier, updater } = makeNotifierKit();
        const updateHandler = harden({
          wake: updater.updateState,
        });
        D(timerNode).schedule(index, updateHandler);

        return notifier;
      },
    });
  }

  return harden({ createTimerService });
}
