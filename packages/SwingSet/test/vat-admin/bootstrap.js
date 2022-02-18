import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers => {
  const { D } = vatPowers;
  let admin;
  let bundleDevice;

  return Far('root', {
    bootstrap: async (vats, devices) => {
      admin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      bundleDevice = devices.bundle;
    },

    byBundle: async bundle => {
      const { root } = await E(admin).createVat(bundle);
      const n = await E(root).getANumber();
      return n;
    },

    byName: async bundleName => {
      const { root } = await E(admin).createVatByName(bundleName);
      const n = await E(root).getANumber();
      return n;
    },

    byNamedBundlecap: async name => {
      const bcap = D(bundleDevice).getNamedBundlecap(name);
      const { root } = await E(admin).createVat(bcap);
      const n = await E(root).getANumber();
      return n;
    },

    byID: async id => {
      const bcap = D(bundleDevice).getBundlecap(id);
      const { root } = await E(admin).createVat(bcap);
      const n = await E(root).getANumber();
      return n;
    },

    counters: async bundleName => {
      const { root } = await E(admin).createVatByName(bundleName);
      const c = E(root).createRcvr(1);
      const log = [];
      log.push(await E(c).increment(3));
      log.push(await E(c).increment(5));
      log.push(await E(c).ticker());
      return log;
    },

    brokenVat: async bundleName => E(admin).createVatByName(bundleName),

    nonBundlecap: async () => E(admin).createVat(Far('non-bundlecap', {})),
  });
};
