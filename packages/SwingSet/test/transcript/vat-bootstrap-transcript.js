import { E, Far } from '@endo/far';

export const buildRootObject = harden(() => {
  let vas;
  return Far('root', {
    bootstrap: async (vats, devices) => {
      vas = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },
    create: async () => {
      const { root } = await E(vas).createVatByName('bundle');
      return root;
    },
    nothing: () => {},
  });
});
