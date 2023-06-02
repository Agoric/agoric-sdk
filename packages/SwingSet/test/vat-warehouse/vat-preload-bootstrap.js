import { Far, E } from '@endo/far';

export function buildRootObject() {
  const extras = new Map(); // count -> root
  let vatAdminSvc;
  let bcap;

  async function start(name) {
    const opts = { name, vatParameters: { name } };
    const { root } = await E(vatAdminSvc).createVat(bcap, opts);
    return root;
  }

  return Far('root', {
    async bootstrap(vats, devices) {
      vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      bcap = await E(vatAdminSvc).getNamedBundleCap('extra');
    },

    async launchCanary() {
      const canary = await start('canary');
      extras.set('canary', canary);
    },

    async launchExtra() {
      for (let count = 0; count < 10; count += 1) {
        const name = `extra-${count}`;
        const root = await start(name);
        extras.set(name, root);
      }
    },

    ping(which) {
      console.log(`ping ${which}`);
      return E(extras.get(which)).ping();
    },
  });
}
