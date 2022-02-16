import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { importBundle } from '@endo/import-bundle';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  let vats;
  let vatAdmin;

  async function checkImport(getCap) {
    const bcap = await getCap();
    const bcap2 = await getCap();
    assert(bcap === bcap2, 'bundlecaps do not match'); // should be consistent
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
    async bootstrap(v0, devices) {
      vats = v0;
      // we exercise a little bit of vatAdmin, but this test is mostly about
      // bundles
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async checkConfiguredVats() {
      const hello = await E(vats.named).hi();
      return [hello];
    },

    async vatFromNamedBundlecap(name, method) {
      const bcap = await E(vatAdmin).getNamedBundlecap(name);
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
      const bcap = await E(vatAdmin).getBundlecap(id);
      const { root } = await E(vatAdmin).createVat(bcap);
      const hello = await E(root)[method]();
      return [hello];
    },

    waitForBundlecap(id) {
      // bad bundleIDs should throw, missing bundleIDs should wait (hang)
      return E(vatAdmin).waitForBundlecap(id);
    },

    getBundlecap(id) {
      // bad bundleIDs should throw, missing bundleIDs should throw
      return E(vatAdmin).getBundlecap(id);
    },

    async getBundle(id) {
      const bcap = await E(vatAdmin).getBundlecap(id);
      return D(bcap).getBundle();
    },

    async checkImportByID(id) {
      async function getCap() {
        const bcap = await E(vatAdmin).getBundlecap(id);
        assert.equal(D(bcap).getBundleID(), id);
        return bcap;
      }
      return checkImport(getCap);
    },

    async checkImportByName(name) {
      async function getCap() {
        const bcap = await E(vatAdmin).getNamedBundlecap(name);
        return bcap;
      }
      return checkImport(getCap);
    },
  });
}
