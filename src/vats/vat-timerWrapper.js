import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../insist';

function build(E, D) {
  let timerNode; // Timer device
  const repeaters = new Map();

  function registerTimerDevice(TimerDeviceNode) {
    timerNode = TimerDeviceNode;
  }

  async function createTimerService() {
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
        insist(
          Nat(delaySecs) && Nat(interval),
          `createRepeater takes two numbers as arguments. ${delaySecs}, ${interval}`,
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
    });
  }

  return harden({ registerTimerDevice, createTimerService });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
