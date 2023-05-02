import { Far, E } from '@endo/far';
import { TimeMath } from '@agoric/time';

export function buildRootObject() {
  let ts;
  let timerBrand;
  // exchange only bigints with driver program, add/remove brands locally
  const toTS = abs => TimeMath.coerceTimestampRecord(abs, timerBrand);
  const toRT = abs => TimeMath.coerceRelativeTimeRecord(abs, timerBrand);
  const fromTS = timestamp => TimeMath.absValue(timestamp);
  const events = [];
  const handler = Far('handler', {
    wake(time) {
      events.push(fromTS(time));
    },
  });
  const cancelToken = Far('cancel', {});
  let repeater;

  return Far('root', {
    async bootstrap(vats, devices) {
      ts = await E(vats.timer).createTimerService(devices.timer);
      timerBrand = await E(ts).getTimerBrand();
    },
    async installWakeup(baseTime) {
      const t = await E(ts).setWakeup(toTS(baseTime), handler, cancelToken);
      return fromTS(t);
    },
    async getEvents() {
      // we need 'events' to remain mutable, but return values are
      // hardened, so clone the array first
      const ret = Array.from(events);
      events.length = 0;
      return ret;
    },
    async cancel() {
      return E(ts).cancel(cancelToken);
    },

    async banana(baseTime) {
      try {
        console.log(`intentional 'bad setWakeup() handler' error follows`);
        await E(ts).setWakeup(toTS(baseTime), 'banana');
      } catch (e) {
        return e.message;
      }
      throw Error('banana too slippery');
    },

    async goodRepeater(delay, interval) {
      repeater = await E(ts).makeRepeater(toRT(delay), toRT(interval));
      await E(repeater).schedule(handler);
    },

    async stopRepeater() {
      await E(repeater).disable();
    },

    async repeaterBadSchedule(delay, interval) {
      repeater = await E(ts).makeRepeater(toRT(delay), toRT(interval));
      try {
        await E(repeater).schedule('norb'); // missing arguments #4282
        return 'should have failed';
      } catch (e) {
        return e.message;
      }
    },

    async badCancel() {
      await E(ts).cancel('bogus');
    },
  });
}
