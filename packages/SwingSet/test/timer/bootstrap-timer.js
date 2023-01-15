import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';

export function buildRootObject() {
  let ts;
  const events = [];
  const handler = Far('handler', {
    wake(time) {
      events.push(time);
    },
  });
  const cancelToken = Far('cancel', {});
  let repeater;

  return Far('root', {
    async bootstrap(vats, devices) {
      ts = await E(vats.timer).createTimerService(devices.timer);
    },
    async installWakeup(baseTime) {
      return E(ts).setWakeup(baseTime, handler, cancelToken);
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
        await E(ts).setWakeup(baseTime, 'banana');
      } catch (e) {
        return e.message;
      }
      throw Error('banana too slippery');
    },

    async goodRepeater(delay, interval) {
      repeater = await E(ts).makeRepeater(delay, interval);
      await E(repeater).schedule(handler);
    },

    async stopRepeater() {
      await E(repeater).disable();
    },

    async repeaterBadSchedule(delay, interval) {
      repeater = await E(ts).makeRepeater(delay, interval);
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
