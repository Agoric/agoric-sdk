import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  let ts;
  const events = [];
  const handler = Far('handler', {
    wake(time) {
      events.push(time);
    },
  });

  return Far('root', {
    async bootstrap(vats, devices) {
      ts = await E(vats.timer).createTimerService(devices.timer);
    },
    async installWakeup(baseTime) {
      return E(ts).setWakeup(baseTime, handler);
    },
    async getEvents() {
      // we need 'events' to remain mutable, but return values are
      // hardened, so clone the array first
      const ret = Array.from(events);
      events.length = 0;
      return ret;
    },
    async removeWakeup() {
      return E(ts).removeWakeup(handler);
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
  });
}
