import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  let vatAdmin;
  let ulrikRoot;
  let ulrikAdmin;

  return Far('root', {
    async bootstrap(vats, devices) {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    async buildV1() {
      // build Ulrik, the upgrading vat
      const bcap = await E(vatAdmin).getNamedBundleCap('ulrik1');
      const vatParameters = { youAre: 'v1' };
      const options = { vatParameters };
      const res = await E(vatAdmin).createVat(bcap, options);
      ulrikRoot = res.root;
      ulrikAdmin = res.adminNode;
      const version = await E(ulrikRoot).getVersion();
      const parameters = await E(ulrikRoot).getParameters();
      return [version, parameters];
    },

    async upgradeV2() {
      const bcap = await E(vatAdmin).getNamedBundleCap('ulrik2');
      const vatParameters = { youAre: 'v2' };
      await E(ulrikAdmin).upgrade(bcap, vatParameters);
      const version = await E(ulrikRoot).getVersion();
      const parameters = await E(ulrikRoot).getParameters();
      return [version, parameters];
    },
  });
}
