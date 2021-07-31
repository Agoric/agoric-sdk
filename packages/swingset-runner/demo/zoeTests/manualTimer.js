import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { Nat } from '@agoric/nat';

// A fake clock that also logs progress in tests.
export default function buildManualTimer(log, startValue = 0n, timeStep = 1n) {
  let ticks = Nat(startValue);
  const schedule = new Map();
  return Far('timer', {
    setWakeup(deadline, handler) {
      assert.typeof(deadline, 'bigint');
      assert(
        deadline % timeStep === 0n,
        `timer has a resolution of ${timeStep}; ${deadline} is not divisible`,
      );
      if (deadline <= ticks) {
        log(`&& task was past its deadline when scheduled: ${deadline} &&`);
        handler.wake(ticks);
        return undefined;
      }
      log(`@@ schedule task for:${deadline}, currently: ${ticks} @@`);
      if (!schedule.has(deadline)) {
        schedule.set(deadline, []);
      }
      schedule.get(deadline).push(handler);
      return deadline;
    },
    // This function will only be called in testing code to advance the clock.
    tick(msg) {
      ticks += timeStep;
      log(`@@ tick:${ticks}${msg ? `: ${msg}` : ''} @@`);
      if (schedule.has(ticks)) {
        for (const h of schedule.get(ticks)) {
          log(`&& running a task scheduled for ${ticks}. &&`);
          E(h).wake(ticks);
        }
      }
    },
    getCurrentTimestamp() {
      return ticks;
    },
  });
}
