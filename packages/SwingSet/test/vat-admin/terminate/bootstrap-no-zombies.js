import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  const self = harden({
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);

      // create a dynamic vat, send it a message and let it respond, to make
      // sure everything is working
      const weatherwax = await E(vatMaker).createVatByName('weatherwax');
      await E(weatherwax.root).live();
      E(weatherwax.adminNode).terminate();
      await E(weatherwax.adminNode).done();
      return 'bootstrap done';
    },
  });
  return self;
}
