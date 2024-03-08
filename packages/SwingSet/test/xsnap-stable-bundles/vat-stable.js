import { E, Far } from '@endo/far';

export const buildRootObject = harden(() => {
  let vas;
  let control;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap: async (vats, devices) => {
        vas = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      },
      ping: () => 0,
      create: async () => {
        const bcap = await E(vas).getNamedBundleCap('bootstrap');
        const options = { managerType: 'xs-worker' };
        control = await E(vas).createVat(bcap, options);
      },
      upgrade: async () => {
        const bcap = await E(vas).getNamedBundleCap('bootstrap');
        await E(control.adminNode).upgrade(bcap);
      },
    },
  );
});
