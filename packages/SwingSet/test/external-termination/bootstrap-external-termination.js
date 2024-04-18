import { Far, E } from '@endo/far';

export function buildRootObject() {
  let vatAdmin;
  let bcap;
  let root;
  let adminNode;
  let exitval;

  return Far('root', {
    bootstrap: async (vats, devices) => {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      bcap = await E(vatAdmin).getNamedBundleCap('doomed');
      const res = await E(vatAdmin).createVat(bcap);
      root = res.root;
      adminNode = res.adminNode;
      E(adminNode)
        .done()
        .then(
          happy => (exitval = ['fulfill', happy]),
          sad => (exitval = ['reject', sad]),
        );
    },
    ping: async count => E(root).ping(count),
    getExitVal: () => exitval,
  });
}
