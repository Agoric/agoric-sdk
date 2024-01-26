import { Far, E } from '@endo/far';

export function buildRootObject() {
  let vatAdmin;
  let bcap;
  const roots = [];

  return Far('root', {
    async bootstrap(vats, devices) {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      bcap = await E(vatAdmin).getNamedBundleCap('dumbo');
      console.log('end of bootstrap, vatAdmin', vatAdmin);
    },

    async createDynamicVats() {
      for (let i = 0; i < 3; i += 1) {
        const res = await E(vatAdmin).createVat(bcap);
        roots.push(res.root);
      }
      return roots;
    },
  });
}
