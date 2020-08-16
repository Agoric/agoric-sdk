/* global harden */

import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  return harden({
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const vat = await E(vatMaker).createVatByName('dude');
      const before = await E(vat.root).dude();
      console.log(`success result ${before}`);
      E(vat.adminNode).terminate();
      try {
        return await E(vat.root).dude();
      } catch (e) {
        return `${e}`;
      }
    },
  });
}
