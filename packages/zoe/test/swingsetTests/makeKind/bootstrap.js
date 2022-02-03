import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers, vatParameters) {
  const { contractBundles: cb } = vatParameters;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const zoe = await E(vats.zoe).buildZoe(vatAdminSvc);
      const installations = {
        minimalMakeKind: await E(zoe).install(cb.minimalMakeKindContract),
      };

      const aliceP = E(vats.alice).build(zoe, installations);
      await E(aliceP).minimalMakeKindTest();
    },
  });
}
