/* global harden */

import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  let counter = 46;
  const self = harden({
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const dude = await E(vatMaker).createVatByName('dude');
      const succBefore = await E(dude.root).dude(true);
      console.log(`success result ${succBefore}`);
      try {
        const failBefore = await E(dude.root).dude(false);
        console.log(`failure path should not yield ${failBefore}`);
      } catch (e) {
        console.log(`failure result ${e}`);
      }
      await E(dude.root).elsewhere(self); // this will notify
      E(dude.root).elsewhere(self); // this will not
      await E(dude.adminNode).terminate();
      try {
        const succAfter = await E(dude.root).dude(true);
        console.log(`result after terminate: ${succAfter} (shouldn't happen)`);
      } catch (e) {
        console.log(`send after terminate failed (as expected): ${e}`);
      }
    },
    query() {
      counter += 1;
      return counter;
    },
  });
  return self;
}
