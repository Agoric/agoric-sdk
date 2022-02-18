import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { importBundle } from '@endo/import-bundle';

export const buildRootObject = vatPowers => {
  const { D } = vatPowers;
  let vats;
  let devices;
  let vatAdmin;

  const checkImport = async getCap => {
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
  };

  return Far('root', {
    bootstrap: async (v0, d0) => {
      vats = v0;
      devices = d0;
      // we exercise a little bit of vatAdmin, but this test is mostly about
      // bundles
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    checkConfiguredVats: async () => {
      const hello = await E(vats.named).hi();
      return [hello];
    },

    vatFromNamedBundlecap: async (name, method) => {
      const bcap = D(devices.bundle).getNamedBundlecap(name);
      const { root } = await E(vatAdmin).createVat(bcap);
      const hello = await E(root)[method]();
      return [hello];
    },

    // TODO: this will go away when we remove va~.createVatByName
    vatByName: async (name, method) => {
      const { root } = await E(vatAdmin).createVatByName(name);
      const hello = await E(root)[method]();
      return [hello];
    },

    vatFromID: async (id, method) => {
      const bcap = D(devices.bundle).getBundlecap(id);
      const { root } = await E(vatAdmin).createVat(bcap);
      const hello = await E(root)[method]();
      return [hello];
    },

    getBundlecap: id => D(devices.bundle).getBundlecap(id),

    getBundle: id => {
      const bcap = D(devices.bundle).getBundlecap(id);
      return D(bcap).getBundle();
    },

    checkImportByID: async id => {
      const getCap = () => {
        const bcap = D(devices.bundle).getBundlecap(id);
        assert.equal(D(bcap).getBundleID(), id);
        return bcap;
      };
      return checkImport(getCap);
    },

    checkImportByName: async name => {
      const getCap = () => D(devices.bundle).getNamedBundlecap(name);
      return checkImport(getCap);
    },
  });
};
