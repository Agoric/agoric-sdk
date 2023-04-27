import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog: log } = vatPowers;
  let service;
  let control;
  const notifierToUpdateCount = new WeakMap();

  return Far('root', {
    async bootstrap(vats, devices) {
      service = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    createMeter(remaining, notifyThreshold) {
      return E(service).createMeter(remaining, notifyThreshold);
    },

    createUnlimitedMeter() {
      return E(service).createUnlimitedMeter();
    },

    addMeterRemaining(meter, remaining) {
      return E(meter).addRemaining(remaining);
    },

    setMeterThreshold(meter, threshold) {
      return E(meter).setThreshold(threshold);
    },

    getMeter(meter) {
      return E(meter).get();
    },

    async whenMeterNotifiesNext(meter) {
      const notifier = await E(meter).getNotifier();
      const update = await E(notifier).getUpdateSince(
        notifierToUpdateCount.get(notifier),
      );
      notifierToUpdateCount.set(notifier, update.updateCount);
      return update;
    },

    async createVat(name, dynamicOptions) {
      const bundlecap = await E(service).getNamedBundleCap(name);
      control = await E(service).createVat(bundlecap, dynamicOptions);
      const done = E(control.adminNode).done();
      done.catch(() => 'hush');
      // the caller checks this later, but doesn't wait for it
      return ['created', done];
    },

    getNever() {
      // grab a Promise which won't resolve until the vat dies
      const neverP = E(control.root).never();
      neverP.catch(() => 'hush');
      return [neverP];
    },

    run() {
      return E(control.root).run();
    },

    explode(how) {
      return E(control.root).explode(how);
    },

    async bundleRun() {
      try {
        await E(control.root).meterThem('no');
        log('did run');
      } catch (err) {
        log(`run exploded: ${err}`);
      }
    },

    async bundleExplode(how) {
      try {
        await E(control.root).meterThem(how);
        log('failed to explode');
      } catch (err) {
        log(`did explode: ${err}`);
      }
    },
  });
}
