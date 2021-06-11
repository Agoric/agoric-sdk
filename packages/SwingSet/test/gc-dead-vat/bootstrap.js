import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

async function sendExport(root) {
  const exportToDoomed = Far('exportToDoomed', {});
  const fromDoomed = await E(root).accept(exportToDoomed);
  return fromDoomed;
}

export function buildRootObject() {
  let vat;
  const pin = [];
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      vat = await E(vatMaker).createVatByName('doomed');
      const fromDoomed = await sendExport(vat.root);
      pin.push(fromDoomed);
    },
    async startTerminate() {
      await E(vat.root).terminate();
      await E(vat.done);
    },
  });
}
