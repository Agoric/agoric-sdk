import harden from '@agoric/harden';
import makePromise from '../util/makePromise';

// A fake clock that also logs progress in tests.
export default function buildManualTimer(log, startValue = 0) {
  let ticks = startValue;
  const schedule = new Map();
  return harden({
    delayUntil(deadline, resolution = undefined) {
      if (deadline <= ticks) {
        log(`&& task was past its deadline when scheduled: ${deadline} &&`);
        resolution.res(ticks);
      }
      log(`@@ schedule task for:${deadline}, currently: ${ticks} @@`);
      const result = makePromise();
      if (!schedule.has(deadline)) {
        schedule.set(deadline, []);
      }
      schedule.get(deadline).push(result.res);
      return result.p;
    },
    // This function will only be called in testing code to advance the clock.
    tick(msg) {
      ticks += 1;
      log(`@@ tick:${ticks}${msg ? `: ${msg}` : ''} @@`);
      if (schedule.has(ticks)) {
        for (const p of schedule.get(ticks)) {
          log(`&& running a task scheduled for ${ticks}. &&`);
          p(ticks);
        }
      }
    },
    ticks() {
      return ticks;
    },
  });
}
