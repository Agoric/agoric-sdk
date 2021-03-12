import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  let service;
  let control;

  return Far('root', {
    async bootstrap(vats, devices) {
      service = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async createVat(bundle, dynamicOptions) {
      control = await E(service).createVat(bundle, dynamicOptions);
      E(control.adminNode)
        .done()
        .then(
          () => log('finished'),
          err => log(`terminated: ${err}`),
        );
      log(`created`);
    },

    getNever() {
      // grab a Promise which won't resolve until the vat dies
      const neverP = E(control.root).never();
      neverP.catch(() => 'hush');
      return [neverP];
    },

    async run() {
      try {
        await E(control.root).run();
        log('did run');
      } catch (err) {
        log(`run exploded: ${err}`);
      }
    },

    async explode(how) {
      try {
        await E(control.root).explode(how);
        log('failed to explode');
      } catch (err) {
        log(`did explode: ${err}`);
      }
    },

    async load(grandchildBundle) {
      await E(control.root).load(grandchildBundle);
      return 'ok';
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
