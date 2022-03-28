import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject() {
  let vatAdmin;
  let ulrikRoot;
  let ulrikAdmin;
  const marker = Far('marker', {});
  const { promise, resolve } = makePromiseKit();

  return Far('root', {
    async bootstrap(vats, devices) {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    getMarker() {
      return marker;
    },

    async buildV1() {
      // build Ulrik, the upgrading vat
      const bcap = await E(vatAdmin).getNamedBundleCap('ulrik1');
      const vatParameters = { youAre: 'v1', marker };
      const options = { vatParameters };
      const res = await E(vatAdmin).createVat(bcap, options);
      ulrikRoot = res.root;
      ulrikAdmin = res.adminNode;
      const version = await E(ulrikRoot).getVersion();
      const parameters = await E(ulrikRoot).getParameters();
      // give v1 a promise that won't be resolved until v2
      await E(ulrikRoot).acceptPromise(promise);
      const { p1 } = await E(ulrikRoot).getEternalPromise();
      p1.catch(() => 'hush');
      const p2 = E(ulrikRoot).returnEternalPromise(); // never resolves
      p2.catch(() => 'hush');
      return { version, p1, p2, ...parameters };
    },

    async upgradeV2() {
      const bcap = await E(vatAdmin).getNamedBundleCap('ulrik2');
      const vatParameters = { youAre: 'v2', marker };
      await E(ulrikAdmin).upgrade(bcap, vatParameters);
      const version = await E(ulrikRoot).getVersion();
      const parameters = await E(ulrikRoot).getParameters();
      resolve(`message for your predecessor, don't freak out`);
      return { version, ...parameters };
    },
  });
}
