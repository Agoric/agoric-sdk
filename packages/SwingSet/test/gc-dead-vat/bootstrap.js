import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

const sendExport = async doomedRoot => {
  const exportToDoomed = Far('exportToDoomed', {});
  await E(doomedRoot).accept(exportToDoomed);
};

export const buildRootObject = () => {
  let vat;
  let doomedRoot;
  const pin = [];
  const pk1 = makePromiseKit();
  return Far('root', {
    bootstrap: async (vats, devices) => {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      vat = await E(vatMaker).createVatByName('doomed');
      doomedRoot = vat.root;
      await sendExport(doomedRoot);
      const doomedExport1Presence = await E(doomedRoot).getDoomedExport1();
      pin.push(doomedExport1Presence);
    },
    stash: async () => {
      // Give vat-doomed a target that doesn't resolve one() right away.
      // vat-doomed will send doomedExport2 to the result of target~.one(),
      // which means doomedExport2 will be held in the kernel's promise-queue
      // entry until we resolve pk1.promise
      const target = Far('target', {
        one: () => pk1.promise,
      });
      await E(doomedRoot).stashDoomedExport2(target);
    },
    startTerminate: async () => {
      await E(vat.root).terminate();
      await E(vat.done);
    },
    callOrphan: () => {
      // the object is gone, so hello() ought to reject
      const p = E(pin[0]).hello();
      return p.then(
        _res => {
          throw Error('what??');
        },
        _err => 'good',
      );
    },
    drop: async () => {
      pin.splice(0);
      pk1.reject(0);
    },
  });
};
