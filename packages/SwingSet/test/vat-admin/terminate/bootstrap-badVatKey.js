import { Far, E } from '@endo/far';

export function buildRootObject() {
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      await E(vatMaker).createVatByName('dude', {
        critical: true, // this is bogus and should fail
      });
    },
  });
}
