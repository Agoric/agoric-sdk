import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers => {
  const { D, testLog: log } = vatPowers;
  let bundleDev;
  let service;
  let control;

  return Far('root', {
    bootstrap: async (vats, devices) => {
      service = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      bundleDev = devices.bundle;
    },

    createMeter: (remaining, notifyThreshold) =>
      E(service).createMeter(remaining, notifyThreshold),

    createUnlimitedMeter: () => E(service).createUnlimitedMeter(),

    addMeterRemaining: (meter, remaining) => E(meter).addRemaining(remaining),

    setMeterThreshold: (meter, threshold) => E(meter).setThreshold(threshold),

    getMeter: meter => E(meter).get(),

    whenMeterNotifiesNext: async meter => {
      const notifier = await E(meter).getNotifier();
      const initial = await E(notifier).getUpdateSince();
      return E(notifier).getUpdateSince(initial);
    },

    createVat: async (name, dynamicOptions) => {
      const bundleID = D(bundleDev).getNamedBundlecap(name);
      control = await E(service).createVat(bundleID, dynamicOptions);
      const done = E(control.adminNode).done();
      // the caller checks this later, but doesn't wait for it
      return ['created', done];
    },

    getNever: () => {
      // grab a Promise which won't resolve until the vat dies
      const neverP = E(control.root).never();
      neverP.catch(() => 'hush');
      return [neverP];
    },

    run: () => E(control.root).run(),

    explode: how => E(control.root).explode(how),

    bundleRun: async () => {
      try {
        await E(control.root).meterThem('no');
        log('did run');
      } catch (err) {
        log(`run exploded: ${err}`);
      }
    },

    bundleExplode: async how => {
      try {
        await E(control.root).meterThem(how);
        log('failed to explode');
      } catch (err) {
        log(`did explode: ${err}`);
      }
    },
  });
};
