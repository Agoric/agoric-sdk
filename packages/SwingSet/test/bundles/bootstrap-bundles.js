import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { importBundle } from '@endo/import-bundle';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  let vats;
  let devices;
  let vatAdmin;

  async function checkImport(getCap) {
    const bcap = getCap();
    assert(bcap === getCap()); // should be consistent
    const bundle = D(bcap).getBundle();
    assert.typeof(bundle, 'object');
    const endowments = harden({ big: 'big' });
    const ns = await importBundle(bundle, { endowments });
    const out = ns.runTheCheck('world');
    // out: [NAME, 'big', 'big', 'world']
    const ok =
      out.length === 4 &&
      out[1] === 'big' &&
      out[2] === 'big' &&
      out[3] === 'world';
    return [out[0], ok];
  }

  return Far('root', {
    async bootstrap(v0, d0) {
      vats = v0;
      devices = d0;
      // we exercise a little bit of vatAdmin, but this test is mostly about
      // bundles
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async checkConfiguredVats() {
      const hello = await E(vats.named).hi();
      return [hello];
    },

    async vatFromNamedBundleCap(name, method) {
      const bcap = D(devices.bundle).getNamedBundleCap(name);
      const { root } = await E(vatAdmin).createVat(bcap);
      const hello = await E(root)[method]();
      return [hello];
    },

    // TODO: this will go away when we remove va~.createVatByName
    async vatByName(name, method) {
      const { root } = await E(vatAdmin).createVatByName(name);
      const hello = await E(root)[method]();
      return [hello];
    },

    async vatFromID(id, method) {
      const bcap = D(devices.bundle).getBundleCap(id);
      const { root } = await E(vatAdmin).createVat(bcap);
      const hello = await E(root)[method]();
      return [hello];
    },

    getBundleCap(id) {
      // bad bundleIDs should throw
      return D(devices.bundle).getBundleCap(id);
    },

    getBundle(id) {
      const bcap = D(devices.bundle).getBundleCap(id);
      return D(bcap).getBundle();
    },

    async checkImportByID(id) {
      function getCap() {
        const bcap = D(devices.bundle).getBundleCap(id);
        assert.equal(D(bcap).getBundleID(), id);
        return bcap;
      }
      return checkImport(getCap);
    },

    async checkImportByName(name) {
      function getCap() {
        return D(devices.bundle).getNamedBundleCap(name);
      }
      return checkImport(getCap);
    },
  });
}
