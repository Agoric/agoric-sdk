/* global harden */

import { E } from '@agoric/eventual-send';

function build(buildStuff) {
  const { log } = buildStuff;
  let service;
  let control;

  return harden({
    async bootstrap(argv, vats, devices) {
      service = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async createVat(bundle) {
      control = await E(service).createVat(bundle);
      E(control.adminNode)
        .done()
        .then(
          () => log('finished'),
          err => log(`terminated: ${err}`),
        );
      log(`created`);
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
  });
}

export default function setup(syscall, state, helpers, vatPowers0) {
  const { log, makeLiveSlots } = helpers;
  return makeLiveSlots(
    syscall,
    state,
    (_E, _D, _vatPowers) => build({ log }),
    helpers.vatID,
    vatPowers0,
  );
}
