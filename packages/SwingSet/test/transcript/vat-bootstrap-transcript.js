import { E, Far } from '@endo/far';

export const buildRootObject = harden(() => {
  let vas;
  let counter = 0;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap: async (vats, devices) => {
        vas = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      },
      create: async () => {
        const { root } = await E(vas).createVatByName('bundle');
        return root;
      },
      nothing: () => {},
      count: () => {
        counter += 1;
        return counter;
      },
    },
  );
});
