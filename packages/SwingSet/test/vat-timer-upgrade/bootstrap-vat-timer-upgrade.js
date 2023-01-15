import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';

export function buildRootObject() {
  let ts;
  const events = [];
  function makeHandler(name) {
    return Far(`handler-${name}`, {
      wake(time) {
        events.push(`${name}-${time}`);
      },
    });
  }
  const cancelToken = Far('cancel', {});
  let clock;
  let brand;
  const notifiers = {};
  const iterators = {};
  let updateCount;
  let repeaterControl;

  return Far('root', {
    async bootstrap(vats, devices) {
      ts = await E(vats.timer).createTimerService(devices.timer);
      // to exercise vat-vattp upgrade, we need the vatAdminService to
      // be configured, even though we don't use it ourselves
      await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async installWakeup(baseTime) {
      return E(ts).setWakeup(baseTime, makeHandler('wake'), cancelToken);
    },

    async installRepeater(delay, interval) {
      repeaterControl = await E(ts).makeRepeater(delay, interval);
      return E(repeaterControl).schedule(makeHandler('repeat'));
    },

    async installRepeatAfter(delay, interval) {
      const handler = makeHandler('repeatAfter');
      return E(ts).repeatAfter(delay, interval, handler, cancelToken);
    },

    async installNotifier(name, delay, interval) {
      notifiers[name] = await E(ts).makeNotifier(delay, interval, cancelToken);
      iterators[name] = await E(notifiers[name])[Symbol.asyncIterator]();
    },

    async getClock() {
      clock = await E(ts).getClock();
    },

    async getBrand() {
      brand = await E(ts).getTimerBrand();
    },

    async checkClock() {
      const clock2 = await E(ts).getClock();
      return clock2 === clock;
    },

    async checkBrand() {
      const brand2 = await E(ts).getTimerBrand();
      return brand2 === brand;
    },

    async readClock() {
      return E(clock).getCurrentTimestamp();
    },

    async readNotifier(name) {
      return E(notifiers[name])
        .getUpdateSince(updateCount)
        .then(update => {
          updateCount = update.updateCount;
          return update;
        });
    },

    async readIterator(name) {
      return E(iterators[name]).next();
    },

    async getEvents() {
      // we need 'events' to remain mutable, but return values are
      // hardened, so clone the array first
      const ret = Array.from(events);
      events.length = 0;
      return ret;
    },

    async cancel() {
      await E(repeaterControl).disable();
      await E(ts).cancel(cancelToken);
    },
  });
}
