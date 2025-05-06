import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      /** @type {{zoeService: ERef<ZoeService>}} */
      const { zoeService: zoe } = await E(vats.zoe).buildZoe(
        vatAdminSvc,
        undefined,
        'zcf',
      );
      const bcap = await E(vatAdminSvc).getNamedBundleCap(
        'minimalMakeKindContract',
      );
      const id = D(bcap).getBundleID();
      const installations = {
        minimalMakeKind: await E(zoe).installBundleID(id),
      };

      const aliceP = E(vats.alice).build(zoe, installations);
      await E(aliceP).minimalMakeKindTest();
    },
  });
}
