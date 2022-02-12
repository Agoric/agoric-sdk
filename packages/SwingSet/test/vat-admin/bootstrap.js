import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  let admin;
  let bundleDevice;

  return Far('root', {
    async bootstrap(vats, devices) {
      admin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      bundleDevice = devices.bundle;
    },

    async byBundle(bundle) {
      const { root } = await E(admin).createVat(bundle);
      const n = await E(root).getANumber();
      return n;
    },

    async byName(bundleName) {
      const { root } = await E(admin).createVatByName(bundleName);
      const n = await E(root).getANumber();
      return n;
    },

    async byNamedBundleCap(name) {
      const bcap = D(bundleDevice).getNamedBundleCap(name);
      const { root } = await E(admin).createVat(bcap);
      const n = await E(root).getANumber();
      return n;
    },

    async byID(id) {
      const bcap = D(bundleDevice).getBundleCap(id);
      const { root } = await E(admin).createVat(bcap);
      const n = await E(root).getANumber();
      return n;
    },

    async counters(bundleName) {
      const { root } = await E(admin).createVatByName(bundleName);
      const c = E(root).createRcvr(1);
      const log = [];
      log.push(await E(c).increment(3));
      log.push(await E(c).increment(5));
      log.push(await E(c).ticker());
      return log;
    },

    async brokenVat(bundleName) {
      return E(admin).createVatByName(bundleName); // should reject
    },

    async nonBundleCap() {
      return E(admin).createVat(Far('non-bundlecap', {})); // should reject
    },
  });
}
