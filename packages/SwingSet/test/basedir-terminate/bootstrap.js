/* global harden */

import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  return harden({
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const dude = await E(vatMaker).createVatByName('dude');
      await E(dude.root).dude();
      E(dude.adminNode).terminate();
      try {
        return await E(dude.root).dude();
      } catch (e) {
        return `${e}`;
      }
    },
  });
}
