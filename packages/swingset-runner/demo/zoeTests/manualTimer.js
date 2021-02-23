import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

// A fake clock that also logs progress in tests.
export default function buildManualTimer(log, startValue = 0) {
  let ticks = startValue;
  const schedule = new Map();
  return harden({
    setWakeup(deadline, handler) {
      assert.typeof(deadline, 'bigint');
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
      ticks += 1;
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
