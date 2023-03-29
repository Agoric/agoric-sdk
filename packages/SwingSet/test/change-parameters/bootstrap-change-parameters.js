import { Far, E } from '@endo/far';

export function buildRootObject() {
  let vatAdmin;
  let carolRoot;
  let carolAdmin;

  return Far('root', {
    async bootstrap(vats, devices) {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async prepare() {
      // build Carol, the vat being changed
      const bcap = await E(vatAdmin).getNamedBundleCap('carol');
      const res = await E(vatAdmin).createVat(bcap);
      carolRoot = res.root;
      carolAdmin = res.adminNode;
      await E(carolRoot).doSomething();
    },

    async change(options) {
      try {
        await E(carolAdmin).changeOptions(options);
        return 'ok';
      } catch (e) {
        return e.message;
      }
    },
  });
}
