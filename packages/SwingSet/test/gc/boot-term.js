import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  let targetVat;
  const theImport = harden({});
  return harden({
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      targetVat = await E(vatMaker).createVatByName('target');
      // console.log(`target~.one(theImport)`);
      // ignore() drops theImport immediately, making it available for GC
    },

    async ignore() {
      await E(targetVat.root).ignore(theImport);
      // console.log(`sent ignore() done`);
    },

    async terminate() {
      await E(targetVat.adminNode).terminateWithFailure('bang');
      // console.log(`sent terminateWithFailure() done`);
    },
  });
}
