import Nat from '@agoric/nat';
import { assert, details } from '@agoric/assert';
import { makeNotifierKit } from '@agoric/notifier';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  const repeaters = new Map();

  async function createTimerService(timerNode) {
    /** @type {TimerService} */
    const timerService = {
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
      // deprecated in favor of makeRepeater().
      // TODO(#2164): remove before Beta
      createRepeater(delaySecs, interval) {
        return this.makeRepeater(delaySecs, interval);
      },
      makeRepeater(delaySecs, interval) {
        Nat(BigInt(delaySecs));
        assert(
          Nat(BigInt(interval)) > 0,
          details`makeRepeater's second parameter must be a positive integer: ${interval}`,
        );

        const index = D(timerNode).makeRepeater(delaySecs, interval);

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
      makeNotifier(delaySecs, interval) {
        Nat(BigInt(delaySecs));
        assert(
          Nat(BigInt(interval)) > 0,
          details`makeNotifier's second parameter must be a positive integer: ${interval}`,
        );

        const index = D(timerNode).makeRepeater(delaySecs, interval);
        const { notifier, updater } = makeNotifierKit();
        const updateHandler = harden({
          wake: updater.updateState,
        });
        D(timerNode).schedule(index, updateHandler);

        return notifier;
      },
    };
    return harden(timerService);
  }

  return harden({ createTimerService });
}
