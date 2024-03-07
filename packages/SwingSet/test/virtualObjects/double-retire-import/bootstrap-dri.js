import { Far, E } from '@endo/far';

export function buildRootObject() {
  let vatAdmin;
  let root;
  const sensor0 = makeExo(`sensor-0`, M.interface(`sensor-0`, {}, { defaultGuards: 'passable' }), {});
  const sensor1 = makeExo(`sensor-1`, M.interface(`sensor-1`, {}, { defaultGuards: 'passable' }), {});

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async bootstrap(vats, devices) {
        vatAdmin = await E(vats.vatAdmin).createVatAdminService(
          devices.vatAdmin,
        );
      },

      async build() {
        // build the target vat
        const bcap = await E(vatAdmin).getNamedBundleCap('dri');
        const res = await E(vatAdmin).createVat(bcap);
        root = res.root;
        await E(root).buildVir(sensor0, sensor1);
        await E(root).ping();
        return 'ok';
      },
    },
  );
}
