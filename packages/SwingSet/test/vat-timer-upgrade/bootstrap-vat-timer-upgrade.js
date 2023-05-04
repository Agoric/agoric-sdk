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
  function makeHandler(name) {
    return Far(`handler-${name}`, {
      wake(time) {
        events.push(`${name}-${fromTS(time)}`);
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
      timerBrand = await E(ts).getTimerBrand();
      // to exercise vat-vattp upgrade, we need the vatAdminService to
      // be configured, even though we don't use it ourselves
      await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async installWakeup(baseTime) {
      const handler = makeHandler('wake');
      const t = await E(ts).setWakeup(toTS(baseTime), handler, cancelToken);
      return fromTS(t);
    },

    async installRepeater(delay, interval) {
      repeaterControl = await E(ts).makeRepeater(toRT(delay), toRT(interval));
      return E(repeaterControl).schedule(makeHandler('repeat'));
    },

    async installRepeatAfter(delay, interval) {
      return E(ts).repeatAfter(
        toRT(delay),
        toRT(interval),
        makeHandler('repeatAfter'),
        cancelToken,
      );
    },

    async installNotifier(name, delay, interval) {
      notifiers[name] = await E(ts).makeNotifier(
        toRT(delay),
        toRT(interval),
        cancelToken,
      );
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
      const t = await E(clock).getCurrentTimestamp();
      return fromTS(t);
    },

    async readNotifier(name) {
      return E(notifiers[name])
        .getUpdateSince(updateCount)
        .then(update => {
          updateCount = update.updateCount;
          return { ...update, value: fromTS(update.value) };
        });
    },

    async readIterator(name) {
      const result = await E(iterators[name]).next();
      return { ...result, value: fromTS(result.value) };
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
