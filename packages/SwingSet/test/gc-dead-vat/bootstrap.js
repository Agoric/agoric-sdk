import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { makeScalarBigWeakSetStore } from '@agoric/vat-data';

async function sendExport(doomedRoot) {
  const exportToDoomed = Far('exportToDoomed', {});
  await E(doomedRoot).accept(exportToDoomed);
}

export function buildRootObject() {
  let vat;
  let doomedRoot;
  const pin = [];
  const pk1 = makePromiseKit();
  const wh = makeScalarBigWeakSetStore('weak-holder');
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      vat = await E(vatMaker).createVatByName('doomed');
      doomedRoot = vat.root;
      await sendExport(doomedRoot);
      const doomedExport1Presence = await E(doomedRoot).getDoomedExport1();
      pin.push(doomedExport1Presence);
      const doomedExport3Presence = await E(doomedRoot).getDoomedExport3();
      wh.add(doomedExport3Presence);
    },
    async stash() {
      // Give vat-doomed a target that doesn't resolve one() right away.
      // vat-doomed will send doomedExport2 to the result of target~.one(),
      // which means doomedExport2 will be held in the kernel's promise-queue
      // entry until we resolve pk1.promise
      const target = Far('target', {
        one() {
          return pk1.promise;
        },
      });
      await E(doomedRoot).stashDoomedExport2(target);
    },
    async startTerminate() {
      await E(vat.root).terminate();
      await E(vat.done);
    },
    callOrphan() {
      // the object is gone, so hello() ought to reject
      const p = E(pin[0]).hello();
      return p.then(
        _res => {
          throw Error('what??');
        },
        _err => 'good',
      );
    },
    async drop() {
      pin.splice(0);
      pk1.reject(0);
    },
  });
}
